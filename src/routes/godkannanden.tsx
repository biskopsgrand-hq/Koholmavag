import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAccess } from "@/components/budget/auth-gate";
import { AccountChip } from "@/components/budget/account-chip";
import { BrandLockup } from "@/components/budget/brand-lockup";
import { PasswordDialog } from "@/components/budget/password-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OWNER_EMAIL, isOwnerEmail, parseAccessStatus, type AccessMember } from "@/lib/access";
import { decideAccessMember, inviteAccessMember, listAccessMembers } from "@/lib/access-fns";
import { APP_NAME } from "@/lib/brand";

export const Route = createFileRoute("/godkannanden")({
  component: AccessAdminPage,
  head: () => ({
    meta: [
      { title: `Godkännanden — ${APP_NAME}` },
      { name: "description", content: "Godkänn vilka som får logga in." },
    ],
  }),
});

function AccessAdminPage() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-bg text-ink">
      <AccessAdmin />
    </main>
  );
}

function AccessAdmin() {
  const access = useAccess();
  const [members, setMembers] = useState<AccessMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [passwordFor, setPasswordFor] = useState<AccessMember | null>(null);

  useEffect(() => {
    if (!access?.isAdmin) return;
    let cancelled = false;
    async function load() {
      try {
        const rows = await listAccessMembers();
        if (!cancelled) {
          setMembers(Array.isArray(rows) ? rows : []);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Kunde inte hämta listan.");
          toast.error("Kunde inte hämta listan.");
        }
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [access?.isAdmin]);

  if (access && !access.isAdmin) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <p className="text-sm text-muted">Bara {OWNER_EMAIL} kan godkänna personer.</p>
      </div>
    );
  }

  async function decide(memberEmail: string, status: "approved" | "denied") {
    setBusy(memberEmail + status);
    try {
      const rows = await decideAccessMember({ data: { email: memberEmail, status } });
      setMembers(Array.isArray(rows) ? rows : []);
      toast(status === "approved" ? "Personen är godkänd." : "Personen är nekad.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara.");
    } finally {
      setBusy(null);
    }
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    setBusy("invite");
    try {
      const rows = await inviteAccessMember({ data: { email, name } });
      setEmail("");
      setName("");
      setMembers(Array.isArray(rows) ? rows : []);
      toast("Personen är förhandsgodkänd.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte bjuda in.");
    } finally {
      setBusy(null);
    }
  }

  const pending = members?.filter((m) => parseAccessStatus(m.status) === "pending") ?? [];
  const approved = members?.filter((m) => parseAccessStatus(m.status) === "approved") ?? [];
  const denied = members?.filter((m) => parseAccessStatus(m.status) === "denied") ?? [];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl min-w-0 flex-col overflow-x-clip px-4 pt-6 pb-16 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <BrandLockup page="Godkännanden" />
          <p className="mt-1 text-sm text-muted">
            Bara {OWNER_EMAIL} kan släppa in nya personer.
            {members ? ` ${members.length} personer i registret.` : ""}
          </p>
          {loadError ? <p className="mt-2 text-sm text-clay">{loadError}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AccountChip />
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft />
              Budget
            </Link>
          </Button>
        </div>
      </header>

      <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-xl font-medium">Förhandsgodkänn</h2>
        <p className="mt-1 text-sm text-muted">Lägg till en e-post så personen kommer in direkt vid inloggning.</p>
        <form onSubmit={(event) => void invite(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="invite-email">E-post</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-name">Namn</Label>
            <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy !== null}>
              {busy === "invite" ? "Sparar…" : "Godkänn e-post"}
            </Button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-xl font-medium">
          Godkända{members ? ` (${approved.length})` : ""}
        </h2>
        {members === null ? (
          <p className="mt-3 text-sm text-muted">Hämtar…</p>
        ) : approved.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Ingen har tillgång ännu.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {approved.map((member) => (
              <li key={member.email} className="flex flex-col gap-2 rounded-xl bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{member.name || "Utan namn"}</p>
                  <p className="truncate text-sm text-muted">{member.email}</p>
                </div>
                {isOwnerEmail(member.email) ? (
                  <div className="flex flex-wrap gap-2">
                    <p className="self-center text-sm text-muted">Ägare</p>
                    <Button variant="outline" onClick={() => setPasswordFor(member)}>
                      Byt lösenord
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setPasswordFor(member)}>
                      Byt lösenord
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => void decide(member.email, "denied")}
                    >
                      Neka
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-xl font-medium">
          Väntar{members ? ` (${pending.length})` : ""}
        </h2>
        {members === null ? (
          <p className="mt-3 text-sm text-muted">Hämtar…</p>
        ) : pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Inga öppna förfrågningar.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {pending.map((member) => (
              <li key={member.email} className="flex flex-col gap-3 rounded-xl bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{member.name || "Utan namn"}</p>
                  <p className="truncate text-sm text-muted">{member.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={busy !== null}
                    onClick={() => void decide(member.email, "approved")}
                  >
                    Godkänn
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => void decide(member.email, "denied")}
                  >
                    Neka
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {denied.length > 0 ? (
        <section className="mt-6 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
          <h2 className="font-display text-xl font-medium">Nekade ({denied.length})</h2>
          <ul className="mt-4 grid gap-2">
            {denied.map((member) => (
              <li key={member.email} className="flex flex-col gap-2 rounded-xl bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{member.name || "Utan namn"}</p>
                  <p className="truncate text-sm text-muted">{member.email}</p>
                </div>
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => void decide(member.email, "approved")}
                >
                  Godkänn
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <PasswordDialog
        open={passwordFor !== null}
        onOpenChange={(open) => {
          if (!open) setPasswordFor(null);
        }}
        email={passwordFor?.email}
        name={passwordFor?.name}
      />
    </div>
  );
}
