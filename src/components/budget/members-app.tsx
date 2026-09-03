import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
  KOHOLMA_LIST_ID,
  formatPostal,
  parseZipCity,
  memberFee,
  mergeMembers,
  mergeMemberLists,
  repairMember,
  rowsToMembers,
  type AssociationMember,
  type MemberRegister,
} from "@/lib/members";
import { KOHOLMA_MEMBERS } from "@/lib/members-seed";
import { loadMembers, saveMembers } from "@/lib/members-fns";
import { readMemberCache, writeMemberCache } from "@/lib/members-cache";
import { loadMailStatus } from "@/lib/mail-fns";
import { postInvoiceMail, postMailPassword, rememberMailPass, rememberSendToken } from "@/lib/invoice-send";
import { downloadAllInvoicePdfs, downloadInvoiceZip, downloadSavedInvoice } from "@/lib/invoice-mail";
import {
  dueInDays,
  invoiceFromMember,
  invoiceTotals,
  makeOcr,
  nextCustomerNo,
  nextInvoiceNumber,
  splitAddress,
  VAT_RATES,
  type Invoice,
  type VatRate,
} from "@/lib/invoices";
import { SELLER } from "@/lib/seller";
import { loadInvoiceList, saveInvoiceList } from "@/lib/invoices-fns";
import { bookInvoice, unbookInvoice } from "@/lib/invoice-book";
import { currentFiscalYear, fiscalYearLabel, formatKr, parseAmountInput } from "@/lib/format";
import { useLiveSync } from "@/lib/live-sync";
import { withSessionRetry } from "@/lib/save-with-session";
import { cn } from "@/lib/utils";

export function MembersApp() {
  const year = currentFiscalYear();
  const [register, setRegister] = useState<MemberRegister>(EMPTY_REGISTER);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AssociationMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftInvoice, setDraftInvoice] = useState<Invoice | null>(null);
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkQueue, setBulkQueue] = useState<Invoice[] | null>(null);
  const [mailStep, setMailStep] = useState<Invoice | null>(null);
  const [mailReady, setMailReady] = useState(false);
  const [mailPass, setMailPass] = useState("");
  const registerRef = useRef(register);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  registerRef.current = register;

  useEffect(() => {
    void Promise.all([loadMembers({ data: {} }), loadInvoiceList({ data: {} }), loadMailStatus({ data: {} })])
      .then(async ([members, rows, mail]) => {
        let register = members;
        if (!register.members.length) {
          const cached = readMemberCache();
          if (cached?.members.length) register = cached;
        }
        setRegister(register);
        writeMemberCache(register);
        setInvoices(rows);
        setMailReady(mail.configured);
        rememberSendToken(mail.sendToken);
        setReady(true);
      })
      .catch(() => {
        const cached = readMemberCache();
        if (cached) setRegister(cached);
        toast.error("Kunde inte hämta registret.");
        setReady(true);
      });
  }, []);

  const pullShared = useCallback(async () => {
    if (!ready || savingRef.current || saveTimer.current || dirtyRef.current) return;
    try {
      const [members, rows] = await Promise.all([loadMembers({ data: {} }), loadInvoiceList({ data: {} })]);
      if (savingRef.current || saveTimer.current || dirtyRef.current) return;
      setRegister(members);
      writeMemberCache(members);
      setInvoices(rows);
    } catch {
      /* keep current until next pull */
    }
  }, [ready]);

  useLiveSync(pullShared, 4000);

  useEffect(() => {
    function flush() {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      void persist(registerRef.current);
    }
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  async function persist(next: MemberRegister) {
    const payload: MemberRegister = {
      ...EMPTY_REGISTER,
      ...next,
      listId: next.listId || KOHOLMA_LIST_ID,
      deletedIds: next.deletedIds ?? [],
      members: next.members,
    };
    registerRef.current = payload;
    setRegister(payload);
    writeMemberCache(payload);
    dirtyRef.current = true;
    savingRef.current = true;
    try {
      const saved = await withSessionRetry(() => saveMembers({ data: payload }));
      registerRef.current = saved;
      setRegister(saved);
      writeMemberCache(saved);
      dirtyRef.current = false;
      return saved;
    } catch (err) {
      writeMemberCache(payload);
      const authLost = /unauthor|forbidden|not authorized/i.test(err instanceof Error ? err.message : "");
      toast.error(authLost ? "Kunde inte spara — ladda om sidan och logga in igen." : err instanceof Error ? err.message : "Kunde inte spara uppgifterna.");
      throw err;
    } finally {
      savingRef.current = false;
    }
  }

  async function persistInvoices(next: Invoice[]) {
    savingRef.current = true;
    setInvoices(next);
    try {
      const saved = await withSessionRetry(() => saveInvoiceList({ data: next }));
      setInvoices(saved);
      return saved;
    } finally {
      savingRef.current = false;
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return register.members;
    return register.members.filter((member) =>
      [member.name, member.email, member.property, member.address, member.zip, member.city, member.postal, member.phone].join(" ").toLowerCase().includes(needle),
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
        members: incoming,
        deletedIds: ["__all__"],
        listId: file.name,
      });
      toast(
        `Läste in ${incoming.length} medlemmar, t.ex. ${incoming
          .slice(0, 2)
          .map((row) => `${row.name} (${row.property || "utan fastighet"})`)
          .join(", ")}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte läsa filen.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMember(member: AssociationMember) {
    const members = mergeMembers(register.members, [member]);
    await persist({ ...register, members });
    setEditing(null);
    setCreating(false);
    toast("Medlemmen är sparad.");
  }

  function patchRegister(patch: Partial<MemberRegister>) {
    const next: MemberRegister = {
      ...registerRef.current,
      ...patch,
      listId: registerRef.current.listId || KOHOLMA_LIST_ID,
    };
    registerRef.current = next;
    setRegister(next);
    writeMemberCache(next);
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void persist(registerRef.current).then(() => toast.success("Sparat", { id: "member-save" }));
    }, 400);
  }

  function patchMember(id: string, patch: Partial<AssociationMember>, save = false) {
    const current = registerRef.current;
    const next: MemberRegister = {
      ...current,
      listId: current.listId || KOHOLMA_LIST_ID,
      members: current.members.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    };
    registerRef.current = next;
    setRegister(next);
    writeMemberCache(next);
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void persist(registerRef.current).then(() => toast.success("Sparat", { id: "member-save" }));
    }, save ? 150 : 450);
  }

  async function removeMember(id: string) {
    await persist({
      ...register,
      members: register.members.filter((row) => row.id !== id),
      deletedIds: [...new Set([...(register.deletedIds ?? []), id])],
    });
    toast("Medlemmen togs bort.");
  }

  function startInvoice(member?: AssociationMember) {
    try {
      const number = nextInvoiceNumber(invoices);
      const customerNo = member?.customerNo || nextCustomerNo(invoices, register.members);
      const id = globalThis.crypto?.randomUUID?.() ?? `inv-${Date.now()}`;
      if (member) {
        setDraftInvoice({
          ...invoiceFromMember(member, register, year, number, customerNo),
          id,
        });
        return;
      }
      setDraftInvoice({
        id,
        number,
        ocr: number,
        customerNo,
        memberId: null,
        name: "",
        address: "",
        postal: "",
        email: "",
        phone: "",
        property: "",
        description: "Vägavgift Koholma",
        amount: register.defaultFee,
        qty: 1,
        vatRate: 0,
        dueDate: register.dueDate || dueInDays(new Date().toISOString()),
        issuedAt: new Date().toISOString(),
        paid: false,
        paidAt: null,
        year,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte öppna fakturan.");
    }
  }

  async function saveInvoice(invoice: Invoice, quiet = false) {
    if (!invoice.name.trim() || invoice.amount <= 0) {
      toast.error("Ange person och belopp.");
      return;
    }
    const exists = invoices.some((row) => row.id === invoice.id);
    const next = exists
      ? invoices.map((row) => (row.id === invoice.id ? invoice : row))
      : [invoice, ...invoices];
    await persistInvoices(next);
    if (!quiet) toast(`Faktura ${invoice.number} är sparad.`);
    return invoice;
  }

  async function sendInvoiceMail(invoice: Invoice) {
    if (busy) return;
    if (!invoice.email.includes("@")) {
      toast.error("Ange e-post på fakturan först.");
      setDraftInvoice(invoice);
      return;
    }
    if (!invoice.name.trim() || invoice.amount <= 0) {
      toast.error("Ange person och belopp.");
      setDraftInvoice(invoice);
      return;
    }
    setBusy(true);
    toast("Skickar faktura med PDF från koholmavagen@gmail.com…", { id: "invoice-mail" });
    try {
      await saveInvoice(invoice, true).catch(() => undefined);
      await postInvoiceMail(invoice);
      setDraftInvoice(null);
      setMailStep(null);
      toast.success(`Skickad till ${invoice.email} från koholmavagen@gmail.com med PDF.`, { id: "invoice-mail" });
      bookInvoice(invoice, invoice.paid);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunde inte skicka.";
      toast.error(message, { id: "invoice-mail" });
    } finally {
      setBusy(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((row) => row !== id) : [...current, id]));
  }

  const selectedMembers = register.members.filter((member) => selected.includes(member.id));
  const selectedWithEmail = selectedMembers.filter((member) => member.email.includes("@"));
  const allVisibleSelected = visible.length > 0 && visible.every((member) => selected.includes(member.id));

  async function startBulkMail() {
    if (selectedWithEmail.length === 0) {
      toast.error("Markera medlemmar som har e-post.");
      return;
    }
    let next = [...invoices];
    const queue: Invoice[] = [];
    for (const member of selectedWithEmail) {
      const existing = next.find((invoice) => invoice.memberId === member.id && invoice.year === year && !invoice.paid);
      if (existing) {
        queue.push(existing);
        continue;
      }
      const created = invoiceFromMember(
        member,
        register,
        year,
        nextInvoiceNumber(next),
        member.customerNo || nextCustomerNo(next, register.members),
      );
      next = [created, ...next];
      queue.push(created);
    }
    await persistInvoices(next);
    setBusy(true);
    let ok = 0;
    try {
      for (const invoice of queue) {
        await postInvoiceMail(invoice);
        ok += 1;
        toast.success(`Skickade ${ok} av ${queue.length} med PDF.`, { id: "bulk-mail" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Utskicket avbröts.", { id: "bulk-mail" });
    } finally {
      setBusy(false);
    }
  }

  async function togglePaid(invoice: Invoice) {
    const paid = !invoice.paid;
    const next = {
      ...invoice,
      paid,
      paidAt: paid ? new Date().toISOString() : null,
    };
    await persistInvoices(invoices.map((row) => (row.id === invoice.id ? next : row)));
    bookInvoice(next, paid);
    toast.success(paid ? `Bokförd som intäkt · ${invoice.number}` : `Markerad obetald · ${invoice.number}`);
  }

  async function removeInvoice(id: string) {
    await persistInvoices(invoices.filter((row) => row.id !== id));
    unbookInvoice(id);
    toast("Fakturan togs bort.");
  }

  const visibleInvoices = invoices.filter((invoice) => {
    if (invoiceFilter === "paid") return invoice.paid;
    if (invoiceFilter === "unpaid") return !invoice.paid;
    return true;
  });
  const unpaidTotal = invoices
    .filter((invoice) => !invoice.paid)
    .reduce((sum, invoice) => sum + invoiceTotals(invoice).total, 0);

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
            {register.members.length} medlemmar · {invoices.filter((row) => !row.paid).length} obetalda fakturor
            {unpaidTotal > 0 ? ` · ${formatKr(unpaidTotal)}` : ""}
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
          CSV eller Excel. Rubriker som Namn, Adress, Fastighet, E-post, Telefon. Filen ersätter listan.
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
          <Button type="button" variant="outline" onClick={() => startInvoice()}>
            <Plus />
            Ny faktura
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
              void downloadAllInvoicePdfs(register.members, register, year, invoices)
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
            onChange={(value) => patchRegister({ defaultFee: parseAmountInput(value) ?? 0 })}
            onBlur={() => void persist(registerRef.current).then(() => toast.success("Sparat", { id: "member-save" }))}
          />
          <Field
            label="Förfallodag"
            value={register.dueDate}
            onChange={(value) => patchRegister({ dueDate: value })}
            onBlur={() => void persist(registerRef.current).then(() => toast.success("Sparat", { id: "member-save" }))}
            placeholder="t.ex. 15 oktober 2026"
          />
          <Field
            label="Betalning"
            value={register.payment}
            onChange={(value) => patchRegister({ payment: value })}
            onBlur={() => void persist(registerRef.current).then(() => toast.success("Sparat", { id: "member-save" }))}
            placeholder="Bankgiro / plusgiro"
          />
          <Field
            label="Meddelande i mejlet"
            value={register.message}
            onChange={(value) => patchRegister({ message: value })}
            onBlur={() => void persist(registerRef.current).then(() => toast.success("Sparat", { id: "member-save" }))}
          />
          <div className="grid gap-2 sm:col-span-2">
            <Label>Gmail-app-lösenord för {SELLER.email}</Label>
            <p className="text-sm text-muted">
              {mailReady
                ? "Utskick med PDF är kopplat. Fyll i lösenordet igen om mejl inte går iväg."
                : "Klistra in app-lösenordet för koholmavagen@gmail.com (16 bokstäver från Google) och tryck Spara lösenord. Inte webb-lösenordet."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="password"
                autoComplete="new-password"
                value={mailPass}
                onChange={(event) => setMailPass(event.target.value)}
                placeholder={mailReady ? "••••••••" : "App-lösenord"}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!mailPass.trim()}
                onClick={() => {
                  const pass = mailPass.trim();
                  if (pass.replace(/\s+/g, "").length < 8) {
                    toast.error("Klistra in Gmail-app-lösenordet (16 tecken).");
                    return;
                  }
                  rememberMailPass(pass);
                  setMailReady(true);
                  void postMailPassword(pass)
                    .then((status) => {
                      rememberSendToken(status.sendToken);
                      setMailPass("");
                      toast.success("Lösenordet är sparat. Tryck Skicka med PDF.");
                    })
                    .catch(() => {
                      setMailPass("");
                      toast.success("Lösenordet är sparat på den här enheten. Tryck Skicka med PDF.");
                    });
                }}
              >
                Spara lösenord
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-medium">Fakturor</h2>
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "Alla"],
              ["unpaid", "Obetalda"],
              ["paid", "Betalda"],
            ] as const).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                variant={invoiceFilter === id ? "default" : "outline"}
                onClick={() => setInvoiceFilter(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        {visibleInvoices.length === 0 ? (
          <p className="text-sm text-muted">Inga fakturor ännu. Skapa en från en medlem eller med Ny faktura.</p>
        ) : (
          <ul className="divide-y divide-line">
            {visibleInvoices.map((invoice) => {
              const totals = invoiceTotals(invoice);
              return (
                <li key={invoice.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {invoice.number} · {invoice.name}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {invoice.address || invoice.property || "Ingen adress"} · moms {invoice.vatRate} % · {formatKr(totals.total)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={invoice.paid ? "default" : "outline"}
                      onClick={() => void togglePaid(invoice)}
                    >
                      {invoice.paid ? "Betald" : "Obetald"}
                    </Button>
                    <Button type="button" onClick={() => void sendInvoiceMail(invoice)}>
                      <Mail />
                      Skicka med PDF
                    </Button>
                    <Button variant="outline" onClick={() => setOpenInvoice(invoice)}>
                      PDF
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={() => setDraftInvoice(invoice)} aria-label="Redigera faktura">
                      <Pencil />
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={() => void removeInvoice(invoice.id)} aria-label="Ta bort faktura">
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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
        {visible.length > 0 ? (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (allVisibleSelected) setSelected((current) => current.filter((id) => !visible.some((member) => member.id === id)));
                else setSelected([...new Set([...selected, ...visible.map((member) => member.id)])]);
              }}
            >
              {allVisibleSelected ? "Avmarkera synliga" : "Markera synliga"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelected(withEmail.map((member) => member.id))}
            >
              Markera alla med e-post
            </Button>
            <Button type="button" disabled={selectedWithEmail.length === 0} onClick={() => void startBulkMail()}>
              <Mail />
              Skicka PDF till markerade{selectedWithEmail.length > 0 ? ` (${selectedWithEmail.length})` : ""}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const cleaned = register.members.map(repairMember).filter((row): row is AssociationMember => row !== null);
                void persist({ ...register, members: cleaned }).then((saved) => {
                  toast(`Listan städades. ${saved.members.length} medlemmar.`);
                });
              }}
            >
              Städa listan
            </Button>
          </div>
        ) : null}
        {visible.length === 0 ? (
          <p className="text-sm text-muted">Inga medlemmar ännu. Läs in en fil eller lägg till för hand.</p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((member) => (
              <li key={member.id} className="grid gap-3 py-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-5 shrink-0 accent-pine"
                    checked={selected.includes(member.id)}
                    onChange={() => toggleSelected(member.id)}
                    aria-label={`Markera ${member.name}`}
                  />
                  <p className="min-w-0 flex-1 font-medium text-ink">{member.name || "Ny medlem"}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => startInvoice(member)}>
                      Faktura
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={() => void removeMember(member.id)} aria-label="Ta bort">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Namn"
                    value={member.name ?? ""}
                    onChange={(name) => patchMember(member.id, { name })}
                    onBlur={() => patchMember(member.id, {}, true)}
                  />
                  <Field
                    label="Adress"
                    value={member.address ?? ""}
                    onChange={(address) => patchMember(member.id, { address })}
                    onBlur={() => patchMember(member.id, {}, true)}
                  />
                  <Field
                    label="Postnummer"
                    value={member.zip ?? ""}
                    onChange={(zip) => patchMember(member.id, { zip, postal: formatPostal(zip, member.city) })}
                    onBlur={() => patchMember(member.id, {}, true)}
                  />
                  <Field
                    label="Postort"
                    value={member.city ?? ""}
                    onChange={(city) => patchMember(member.id, { city, postal: formatPostal(member.zip, city) })}
                    onBlur={() => patchMember(member.id, {}, true)}
                  />
                  <Field
                    label="Fastighet"
                    value={member.property ?? ""}
                    onChange={(property) => patchMember(member.id, { property })}
                    onBlur={() => patchMember(member.id, {}, true)}
                  />
                  <Field
                    label="E-post"
                    value={member.email ?? ""}
                    onChange={(email) => patchMember(member.id, { email })}
                    onBlur={() => patchMember(member.id, {}, true)}
                  />
                  <Field
                    label="Telefon"
                    value={member.phone ?? ""}
                    onChange={(phone) => patchMember(member.id, { phone })}
                    onBlur={() => patchMember(member.id, {}, true)}
                  />
                  <Field
                    label="Notering"
                    value={member.note ?? ""}
                    onChange={(note) => patchMember(member.id, { note })}
                    onBlur={() => patchMember(member.id, {}, true)}
                  />
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

      {draftInvoice ? (
        <InvoiceFormDialog
          invoice={draftInvoice}
          members={register.members}
          onClose={() => setDraftInvoice(null)}
          onSave={(invoice) => void saveInvoice(invoice).then((saved) => saved && setDraftInvoice(null))}
          onSaveAndMail={(invoice) => sendInvoiceMail(invoice)}
        />
      ) : null}

      {openInvoice ? (
        <SavedInvoiceDialog
          invoice={openInvoice}
          onClose={() => setOpenInvoice(null)}
          onMail={(invoice) => {
            setOpenInvoice(null);
            void sendInvoiceMail(invoice);
          }}
        />
      ) : null}

      {mailStep ? <MailStepDialog invoice={mailStep} onClose={() => setMailStep(null)} /> : null}

      {bulkQueue ? <BulkMailDialog invoices={bulkQueue} onClose={() => setBulkQueue(null)} /> : null}
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
    zip: "",
    city: "",
    postal: "",
    phone: "",
    customerNo: "",
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
      zip: draft.zip.trim(),
      city: draft.city.trim(),
      postal: formatPostal(draft.zip, draft.city),
      phone: draft.phone.trim(),
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
        <form onSubmit={submit} className="flex min-h-0 flex-col gap-3">
          <div className="grid max-h-[min(60dvh,28rem)] gap-3 overflow-y-auto overscroll-contain pr-1">
            <Field label="Namn" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            <Field label="Adress" value={draft.address} onChange={(address) => setDraft({ ...draft, address })} />
            <Field label="Postnummer" value={draft.zip} onChange={(zip) => setDraft({ ...draft, zip, postal: formatPostal(zip, draft.city) })} />
            <Field label="Postort" value={draft.city} onChange={(city) => setDraft({ ...draft, city, postal: formatPostal(draft.zip, city) })} />
            <Field label="Fastighet" value={draft.property} onChange={(property) => setDraft({ ...draft, property })} />
            <Field label="E-post" value={draft.email} onChange={(email) => setDraft({ ...draft, email })} />
            <Field label="Telefon" value={draft.phone} onChange={(phone) => setDraft({ ...draft, phone })} />
            <Field
              label="Egen avgift (kr, tom = standard)"
              value={draft.fee ? String(draft.fee) : ""}
              onChange={(fee) => setDraft({ ...draft, fee: parseAmountInput(fee) ?? 0 })}
            />
          </div>
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

function InvoiceFormDialog({
  invoice,
  members,
  onClose,
  onSave,
  onSaveAndMail,
}: {
  invoice: Invoice;
  members: AssociationMember[];
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
  onSaveAndMail: (invoice: Invoice) => void;
}) {
  const [draft, setDraft] = useState(invoice);
  const totals = invoiceTotals(draft);

  useEffect(() => {
    setDraft(invoice);
  }, [invoice]);

  function pickMember(id: string) {
    const member = members.find((row) => row.id === id);
    if (!member) return;
    const parsed = splitAddress(member.address);
    setDraft({
      ...draft,
      memberId: member.id,
      name: member.name,
      address: parsed.street || member.address,
      postal: formatPostal(member.zip, member.city) || member.postal || parsed.postal || draft.postal,
      email: member.email,
      phone: member.phone,
      property: member.property,
      customerNo: member.customerNo || draft.customerNo,
      ocr: makeOcr(draft.number, member.customerNo || draft.customerNo),
      amount: member.fee || draft.amount,
    });
  }

  function prepared(): Invoice {
    return {
      ...draft,
      name: draft.name.trim(),
      address: draft.address.trim(),
      postal: draft.postal.trim(),
      email: draft.email.trim().toLowerCase(),
      phone: draft.phone.trim(),
      property: draft.property.trim(),
      description: draft.description.trim(),
      customerNo: draft.customerNo.trim(),
      ocr: makeOcr(draft.number, draft.customerNo),
    };
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave(prepared());
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{invoice.name ? `Faktura till ${invoice.name}` : "Ny faktura"}</DialogTitle>
          <DialogDescription>Person, adress, belopp och moms sparas på fakturan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-col gap-3">
          <div className="grid max-h-[min(60dvh,28rem)] gap-3 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2">
            {members.length > 0 ? (
              <div className="grid gap-2 sm:col-span-2">
                <Label>Från medlem</Label>
                <select
                  className="h-11 rounded-md border border-line bg-bg px-3 text-sm text-ink"
                  value={draft.memberId ?? ""}
                  onChange={(event) => pickMember(event.target.value)}
                >
                  <option value="">Välj eller fyll i för hand</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Field label="Person" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            <Field label="Adress" value={draft.address} onChange={(address) => setDraft({ ...draft, address })} />
            <Field
              label="Postnummer"
              value={parseZipCity(draft.postal).zip}
              onChange={(zip) => setDraft({ ...draft, postal: formatPostal(zip, parseZipCity(draft.postal).city) })}
            />
            <Field
              label="Postort"
              value={parseZipCity(draft.postal).city}
              onChange={(city) => setDraft({ ...draft, postal: formatPostal(parseZipCity(draft.postal).zip, city) })}
            />
            <Field label="Fastighet" value={draft.property} onChange={(property) => setDraft({ ...draft, property })} />
            <Field label="E-post" value={draft.email} onChange={(email) => setDraft({ ...draft, email })} />
            <Field label="Telefon" value={draft.phone} onChange={(phone) => setDraft({ ...draft, phone })} />
            <Field label="Kundnr" value={draft.customerNo} onChange={(customerNo) => setDraft({ ...draft, customerNo, ocr: draft.ocr || customerNo })} />
            <div className="sm:col-span-2">
              <Field
                label="Beskrivning"
                value={draft.description}
                onChange={(description) => setDraft({ ...draft, description })}
              />
            </div>
            <Field
              label="Belopp exkl. moms (kr)"
              value={draft.amount ? String(draft.amount) : ""}
              onChange={(amount) => setDraft({ ...draft, amount: parseAmountInput(amount) ?? 0 })}
            />
            <Field
              label="Förfallodag"
              value={draft.dueDate}
              onChange={(dueDate) => setDraft({ ...draft, dueDate })}
            />
            <div className="grid gap-2 sm:col-span-2">
              <Label>Momssats</Label>
              <div className="flex flex-wrap gap-2">
                {VAT_RATES.map((rate) => (
                  <Button
                    key={rate}
                    type="button"
                    variant={draft.vatRate === rate ? "default" : "outline"}
                    onClick={() => setDraft({ ...draft, vatRate: rate as VatRate })}
                  >
                    {rate} %
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted sm:col-span-2">
              Moms {formatKr(totals.vat)} · Att betala {formatKr(totals.total)}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit">Spara</Button>
            <Button type="button" onClick={() => onSaveAndMail(prepared())}>
              <Mail />
              Skicka med PDF
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SavedInvoiceDialog({
  invoice,
  onClose,
  onMail,
}: {
  invoice: Invoice;
  onClose: () => void;
  onMail: (invoice: Invoice) => void;
}) {
  const totals = invoiceTotals(invoice);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{invoice.number}</DialogTitle>
          <DialogDescription>
            {invoice.name} · {formatKr(totals.total)} · {invoice.paid ? "Betald" : "Obetald"}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-ink">
          {invoice.address}{invoice.postal ? `, ${invoice.postal}` : ""}
          <br />
          {invoice.description}
          <br />
          Exkl. moms {formatKr(totals.net)} · Moms {invoice.vatRate} % {formatKr(totals.vat)}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Stäng
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void downloadSavedInvoice(invoice)
                .then(() => toast("PDF:en laddades ner."))
                .catch(() => toast.error("Kunde inte skapa PDF."));
            }}
          >
            <FileDown />
            Ladda ner PDF
          </Button>
          <Button type="button" disabled={!invoice.email.includes("@")} onClick={() => onMail(invoice)}>
            <Mail />
            Skicka med PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkMailDialog({
  invoices,
  onClose,
}: {
  invoices: Invoice[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [working, setWorking] = useState(false);
  const current = invoices[index];
  if (!current) return null;
  const invoice = current;

  function sendCurrent() {
    setWorking(true);
    void postInvoiceMail(invoice)
      .then(() => toast.success("Skickad med PDF från koholmavagen@gmail.com."))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Kunde inte skicka."))
      .finally(() => setWorking(false));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Massutskick</DialogTitle>
          <DialogDescription>
            {index + 1} av {invoices.length} · {current.name}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-ink">
          Gmail öppnas som {SELLER.email}. PDF:en följer med som länk i mejlet — öppna inte Adobe.
        </p>
        <p className="text-sm text-muted">
          {current.property || current.address || "Ingen fastighet"} · {formatKr(invoiceTotals(current).total)}
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setWorking(true);
              void downloadInvoiceZip(invoices, "fakturor-markerade.zip")
                .then(() => toast("PDF:erna laddades ner."))
                .catch(() => toast.error("Kunde inte skapa PDF."))
                .finally(() => setWorking(false));
            }}
          >
            <FileDown />
            Ladda ner alla PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={working}
            onClick={() => {
              setWorking(true);
              void downloadSavedInvoice(invoice)
                .then(() => toast("PDF:en laddades ner. Bifoga den i Gmail."))
                .catch(() => toast.error("Kunde inte skapa PDF."))
                .finally(() => setWorking(false));
            }}
          >
            <FileDown />
            Ladda ner PDF
          </Button>
          <Button type="button" onClick={sendCurrent}>
            <Mail />
            Öppna Gmail som {SELLER.email}
          </Button>
          {index + 1 < invoices.length ? (
            <Button type="button" variant="outline" onClick={() => setIndex(index + 1)}>
              Nästa
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={onClose}>
              Klar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MailStepDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skicka från {SELLER.email}</DialogTitle>
          <DialogDescription>
            Inte biskopsgrand@gmail.com. Om fel konto syns: tryck på profilbilden uppe till höger och välj {SELLER.email}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 text-sm text-ink">
          <p>
            <span className="text-muted">Från </span>
            {SELLER.email}
          </p>
          <p>
            <span className="text-muted">Till </span>
            {invoice.email}
          </p>
          <p>
            <span className="text-muted">Ämne </span>
            Faktura {invoice.number}
          </p>
          <p className="text-muted">
            Gmail öppnas som {SELLER.email}. PDF:en är en länk i mejlet.
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void downloadSavedInvoice(invoice)
                .then(() => toast("PDF:en laddades ner. Bifoga den i Gmail."))
                .catch(() => toast.error("Kunde inte skapa PDF."));
            }}
          >
            <FileDown />
            Ladda ner PDF
          </Button>
          <Button
            type="button"
            onClick={() => {
              void postInvoiceMail(invoice)
                .then(() => toast.success("Skickad med PDF från koholmavagen@gmail.com."))
                .catch((err) => toast.error(err instanceof Error ? err.message : "Kunde inte skicka."));
            }}
          >
            <Mail />
            Öppna Gmail som {SELLER.email}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
