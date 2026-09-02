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
import { monthKeyFromDate } from "@/lib/format";

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  categoryId: string;
  note: string;
  date: string;
  accrued: boolean;
};

export type TransactionInput = Omit<Transaction, "id"> & { id?: string };

export type BalanceItem = {
  id: string;
  name: string;
  amount: number;
};

export type YearBook = {
  openingCash: number;
  annualBudget: number;
  assets: BalanceItem[];
  liabilities: BalanceItem[];
};

export const EMPTY_YEAR_BOOK: YearBook = {
  openingCash: 0,
  annualBudget: 0,
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
  ready: boolean;
  addTransaction: (input: TransactionInput) => void;
  updateTransaction: (id: string, input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (name: string, type: TxType) => string | null;
  renameCategory: (id: string, name: string) => boolean;
  deleteCategory: (id: string) => boolean;
  setMonthlyBudget: (amount: number) => void;
  setSelectedMonth: (month: string) => void;
  setOpeningCash: (year: number, amount: number) => void;
  setAnnualBudget: (year: number, amount: number) => void;
  addBalanceItem: (year: number, kind: BalanceKind, name: string, amount: number) => string | null;
  removeBalanceItem: (year: number, kind: BalanceKind, id: string) => void;
};

function seedMonth(): string {
  return monthKeyFromDate(new Date());
}

function bookFor(books: Record<string, YearBook>, year: number): YearBook {
  return books[String(year)] ?? EMPTY_YEAR_BOOK;
}

function payloadFromState(state: Pick<BudgetState, "monthlyBudget" | "categories" | "transactions" | "yearBooks">) {
  return {
    monthlyBudget: state.monthlyBudget,
    categories: state.categories,
    transactions: state.transactions,
    yearBooks: state.yearBooks,
  };
}

function stripDemoTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => !tx.id.startsWith("seed-"));
}

function stripDemoBooks(books: Record<string, YearBook>): Record<string, YearBook> {
  const next: Record<string, YearBook> = {};
  for (const [year, book] of Object.entries(books)) {
    next[year] = {
      openingCash: book.openingCash,
      annualBudget: book.annualBudget ?? 0,
      assets: book.assets.filter((item) => !item.id.startsWith("seed-")),
      liabilities: book.liabilities.filter((item) => !item.id.startsWith("seed-")),
    };
  }
  return next;
}

let saveTimer = 0;
let hydratePromise: Promise<void> | null = null;

function queueSave() {
  if (typeof window === "undefined") return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const state = useBudgetStore.getState();
    if (!state.ready) return;
    void import("@/lib/budget-fns")
      .then(({ saveBudget }) => saveBudget({ data: payloadFromState(state) }))
      .catch((err) => console.error("budget save failed", err));
  }, 400);
}

function waitForLocalPersist(): Promise<void> {
  return new Promise((resolve) => {
    if (useBudgetStore.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsub = useBudgetStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
    window.setTimeout(resolve, 800);
  });
}

export async function hydrateSharedBudget(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = (async () => {
      await waitForLocalPersist();
      const { loadBudget, saveBudget } = await import("@/lib/budget-fns");
      const remote = await loadBudget({ data: {} });
      const local = useBudgetStore.getState();
      if (!remote.existed) {
        const transactions = stripDemoTransactions(local.transactions);
        const yearBooks = stripDemoBooks(local.yearBooks);
        const next = {
          monthlyBudget: transactions.length > 0 ? local.monthlyBudget : 0,
          categories: local.categories.length > 0 ? local.categories : DEFAULT_CATEGORIES,
          transactions,
          yearBooks,
        };
        const hasBooks = Object.values(yearBooks).some(
          (book) =>
            book.openingCash ||
            book.annualBudget ||
            book.assets.length ||
            book.liabilities.length,
        );
        if (transactions.length > 0 || hasBooks) {
          await saveBudget({ data: next });
        }
        useBudgetStore.setState({ ...next, ready: true });
        return;
      }
      useBudgetStore.setState({
        monthlyBudget: remote.monthlyBudget,
        categories: remote.categories,
        transactions: remote.transactions,
        yearBooks: remote.yearBooks,
        ready: true,
      });
    })().catch((err) => {
      console.error("budget hydrate failed", err);
      useBudgetStore.setState({ ready: true });
    });
  }
  return hydratePromise;
}

export async function refreshSharedBudget(): Promise<void> {
  try {
    const { loadBudget } = await import("@/lib/budget-fns");
    const remote = await loadBudget({ data: {} });
    if (!remote.existed) return;
    useBudgetStore.setState({
      monthlyBudget: remote.monthlyBudget,
      categories: remote.categories,
      transactions: remote.transactions,
      yearBooks: remote.yearBooks,
      ready: true,
    });
  } catch {
    /* keep local snapshot */
  }
}

const initialMonth = seedMonth();

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categories: DEFAULT_CATEGORIES,
      monthlyBudget: 0,
      selectedMonth: initialMonth,
      yearBooks: {},
      ready: false,
      addTransaction: (input) => {
        set((state) => ({
          transactions: [
            {
              id: crypto.randomUUID(),
              type: input.type,
              amount: input.amount,
              categoryId: input.categoryId,
              note: input.note.trim(),
              date: input.date,
              accrued: Boolean(input.accrued),
            },
            ...state.transactions,
          ],
        }));
        queueSave();
      },
      updateTransaction: (id, input) => {
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
                  accrued: Boolean(input.accrued),
                }
              : tx,
          ),
        }));
        queueSave();
      },
      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        }));
        queueSave();
      },
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
        queueSave();
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
        queueSave();
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
        queueSave();
        return true;
      },
      setMonthlyBudget: (monthlyBudget) => {
        set({ monthlyBudget });
        queueSave();
      },
      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
      setOpeningCash: (year, amount) => {
        set((state) => {
          const key = String(year);
          const current = bookFor(state.yearBooks, year);
          return {
            yearBooks: {
              ...state.yearBooks,
              [key]: { ...current, openingCash: amount },
            },
          };
        });
        queueSave();
      },
      setAnnualBudget: (year, amount) => {
        set((state) => {
          const key = String(year);
          const current = bookFor(state.yearBooks, year);
          return {
            monthlyBudget: amount,
            yearBooks: {
              ...state.yearBooks,
              [key]: { ...current, annualBudget: amount },
            },
          };
        });
        queueSave();
      },
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
        queueSave();
        return id;
      },
      removeBalanceItem: (year, kind, id) => {
        set((state) => {
          const key = String(year);
          const current = bookFor(state.yearBooks, year);
          return {
            yearBooks: {
              ...state.yearBooks,
              [key]: { ...current, [kind]: current[kind].filter((item) => item.id !== id) },
            },
          };
        });
        queueSave();
      },
    }),
    {
      name: "saldo-budget-v1",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BudgetState> & {
          savingsGoal?: { target?: number };
        };
        const { savingsGoal, ready: _ready, ...rest } = p;
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
          ready: false,
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
    if (tx.accrued) continue;
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (tx.type === "income") income += amount;
    else if (tx.type === "expense") expense += amount;
  }
  return { income, expense, remaining: income - expense };
}

export function cashMovement(transactions: Transaction[]) {
  return monthTotals(transactions.filter((tx) => !tx.accrued));
}

export function accruedTotals(transactions: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (!tx.accrued) continue;
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (tx.type === "income") income += amount;
    else if (tx.type === "expense") expense += amount;
  }
  return { income, expense };
}

export function spendingByCategory(transactions: Transaction[]) {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    if (tx.accrued) continue;
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + amount);
  }
  return [...map.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}
