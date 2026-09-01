import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthGate, useAccess } from "@/components/budget/auth-gate";
import { AccountChip } from "@/components/budget/account-chip";
import { BrandLockup } from "@/components/budget/brand-lockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OWNER_EMAIL, type AccessMember } from "@/lib/access";
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
    <AuthGate>
      <main className="min-h-dvh overflow-x-clip bg-bg text-ink">
        <AccessAdmin />
        <Toaster
          position="top-center"
          offset={16}
          toastOptions={{
            className:
              "!bg-surface !text-ink !border-0 !shadow-[var(--shadow-raised)] !font-sans",
          }}
        />
      </main>
    </AuthGate>
  );
}

function AccessAdmin() {
  const access = useAccess();
  const [members, setMembers] = useState<AccessMember[] | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function reload() {
    const rows = await listAccessMembers();
    setMembers(rows);
  }

  useEffect(() => {
    if (!access?.isAdmin) return;
    void reload().catch(() => toast.error("Kunde inte hämta listan."));
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
      await decideAccessMember({ data: { email: memberEmail, status } });
      await reload();
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
      await inviteAccessMember({ data: { email, name } });
      setEmail("");
      setName("");
      await reload();
      toast("Personen är förhandsgodkänd.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte bjuda in.");
    } finally {
      setBusy(null);
    }
  }

  const pending = members?.filter((m) => m.status === "pending") ?? [];
  const others = members?.filter((m) => m.status !== "pending") ?? [];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl min-w-0 flex-col overflow-x-clip px-4 pt-6 pb-16 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <BrandLockup page="Godkännanden" />
          <p className="mt-1 text-sm text-muted">Bara {OWNER_EMAIL} kan släppa in nya personer.</p>
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
        <h2 className="font-display text-xl font-medium">Väntar</h2>
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

      <section className="mt-6 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-xl font-medium">Lista</h2>
        {others.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Inga godkända eller nekade ännu utöver ägaren.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {others.map((member) => (
              <li key={member.email} className="flex flex-col gap-2 rounded-xl bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{member.name || "Utan namn"}</p>
                  <p className="truncate text-sm text-muted">
                    {member.email} · {member.status === "approved" ? "godkänd" : "nekad"}
                  </p>
                </div>
                {member.email !== OWNER_EMAIL ? (
                  <Button
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => void decide(member.email, member.status === "approved" ? "denied" : "approved")}
                  >
                    {member.status === "approved" ? "Neka" : "Godkänn"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted">Ägare</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
