import { categoryById, type Category, type TxType } from "@/lib/categories";
import {
  fiscalClosingLabel,
  fiscalPeriodLabel,
  fiscalYearFromIso,
  fiscalYearLabel,
} from "@/lib/format";
import {
  EMPTY_YEAR_BOOK,
  accruedTotals,
  cashMovement,
  monthTotals,
  type BalanceItem,
  type Transaction,
  type YearBook,
} from "@/lib/budget-store";

export type ReportLine = {
  categoryId: string;
  name: string;
  amount: number;
};

export type AnnualReport = {
  year: number;
  label: string;
  periodLabel: string;
  closingLabel: string;
  income: number;
  expense: number;
  result: number;
  incomeLines: ReportLine[];
  expenseLines: ReportLine[];
  openingCash: number;
  cash: number;
  assets: BalanceItem[];
  assetSum: number;
  liabilities: BalanceItem[];
  liabilitySum: number;
  totalAssets: number;
  equity: number;
  openingEquity: number;
};

function money(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function transactionsInFiscalYear(
  transactions: Transaction[],
  startYear: number,
): Transaction[] {
  const start = `${startYear}-07-01`;
  const end = `${startYear + 1}-06-30`;
  return transactions.filter((tx) => {
    const date = String(tx.date ?? "").slice(0, 10);
    return date >= start && date <= end;
  });
}

export function yearsFromData(
  transactions: Transaction[],
  yearBooks: Record<string, YearBook>,
  fallbackYear: number,
): number[] {
  const set = new Set<number>();
  set.add(fallbackYear);
  for (const tx of transactions) {
    set.add(fiscalYearFromIso(tx.date));
  }
  for (const key of Object.keys(yearBooks)) {
    const y = Number(key);
    if (Number.isFinite(y)) set.add(y);
  }
  return [...set].sort((a, b) => a - b);
}

function linesFor(
  transactions: Transaction[],
  categories: Category[],
  type: TxType,
): ReportLine[] {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + money(tx.amount));
  }
  return [...map.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categoryById(categories, categoryId)?.name ?? "Övrigt",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildAnnualReport(
  year: number,
  transactions: Transaction[],
  categories: Category[],
  book: YearBook | undefined,
): AnnualReport {
  const yearTx = transactionsInFiscalYear(transactions, year);
  const totals = monthTotals(yearTx);
  const cashFlow = cashMovement(yearTx);
  const accrued = accruedTotals(yearTx);
  const resolved = book ?? EMPTY_YEAR_BOOK;
  const openingCash = money(resolved.openingCash);
  const assets = [
    ...(accrued.income > 0
      ? [{ id: "accrued-income", name: "Upplupna intäkter", amount: accrued.income }]
      : []),
    ...resolved.assets.map((item) => ({ ...item, amount: money(item.amount) })),
  ];
  const liabilities = [
    ...(accrued.expense > 0
      ? [{ id: "accrued-expense", name: "Upplupna kostnader", amount: accrued.expense }]
      : []),
    ...resolved.liabilities.map((item) => ({ ...item, amount: money(item.amount) })),
  ];
  const assetSum = assets.reduce((sum, item) => sum + item.amount, 0);
  const liabilitySum = liabilities.reduce((sum, item) => sum + item.amount, 0);
  const cash = openingCash + cashFlow.remaining;
  const totalAssets = cash + assetSum;
  const equity = totalAssets - liabilitySum;
  const openingEquity = openingCash + money(resolved.assets.reduce((sum, item) => sum + money(item.amount), 0)) - money(resolved.liabilities.reduce((sum, item) => sum + money(item.amount), 0));
  return {
    year,
    label: fiscalYearLabel(year),
    periodLabel: fiscalPeriodLabel(year),
    closingLabel: fiscalClosingLabel(year),
    income: totals.income,
    expense: totals.expense,
    result: totals.remaining,
    incomeLines: linesFor(yearTx, categories, "income"),
    expenseLines: linesFor(yearTx, categories, "expense"),
    openingCash,
    cash,
    assets,
    assetSum,
    liabilities,
    liabilitySum,
    totalAssets,
    equity,
    openingEquity,
  };
}