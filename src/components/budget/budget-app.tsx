import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountChip } from "@/components/budget/account-chip";
import { AdminNav } from "@/components/budget/auth-gate";
import { BrandLockup } from "@/components/budget/brand-lockup";
import { BudgetDialog } from "@/components/budget/budget-dialog";
import { YearBudgetChart, type YearBudgetMonth } from "@/components/budget/year-budget-chart";
import { CategoriesDialog } from "@/components/budget/categories-dialog";
import { TransactionDialog } from "@/components/budget/transaction-dialog";
import { categoryById, type Category } from "@/lib/categories";
import {
  fiscalMonthKeys,
  fiscalYearFromIso,
  fiscalYearLabel,
  formatDayLabel,
  formatKr,
  formatMonthLabel,
  shiftMonth,
} from "@/lib/format";
import {
  monthTotals,
  monthTransactions,
  restoreLocalBudget,
  spendingByCategory,
  useBudgetStore,
  type Transaction,
} from "@/lib/budget-store";
import { cn } from "@/lib/utils";

type ListFilter = "all" | "income" | "expense";

export function BudgetApp() {
  const transactions = useBudgetStore((s) => s.transactions);
  const categories = useBudgetStore((s) => s.categories);
  const selectedMonth = useBudgetStore((s) => s.selectedMonth);
  const setSelectedMonth = useBudgetStore((s) => s.setSelectedMonth);
  const yearBooks = useBudgetStore((s) => s.yearBooks);
  const deleteTransaction = useBudgetStore((s) => s.deleteTransaction);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState<ListFilter>("all");
  const [restoring, setRestoring] = useState(false);

  const monthTx = useMemo(
    () => monthTransactions(transactions, selectedMonth),
    [transactions, selectedMonth],
  );
  const totals = useMemo(() => monthTotals(monthTx), [monthTx]);
  const breakdown = useMemo(() => spendingByCategory(monthTx), [monthTx]);
  const visibleTx = useMemo(() => {
    if (filter === "all") return monthTx;
    return monthTx.filter((tx) => tx.type === filter);
  }, [monthTx, filter]);

  const fiscalYear = fiscalYearFromIso(`${selectedMonth}-01`);
  const annualBudget = yearBooks[String(fiscalYear)]?.annualBudget || 0;
  const yearMonths = useMemo(() => {
    let cumulative = 0;
    return fiscalMonthKeys(fiscalYear).map((key): YearBudgetMonth => {
      const spent = monthTotals(monthTransactions(transactions, key)).expense;
      cumulative += spent;
      return { key, spent, cumulative };
    });
  }, [fiscalYear, transactions]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditing(tx);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteTransaction(pendingDelete.id);
    toast("Transaktionen togs bort");
    setPendingDelete(null);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl min-w-0 flex-col overflow-x-clip px-4 pt-6 pb-10 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <BrandLockup page="Budgetplan" />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <AccountChip />
          <AdminNav />
          <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
            Kategorier
          </Button>
          <Button variant="outline" asChild>
            <Link to="/rapporter">Rapporter</Link>
          </Button>
          <MonthNav
            month={selectedMonth}
            onPrev={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
            onNext={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
            <p className="text-sm text-muted">Kvar i {formatMonthLabel(selectedMonth).toLowerCase()}</p>
            <p className="text-xs text-subtle">
              Räkenskapsår {fiscalYearLabel(fiscalYearFromIso(`${selectedMonth}-01`))} (1 jul–30 jun)
            </p>
            <p
              className={cn(
                "mt-2 font-display text-5xl leading-none font-medium tracking-tight whitespace-nowrap tabular-nums sm:text-6xl",
                totals.remaining < 0 ? "text-clay" : "text-ink",
              )}
            >
              {formatKr(totals.remaining)}
            </p>
            <p className="mt-3 text-sm text-muted">
              {monthTx.length === 0
                ? "Inga transaktioner den här månaden ännu."
                : `${monthTx.length} transaktioner · uppdateras live`}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Metric
                label="Inkomster"
                value={formatKr(totals.income)}
                tone="income"
              />
              <Metric
                label="Utgifter"
                value={formatKr(totals.expense)}
                tone="expense"
              />
            </div>
            {transactions.length === 0 ? (
              <Button
                variant="outline"
                className="mt-4 w-full"
                disabled={restoring}
                onClick={() => {
                  setRestoring(true);
                  void restoreLocalBudget()
                    .then((count) => {
                      toast(
                        count > 0
                          ? `Återställde ${count} poster.`
                          : "Hittade ingen kopia på den här enheten.",
                      );
                    })
                    .finally(() => setRestoring(false));
                }}
              >
                {restoring ? "Återställer…" : "Återställ poster från den här enheten"}
              </Button>
            ) : null}
          </section>

          <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
            <YearBudgetChart
              year={fiscalYear}
              budget={annualBudget}
              months={yearMonths}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
            />
            <Button variant="outline" className="mt-4 w-full" onClick={() => setBudgetOpen(true)}>
              {annualBudget > 0 ? "Ändra årsbudget" : "Sätt årsbudget 100 000 kr"}
            </Button>
          </section>

          <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-ink">Utgifter per kategori</h2>
              <button
                type="button"
                onClick={() => setCategoriesOpen(true)}
                className="rounded-sm bg-surface-2 px-2 py-1 text-xs font-medium text-muted"
              >
                Hantera
              </button>
            </div>
            <CategoryChart items={breakdown} total={totals.expense} categories={categories} />
          </section>
        </div>

        <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] lg:col-span-7 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-medium text-ink">Transaktioner</h2>
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <Plus />
              Lägg till
            </Button>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
            {(
              [
                ["all", "Alla"],
                ["expense", "Utgifter"],
                ["income", "Inkomster"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "h-10 rounded-md text-sm font-medium transition-[background-color,color] duration-150",
                  filter === key ? "bg-surface text-ink shadow-[var(--shadow-border)]" : "text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleTx.length === 0 ? (
            <EmptyList filter={filter} onAdd={openCreate} />
          ) : (
            <ul className="divide-y divide-line">
              {visibleTx.map((tx) => {
                const cat = categoryById(categories, tx.categoryId);
                return (
                  <li key={tx.id}>
                    <div className="flex items-center gap-3 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(tx)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: cat?.swatch ?? "var(--color-muted)" }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-ink">
                            {tx.note || cat?.name || "Transaktion"}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted">
                            {cat?.name}
                            <span className="text-subtle"> · {formatDayLabel(tx.date)}</span>
                            {tx.accrued ? (
                              <span className="text-subtle">
                                {" "}
                                · {tx.type === "income" ? "ej betald" : "ej utbetald"}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-right text-sm font-medium whitespace-nowrap tabular-nums sm:text-base",
                            tx.type === "income" ? "text-moss" : "text-ink",
                          )}
                        >
                          {tx.type === "income" ? "+" : "−"}
                          {formatKr(tx.amount)}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Åtgärder"
                            className="shrink-0 text-muted"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(tx)}>
                            <Pencil />
                            Redigera
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(tx)}>
                            <Trash2 />
                            Ta bort
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <TransactionDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onManageCategories={() => setCategoriesOpen(true)}
      />
      <BudgetDialog open={budgetOpen} onOpenChange={setBudgetOpen} month={selectedMonth} />
      <CategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort transaktionen?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.note || categoryById(categories, pendingDelete.categoryId)?.name} · ${formatKr(pendingDelete.amount)} tas bort. Det går inte att ångra.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-clay text-destructive-foreground hover:bg-clay/90"
              onClick={confirmDelete}
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MonthNav({
  month,
  onPrev,
  onNext,
}: {
  month: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex w-fit items-center gap-1 self-start rounded-lg bg-surface p-1 shadow-[var(--shadow-border)]">
      <Button variant="ghost" size="icon-sm" onClick={onPrev} aria-label="Föregående månad">
        <ChevronLeft />
      </Button>
      <p className="min-w-36 px-1 text-center text-sm font-medium whitespace-nowrap text-ink">
        {formatMonthLabel(month)}
      </p>
      <Button variant="ghost" size="icon-sm" onClick={onNext} aria-label="Nästa månad">
        <ChevronRight />
      </Button>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense";
}) {
  return (
    <div className="rounded-lg bg-bg px-3 py-3">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-medium whitespace-nowrap tabular-nums",
          tone === "income" ? "text-moss" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CategoryChart({
  items,
  total,
  categories,
}: {
  items: { categoryId: string; amount: number }[];
  total: number;
  categories: Category[];
}) {
  if (items.length === 0 || total <= 0) {
    return (
      <p className="text-sm text-muted">
        Inga utgifter att visa. Lägg till transaktioner för att se fördelningen.
      </p>
    );
  }

  const radius = 36;
  const stroke = 10;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <svg
        viewBox="0 0 96 96"
        className="mx-auto size-28 shrink-0 sm:mx-0"
        role="img"
        aria-label="Cirkeldiagram över utgifter per kategori"
      >
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
        />
        {items.map((item) => {
          const cat = categoryById(categories, item.categoryId);
          const frac = item.amount / total;
          const dash = frac * circ;
          const el = (
            <circle
              key={item.categoryId}
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke={cat?.swatch ?? "var(--color-muted)"}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 48 48)"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-3">
        {items.map((item) => {
          const cat = categoryById(categories, item.categoryId);
          const pct = Math.round((item.amount / total) * 100);
          return (
            <li key={item.categoryId}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: cat?.swatch ?? "var(--color-muted)" }}
                  />
                  <span className="truncate">{cat?.name ?? item.categoryId}</span>
                </span>
                <span className="shrink-0 text-sm whitespace-nowrap tabular-nums text-ink">
                  {formatKr(item.amount)}
                  <span className="ml-2 text-muted">{pct}%</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: cat?.swatch ?? "var(--color-muted)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyList({ filter, onAdd }: { filter: ListFilter; onAdd: () => void }) {
  const copy =
    filter === "income"
      ? "Inga inkomster den här månaden."
      : filter === "expense"
        ? "Inga utgifter den här månaden."
        : "Inga transaktioner den här månaden.";
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg bg-bg px-4 py-8">
      <p className="text-sm text-muted">{copy}</p>
      <Button variant="outline" onClick={onAdd}>
        <Plus />
        Lägg till den första
      </Button>
    </div>
  );
}
