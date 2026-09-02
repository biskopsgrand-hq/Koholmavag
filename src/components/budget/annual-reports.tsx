import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountChip } from "@/components/budget/account-chip";
import { AdminNav } from "@/components/budget/auth-gate";
import { BrandLockup } from "@/components/budget/brand-lockup";
import { currentFiscalYear, fiscalYearLabel, formatKr, parseAmountInput, parseMoneyInput } from "@/lib/format";
import { buildAnnualReport, transactionsInFiscalYear, yearsFromData } from "@/lib/reports";
import { reportToDocx } from "@/lib/report-docx";
import { useBudgetStore, type BalanceItem } from "@/lib/budget-store";
import { cn } from "@/lib/utils";

export function AnnualReports() {
  const transactions = useBudgetStore((s) => s.transactions);
  const categories = useBudgetStore((s) => s.categories);
  const yearBooks = useBudgetStore((s) => s.yearBooks);
  const setOpeningCash = useBudgetStore((s) => s.setOpeningCash);
  const addBalanceItem = useBudgetStore((s) => s.addBalanceItem);
  const removeBalanceItem = useBudgetStore((s) => s.removeBalanceItem);

  const [year, setYear] = useState(currentFiscalYear());
  const [pickedYear, setPickedYear] = useState(false);
  const [openingDraft, setOpeningDraft] = useState<string | null>(null);
  const [assetName, setAssetName] = useState("");
  const [assetAmount, setAssetAmount] = useState("");
  const [debtName, setDebtName] = useState("");
  const [debtAmount, setDebtAmount] = useState("");

  const years = useMemo(
    () => yearsFromData(transactions, yearBooks, currentFiscalYear()),
    [transactions, yearBooks],
  );

  useEffect(() => {
    if (pickedYear || transactions.length === 0) return;
    const ranked = years
      .map((candidate) => ({
        candidate,
        count: transactionsInFiscalYear(transactions, candidate).length,
      }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count || b.candidate - a.candidate);
    if (ranked[0] && ranked[0].candidate !== year) setYear(ranked[0].candidate);
  }, [pickedYear, transactions, year, years]);

  const report = useMemo(
    () => buildAnnualReport(year, transactions, categories, yearBooks[String(year)]),
    [year, transactions, categories, yearBooks],
  );
  const yearTx = useMemo(
    () => transactionsInFiscalYear(transactions, year),
    [transactions, year],
  );
  const otherYears = useMemo(
    () =>
      years
        .filter((candidate) => candidate !== year)
        .map((candidate) => ({
          year: candidate,
          count: transactionsInFiscalYear(transactions, candidate).length,
        }))
        .filter((row) => row.count > 0),
    [years, year, transactions],
  );

  const openingValue = openingDraft ?? String(report.openingCash);

  useEffect(() => {
    setOpeningDraft(null);
  }, [year]);

  function commitOpening() {
    const parsed = parseMoneyInput(openingValue, true);
    if (parsed === null) {
      setOpeningDraft(null);
      return;
    }
    setOpeningCash(year, parsed);
    setOpeningDraft(null);
  }

  function handleAdd(kind: "assets" | "liabilities") {
    const name = kind === "assets" ? assetName : debtName;
    const raw = kind === "assets" ? assetAmount : debtAmount;
    const parsed = parseAmountInput(raw);
    if (!name.trim() || parsed === null) {
      toast("Ange namn och belopp.");
      return;
    }
    const id = addBalanceItem(year, kind, name, parsed);
    if (!id) {
      toast("Posten kunde inte läggas till.");
      return;
    }
    if (kind === "assets") {
      setAssetName("");
      setAssetAmount("");
    } else {
      setDebtName("");
      setDebtAmount("");
    }
    toast(kind === "assets" ? "Tillgången lades till" : "Skulden lades till");
  }

  function download() {
    const blob = reportToDocx(report);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saldo-arsrapport-${year}-${year + 1}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Word-filen laddades ner");
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl min-w-0 flex-col overflow-x-clip px-4 pt-6 pb-16 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 print:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <BrandLockup page={`Årsrapport ${report.label}`} />
          <p className="mt-1 text-sm text-muted">{report.periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <AccountChip />
          <AdminNav />
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft />
              Budget
            </Link>
          </Button>
          <YearNav
            year={year}
            years={years}
            onChange={(next) => {
              setPickedYear(true);
              setYear(next);
            }}
          />
        </div>
      </header>

      <p className="mb-6 hidden text-sm text-muted print:block">
        Räkenskapsår {report.periodLabel}. Belopp i svenska kronor.
      </p>

      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <Button onClick={printReport}>
          <Printer />
          Skriv ut / PDF
        </Button>
        <Button variant="outline" onClick={download}>
          <Download />
          Ladda ner Word
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <StatementCard title={`Resultaträkning ${report.label}`}>
          <p className="text-sm text-muted">
            {yearTx.length === 0
              ? `Inga poster med datum ${report.periodLabel}. Byt räkenskapsår eller kontrollera datum på transaktionerna.`
              : `${yearTx.length} poster med datum ${report.periodLabel}.`}
          </p>
          {otherYears.length > 0 ? (
            <p className="text-sm text-muted">
              {otherYears.map((row) => `${row.count} poster i ${fiscalYearLabel(row.year)}`).join(" · ")}
            </p>
          ) : null}
          <LedgerSection label="Intäkter">
            {report.incomeLines.length === 0 ? (
              <EmptyRow text="Inga intäkter under räkenskapsåret." />
            ) : (
              report.incomeLines.map((line) => (
                <LedgerRow key={line.categoryId} label={line.name} amount={line.amount} />
              ))
            )}
            <LedgerRow label="Summa intäkter" amount={report.income} total />
          </LedgerSection>
          <LedgerSection label="Kostnader">
            {report.expenseLines.length === 0 ? (
              <EmptyRow text="Inga kostnader under räkenskapsåret." />
            ) : (
              report.expenseLines.map((line) => (
                <LedgerRow key={line.categoryId} label={line.name} amount={line.amount} />
              ))
            )}
            <LedgerRow label="Summa kostnader" amount={report.expense} total />
          </LedgerSection>
          <LedgerRow
            label="Årets resultat"
            amount={report.result}
            emphasize
            tone={report.result < 0 ? "negative" : "positive"}
          />
          {report.accruedIncome > 0 || report.accruedExpense > 0 ? (
            <LedgerSection label="Fakturerat, ej betalt">
              <p className="text-sm text-muted">Visas här men räknas inte in i intäkter, kostnader eller årets resultat.</p>
              {report.accruedIncomeLines.map((line) => (
                <LedgerRow
                  key={`ai-${line.categoryId}`}
                  label={`${line.name} (ej betald)`}
                  amount={line.amount}
                  muted
                />
              ))}
              {report.accruedIncome > 0 ? (
                <LedgerRow label="Summa fakturerat, ej betalt" amount={report.accruedIncome} total muted />
              ) : null}
              {report.accruedExpenseLines.map((line) => (
                <LedgerRow
                  key={`ae-${line.categoryId}`}
                  label={`${line.name} (ej utbetald)`}
                  amount={line.amount}
                  muted
                />
              ))}
              {report.accruedExpense > 0 ? (
                <LedgerRow label="Summa kostnader, ej betalda" amount={report.accruedExpense} total muted />
              ) : null}
            </LedgerSection>
          ) : null}
        </StatementCard>

        <StatementCard title={`Balansräkning ${report.closingLabel}`}>
          <LedgerSection label="Tillgångar">
            <LedgerRow label="Likvida medel" amount={report.cash} />
            {report.assets.map((item) => (
              <LedgerRow key={item.id} label={item.name} amount={item.amount} />
            ))}
            <LedgerRow label="Summa tillgångar" amount={report.totalAssets} total />
          </LedgerSection>
          <LedgerSection label="Eget kapital och skulder">
            <LedgerRow label="Ingående eget kapital" amount={report.openingEquity} />
            <LedgerRow
              label="Årets resultat"
              amount={report.result}
              tone={report.result < 0 ? "negative" : undefined}
            />
            <LedgerRow label="Summa eget kapital" amount={report.equity} total />
            {report.liabilities.map((item) => (
              <LedgerRow key={item.id} label={item.name} amount={item.amount} />
            ))}
            <LedgerRow
              label="Summa eget kapital och skulder"
              amount={report.equity + report.liabilitySum}
              total
            />
          </LedgerSection>
          <p className="mt-4 text-sm text-muted">
            Likvida medel = ingående saldo 1 juli ({formatKr(report.openingCash)}) + årets resultat.
            Fakturerat men ej betalt visas i resultaträkningen men ingår inte i summorna.
          </p>
        </StatementCard>

        <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] print:hidden sm:p-6">
          <h2 className="font-display text-xl font-medium tracking-tight text-ink">
            Balansposter {report.label}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Ange ingående likvida medel den 1 juli samt övriga tillgångar och skulder per 30 juni.
          </p>

          <div className="mt-5 grid gap-2">
            <Label htmlFor="opening-cash">Ingående likvida medel (1 jul)</Label>
            <Input
              id="opening-cash"
              inputMode="decimal"
              className="tabular-nums"
              value={openingValue}
              onChange={(e) => setOpeningDraft(e.target.value)}
              onBlur={commitOpening}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitOpening();
                }
              }}
              placeholder="0"
            />
          </div>

          <ItemEditor
            title="Övriga tillgångar"
            name={assetName}
            amount={assetAmount}
            onName={setAssetName}
            onAmount={setAssetAmount}
            items={report.assets.filter((item) => item.id !== "accrued-income")}
            onAdd={() => handleAdd("assets")}
            onRemove={(id) => removeBalanceItem(year, "assets", id)}
            namePlaceholder="Sparkonto, ISK, bostad…"
          />
          <ItemEditor
            title="Skulder"
            name={debtName}
            amount={debtAmount}
            onName={setDebtName}
            onAmount={setDebtAmount}
            items={report.liabilities.filter((item) => item.id !== "accrued-expense")}
            onAdd={() => handleAdd("liabilities")}
            onRemove={(id) => removeBalanceItem(year, "liabilities", id)}
            namePlaceholder="Bolån, CSN, kreditkort…"
          />
        </section>
      </div>
    </div>
  );
}

function YearNav({
  year,
  years,
  onChange,
}: {
  year: number;
  years: number[];
  onChange: (year: number) => void;
}) {
  const min = Math.min(...years, year, currentFiscalYear()) - 1;
  const max = Math.max(...years, year, currentFiscalYear()) + 1;
  return (
    <div className="flex w-fit items-center gap-1 rounded-lg bg-surface p-1 shadow-[var(--shadow-border)]">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(year - 1)}
        disabled={year <= min}
        aria-label="Föregående räkenskapsår"
      >
        <ChevronLeft />
      </Button>
      <p className="min-w-[4.75rem] px-1 text-center text-sm font-medium whitespace-nowrap text-ink">
        {year}/{year + 1}
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(year + 1)}
        disabled={year >= max}
        aria-label="Nästa räkenskapsår"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

function StatementCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] print:shadow-none sm:p-6">
      <h2 className="font-display text-xl font-medium tracking-tight text-ink">{title}</h2>
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function LedgerSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium tracking-widest text-muted uppercase">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function LedgerRow({
  label,
  amount,
  total,
  emphasize,
  muted,
  tone,
}: {
  label: string;
  amount: number;
  total?: boolean;
  emphasize?: boolean;
  muted?: boolean;
  tone?: "positive" | "negative";
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-1.5 text-sm",
        total && "border-t border-line pt-2 font-medium",
        emphasize && "mt-1 border-t border-ink/20 pt-3 text-base",
      )}
    >
      <span className={cn("min-w-0 truncate", emphasize ? "font-medium text-ink" : muted ? "text-muted" : "text-ink")}>
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          muted && "text-muted",
          tone === "positive" && "text-moss",
          tone === "negative" && "text-clay",
        )}
      >
        {formatKr(amount)}
      </span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="py-1.5 text-sm text-muted">{text}</p>;
}

function ItemEditor({
  title,
  name,
  amount,
  onName,
  onAmount,
  items,
  onAdd,
  onRemove,
  namePlaceholder,
}: {
  title: string;
  name: string;
  amount: string;
  onName: (value: string) => void;
  onAmount: (value: string) => void;
  items: BalanceItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  namePlaceholder: string;
}) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onAdd();
  }

  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-ink">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.name}</span>
              <span className="text-sm tabular-nums text-ink">{formatKr(item.amount)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Ta bort ${item.name}`}
                className="text-muted hover:text-clay"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_auto]">
        <Input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder={namePlaceholder}
          maxLength={40}
          aria-label={`${title} namn`}
        />
        <Input
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          placeholder="Belopp"
          inputMode="decimal"
          className="tabular-nums"
          aria-label={`${title} belopp`}
        />
        <Button type="submit">
          <Plus />
          Lägg till
        </Button>
      </form>
    </div>
  );
}
