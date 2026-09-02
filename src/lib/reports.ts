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
  accruedIncome: number;
  accruedExpense: number;
  accruedIncomeLines: ReportLine[];
  accruedExpenseLines: ReportLine[];
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
  accrued: boolean,
): ReportLine[] {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    if (Boolean(tx.accrued) !== accrued) continue;
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
  const accrued = accruedTotals(yearTx);
  const resolved = book ?? EMPTY_YEAR_BOOK;
  const openingCash = money(resolved.openingCash);
  const assets = resolved.assets.map((item) => ({ ...item, amount: money(item.amount) }));
  const liabilities = resolved.liabilities.map((item) => ({ ...item, amount: money(item.amount) }));
  const assetSum = assets.reduce((sum, item) => sum + item.amount, 0);
  const liabilitySum = liabilities.reduce((sum, item) => sum + item.amount, 0);
  const cash = openingCash + totals.remaining;
  const totalAssets = cash + assetSum;
  const equity = totalAssets - liabilitySum;
  const openingEquity = openingCash + assetSum - liabilitySum;
  return {
    year,
    label: fiscalYearLabel(year),
    periodLabel: fiscalPeriodLabel(year),
    closingLabel: fiscalClosingLabel(year),
    income: totals.income,
    expense: totals.expense,
    result: totals.remaining,
    incomeLines: linesFor(yearTx, categories, "income", false),
    expenseLines: linesFor(yearTx, categories, "expense", false),
    accruedIncome: accrued.income,
    accruedExpense: accrued.expense,
    accruedIncomeLines: linesFor(yearTx, categories, "income", true),
    accruedExpenseLines: linesFor(yearTx, categories, "expense", true),
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