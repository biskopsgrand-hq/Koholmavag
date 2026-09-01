import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_CATEGORIES,
  fallbackCategoryId,
  findDuplicate,
  nextSwatch,
  type Category,
  type TxType,
} from "@/lib/categories";
import { currentFiscalYear, monthKeyFromDate } from "@/lib/format";

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  categoryId: string;
  note: string;
  date: string;
};

export type TransactionInput = Omit<Transaction, "id"> & { id?: string };

export type BalanceItem = {
  id: string;
  name: string;
  amount: number;
};

export type YearBook = {
  openingCash: number;
  assets: BalanceItem[];
  liabilities: BalanceItem[];
};

export const EMPTY_YEAR_BOOK: YearBook = {
  openingCash: 0,
  assets: [],
  liabilities: [],
};

type BalanceKind = "assets" | "liabilities";

type BudgetState = {
  transactions: Transaction[];
  categories: Category[];
  monthlyBudget: number;
  selectedMonth: string;
  yearBooks: Record<string, YearBook>;
  addTransaction: (input: TransactionInput) => void;
  updateTransaction: (id: string, input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (name: string, type: TxType) => string | null;
  renameCategory: (id: string, name: string) => boolean;
  deleteCategory: (id: string) => boolean;
  setMonthlyBudget: (amount: number) => void;
  setSelectedMonth: (month: string) => void;
  setOpeningCash: (year: number, amount: number) => void;
  addBalanceItem: (year: number, kind: BalanceKind, name: string, amount: number) => string | null;
  removeBalanceItem: (year: number, kind: BalanceKind, id: string) => void;
};

function seedMonth(): string {
  return monthKeyFromDate(new Date());
}

function isoInMonth(month: string, day: number): string {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const d = Math.min(day, last);
  return `${month}-${String(d).padStart(2, "0")}`;
}

function seedTransactions(month: string): Transaction[] {
  const d = (day: number) => isoInMonth(month, day);
  return [
    { id: "seed-lon", type: "income", amount: 38500, categoryId: "salary", note: "Månadslön", date: d(25) },
    { id: "seed-frilans", type: "income", amount: 4500, categoryId: "side", note: "Frilansuppdrag", date: d(12) },
    { id: "seed-hyra", type: "expense", amount: 14500, categoryId: "housing", note: "Hyra", date: d(1) },
    { id: "seed-ica", type: "expense", amount: 2450, categoryId: "food", note: "ICA", date: d(4) },
    { id: "seed-el", type: "expense", amount: 780, categoryId: "bills", note: "Elräkning", date: d(5) },
    { id: "seed-sl", type: "expense", amount: 1020, categoryId: "transport", note: "SL-kort", date: d(1) },
    { id: "seed-hemkop", type: "expense", amount: 890, categoryId: "food", note: "Hemköp", date: d(11) },
    { id: "seed-spotify", type: "expense", amount: 119, categoryId: "fun", note: "Spotify", date: d(3) },
    { id: "seed-gym", type: "expense", amount: 399, categoryId: "health", note: "Gymkort", date: d(2) },
    { id: "seed-klader", type: "expense", amount: 1290, categoryId: "shop", note: "Kläder", date: d(16) },
    { id: "seed-rest", type: "expense", amount: 640, categoryId: "fun", note: "Middag ute", date: d(18) },
    { id: "seed-apotek", type: "expense", amount: 175, categoryId: "health", note: "Apotek", date: d(9) },
    { id: "seed-bredband", type: "expense", amount: 399, categoryId: "bills", note: "Bredband", date: d(7) },
    { id: "seed-fika", type: "expense", amount: 165, categoryId: "food", note: "Fika", date: d(20) },
  ];
}

function seedYearBooks(): Record<string, YearBook> {
  const year = String(currentFiscalYear());
  return {
    [year]: {
      openingCash: 35000,
      assets: [{ id: "seed-spar", name: "Sparkonto", amount: 18000 }],
      liabilities: [],
    },
  };
}

function bookFor(books: Record<string, YearBook>, year: number): YearBook {
  return books[String(year)] ?? EMPTY_YEAR_BOOK;
}

const initialMonth = seedMonth();

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      transactions: seedTransactions(initialMonth),
      categories: DEFAULT_CATEGORIES,
      monthlyBudget: 25000,
      selectedMonth: initialMonth,
      yearBooks: seedYearBooks(),
      addTransaction: (input) =>
        set((state) => ({
          transactions: [
            {
              id: crypto.randomUUID(),
              type: input.type,
              amount: input.amount,
              categoryId: input.categoryId,
              note: input.note.trim(),
              date: input.date,
            },
            ...state.transactions,
          ],
        })),
      updateTransaction: (id, input) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id
              ? {
                  ...tx,
                  type: input.type,
                  amount: input.amount,
                  categoryId: input.categoryId,
                  note: input.note.trim(),
                  date: input.date,
                }
              : tx,
          ),
        })),
      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        })),
      addCategory: (name, type) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const { categories } = get();
        if (findDuplicate(categories, type, trimmed)) return null;
        const id = crypto.randomUUID();
        set({
          categories: [
            ...categories,
            { id, name: trimmed, type, swatch: nextSwatch(categories, type) },
          ],
        });
        return id;
      },
      renameCategory: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return false;
        const { categories } = get();
        const current = categories.find((c) => c.id === id);
        if (!current) return false;
        if (findDuplicate(categories, current.type, trimmed, id)) return false;
        set({
          categories: categories.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
        });
        return true;
      },
      deleteCategory: (id) => {
        const { categories, transactions } = get();
        const current = categories.find((c) => c.id === id);
        if (!current) return false;
        const fallback = fallbackCategoryId(categories, current.type, id);
        if (!fallback) return false;
        set({
          categories: categories.filter((c) => c.id !== id),
          transactions: transactions.map((tx) =>
            tx.categoryId === id ? { ...tx, categoryId: fallback } : tx,
          ),
        });
        return true;
      },
      setMonthlyBudget: (monthlyBudget) => set({ monthlyBudget }),
      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
      setOpeningCash: (year, amount) =>
        set((state) => {
          const key = String(year);
          const current = bookFor(state.yearBooks, year);
          return {
            yearBooks: {
              ...state.yearBooks,
              [key]: { ...current, openingCash: amount },
            },
          };
        }),
      addBalanceItem: (year, kind, name, amount) => {
        const trimmed = name.trim();
        if (!trimmed || amount <= 0) return null;
        const id = crypto.randomUUID();
        set((state) => {
          const key = String(year);
          const current = bookFor(state.yearBooks, year);
          return {
            yearBooks: {
              ...state.yearBooks,
              [key]: { ...current, [kind]: [...current[kind], { id, name: trimmed, amount }] },
            },
          };
        });
        return id;
      },
      removeBalanceItem: (year, kind, id) =>
        set((state) => {
          const key = String(year);
          const current = bookFor(state.yearBooks, year);
          return {
            yearBooks: {
              ...state.yearBooks,
              [key]: { ...current, [kind]: current[kind].filter((item) => item.id !== id) },
            },
          };
        }),
    }),
    {
      name: "saldo-budget-v1",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BudgetState> & {
          savingsGoal?: { target?: number };
        };
        const { savingsGoal, ...rest } = p;
        const fromNew = typeof rest.monthlyBudget === "number" && rest.monthlyBudget > 0
          ? rest.monthlyBudget
          : undefined;
        const fromOld =
          typeof savingsGoal?.target === "number" && savingsGoal.target > 0
            ? savingsGoal.target
            : undefined;
        return {
          ...current,
          ...rest,
          monthlyBudget: fromNew ?? fromOld ?? current.monthlyBudget,
          categories:
            Array.isArray(p.categories) && p.categories.length > 0
              ? p.categories
              : current.categories,
          yearBooks:
            p.yearBooks && typeof p.yearBooks === "object" && !Array.isArray(p.yearBooks)
              ? p.yearBooks
              : current.yearBooks,
        };
      },
    },
  ),
);

export function monthTransactions(
  transactions: Transaction[],
  month: string,
): Transaction[] {
  return transactions
    .filter((tx) => tx.date.startsWith(month))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.type !== b.type) return a.type === "income" ? -1 : 1;
      return b.amount - a.amount;
    });
}

export function monthTotals(transactions: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.type === "income") income += tx.amount;
    else expense += tx.amount;
  }
  return { income, expense, remaining: income - expense };
}

export function spendingByCategory(transactions: Transaction[]) {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
  }
  return [...map.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}
