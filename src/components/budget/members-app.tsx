import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { FileDown, Mail, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AccountChip } from "@/components/budget/account-chip";
import { AdminNav } from "@/components/budget/auth-gate";
import { BrandLockup } from "@/components/budget/brand-lockup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rowsFromFile } from "@/lib/import-sheet";
import {
  EMPTY_REGISTER,
  invoiceBody,
  memberFee,
  mergeMembers,
  rowsToMembers,
  type AssociationMember,
  type MemberRegister,
} from "@/lib/members";
import { loadMembers, saveMembers } from "@/lib/members-fns";
import { downloadAllInvoicePdfs, downloadInvoicePdf, mailInvoicePdf } from "@/lib/invoice-mail";
import { currentFiscalYear, fiscalYearLabel, formatKr, parseAmountInput } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MembersApp() {
  const year = currentFiscalYear();
  const [register, setRegister] = useState<MemberRegister>(EMPTY_REGISTER);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AssociationMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [invoiceFor, setInvoiceFor] = useState<AssociationMember | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadMembers({ data: {} })
      .then((rows) => {
        setRegister(rows);
        setReady(true);
      })
      .catch(() => {
        toast.error("Kunde inte hämta registret.");
        setReady(true);
      });
  }, []);

  async function persist(next: MemberRegister) {
    setRegister(next);
    const saved = await saveMembers({ data: next });
    setRegister(saved);
    return saved;
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return register.members;
    return register.members.filter((member) =>
      [member.name, member.email, member.property, member.address].join(" ").toLowerCase().includes(needle),
    );
  }, [query, register.members]);

  const withEmail = register.members.filter((member) => member.email.includes("@"));
  const totalFee = register.members.reduce((sum, member) => sum + memberFee(member, register.defaultFee), 0);

  async function importFile(file: File) {
    setBusy(true);
    try {
      const rows = await rowsFromFile(file);
      const incoming = rowsToMembers(rows);
      if (incoming.length === 0) {
        toast.error("Hittade inga medlemmar i filen. Första raden ska vara rubriker, t.ex. Namn;E-post;Fastighet.");
        return;
      }
      const next = await persist({
        ...register,
        members: mergeMembers(register.members, incoming),
      });
      toast(`Läste in ${incoming.length} rader. Registret har ${next.members.length} medlemmar.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte läsa filen.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMember(member: AssociationMember) {
    const exists = register.members.some((row) => row.id === member.id);
    const members = exists
      ? register.members.map((row) => (row.id === member.id ? member : row))
      : [...register.members, member];
    await persist({ ...register, members });
    setEditing(null);
    setCreating(false);
    toast("Medlemmen är sparad.");
  }

  async function removeMember(id: string) {
    await persist({ ...register, members: register.members.filter((row) => row.id !== id) });
    toast("Medlemmen togs bort.");
  }

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4">
        <p className="text-sm text-muted">Hämtar medlemsregistret…</p>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl min-w-0 flex-col overflow-x-clip px-4 pt-6 pb-10 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <BrandLockup page="Medlemsregister" />
          <p className="mt-1 text-sm text-muted">
            {register.members.length} medlemmar · {formatKr(totalFee)} i årsavgift {fiscalYearLabel(year)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <AccountChip />
          <AdminNav />
          <Button variant="outline" asChild>
            <Link to="/">Budget</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/rapporter">Rapporter</Link>
          </Button>
        </div>
      </header>

      <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-xl font-medium">Läs in fil</h2>
        <p className="mt-1 text-sm text-muted">
          CSV eller Excel. Rubriker som Namn, E-post, Fastighet, Adress, Andel, Avgift känns igen automatiskt.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-pine px-4 text-sm font-medium text-pine-fg">
            <Upload className="size-4" />
            {busy ? "Läser…" : "Välj CSV eller Excel"}
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importFile(file);
              }}
            />
          </label>
          <Button type="button" variant="outline" onClick={() => setCreating(true)}>
            <Plus />
            Ny medlem
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={withEmail.length === 0}
            onClick={() => {
              void navigator.clipboard.writeText(withEmail.map((member) => member.email).join(", "));
              toast("E-postadresserna är kopierade.");
            }}
          >
            <Mail />
            Kopiera e-post
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={register.members.length === 0 || busy}
            onClick={() => {
              setBusy(true);
              void downloadAllInvoicePdfs(register.members, register, year)
                .then(() => toast("PDF-fakturorna laddades ner."))
                .catch(() => toast.error("Kunde inte skapa PDF."))
                .finally(() => setBusy(false));
            }}
          >
            <FileDown />
            Ladda ner alla PDF
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-xl font-medium">Fakturauppgifter</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field
            label="Årsavgift (kr)"
            value={register.defaultFee ? String(register.defaultFee) : ""}
            onChange={(value) => setRegister({ ...register, defaultFee: parseAmountInput(value) ?? 0 })}
            onBlur={() => void persist(register)}
          />
          <Field
            label="Förfallodag"
            value={register.dueDate}
            onChange={(value) => setRegister({ ...register, dueDate: value })}
            onBlur={() => void persist(register)}
            placeholder="t.ex. 15 oktober 2026"
          />
          <Field
            label="Betalning"
            value={register.payment}
            onChange={(value) => setRegister({ ...register, payment: value })}
            onBlur={() => void persist(register)}
            placeholder="Bankgiro / plusgiro"
          />
          <Field
            label="Meddelande i mejlet"
            value={register.message}
            onChange={(value) => setRegister({ ...register, message: value })}
            onBlur={() => void persist(register)}
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-medium">Medlemmar</h2>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Sök namn, e-post eller fastighet"
            className="sm:max-w-xs"
          />
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-muted">Inga medlemmar ännu. Läs in en fil eller lägg till för hand.</p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((member) => (
              <li key={member.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{member.name}</p>
                  <p className="truncate text-sm text-muted">
                    {member.property || "Ingen fastighet"}
                    {member.email ? ` · ${member.email}` : " · saknar e-post"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm tabular-nums text-ink">{formatKr(memberFee(member, register.defaultFee))}</span>
                  <Button
                    variant="outline"
                    disabled={!member.email.includes("@")}
                    onClick={() => setInvoiceFor(member)}
                  >
                    <Mail />
                    Faktura
                  </Button>
                  <Button variant="outline" size="icon-sm" onClick={() => setEditing(member)} aria-label="Redigera">
                    <Pencil />
                  </Button>
                  <Button variant="outline" size="icon-sm" onClick={() => void removeMember(member.id)} aria-label="Ta bort">
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MemberDialog
        open={creating || editing !== null}
        member={creating ? emptyMember() : editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSave={(member) => void saveMember(member)}
      />

      {invoiceFor ? (
        <InvoiceDialog
          member={invoiceFor}
          register={register}
          year={year}
          onClose={() => setInvoiceFor(null)}
        />
      ) : null}
    </div>
  );
}

function emptyMember(): AssociationMember {
  return {
    id: crypto.randomUUID(),
    name: "",
    email: "",
    property: "",
    address: "",
    share: 1,
    fee: 0,
    note: "",
  };
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} placeholder={placeholder} />
    </div>
  );
}

function MemberDialog({
  open,
  member,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  member: AssociationMember | null;
  onOpenChange: (open: boolean) => void;
  onSave: (member: AssociationMember) => void;
}) {
  const [draft, setDraft] = useState<AssociationMember>(emptyMember());

  useEffect(() => {
    if (open && member) setDraft(member);
  }, [open, member]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    onSave({
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim().toLowerCase(),
      property: draft.property.trim(),
      address: draft.address.trim(),
      note: draft.note.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member?.name ? "Redigera medlem" : "Ny medlem"}</DialogTitle>
          <DialogDescription>Uppgifterna används på fakturan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Namn" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <Field label="E-post" value={draft.email} onChange={(email) => setDraft({ ...draft, email })} />
          <Field label="Fastighet" value={draft.property} onChange={(property) => setDraft({ ...draft, property })} />
          <Field label="Adress" value={draft.address} onChange={(address) => setDraft({ ...draft, address })} />
          <Field
            label="Egen avgift (kr, tom = standard)"
            value={draft.fee ? String(draft.fee) : ""}
            onChange={(fee) => setDraft({ ...draft, fee: parseAmountInput(fee) ?? 0 })}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit">Spara</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDialog({
  member,
  register,
  year,
  onClose,
}: {
  member: AssociationMember;
  register: MemberRegister;
  year: number;
  onClose: () => void;
}) {
  const [working, setWorking] = useState(false);
  const body = invoiceBody(member, register, year);

  async function sendPdf() {
    setWorking(true);
    try {
      const mode = await mailInvoicePdf(member, register, year);
      toast(
        mode === "shared"
          ? "Välj e-post i delningsmenyn. PDF:en följer med."
          : "PDF:en laddades ner. Bifoga den i mejlet som öppnas.",
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("Kunde inte skapa PDF-fakturan.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Faktura {member.name}</DialogTitle>
          <DialogDescription>
            {formatKr(memberFee(member, register.defaultFee))} för {fiscalYearLabel(year)} · PDF
          </DialogDescription>
        </DialogHeader>
        <pre className={cn("max-h-64 overflow-auto rounded-lg bg-bg p-4 text-sm whitespace-pre-wrap text-ink")}>
          {body}
        </pre>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={working} onClick={onClose}>
            Stäng
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={working}
            onClick={() => {
              setWorking(true);
              void downloadInvoicePdf(member, register, year)
                .then(() => toast("PDF:en laddades ner."))
                .catch(() => toast.error("Kunde inte skapa PDF."))
                .finally(() => setWorking(false));
            }}
          >
            <FileDown />
            Ladda ner PDF
          </Button>
          <Button type="button" disabled={working || !member.email.includes("@")} onClick={() => void sendPdf()}>
            <Mail />
            {working ? "Skapar PDF…" : "Maila PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
