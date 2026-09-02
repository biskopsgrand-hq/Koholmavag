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

function normalizeBook(book?: Partial<YearBook> | null): YearBook {
  return {
    openingCash: Number(book?.openingCash) || 0,
    annualBudget: Number(book?.annualBudget) || 0,
    assets: Array.isArray(book?.assets) ? book.assets : [],
    liabilities: Array.isArray(book?.liabilities) ? book.liabilities : [],
  };
}

function bookFor(books: Record<string, YearBook>, year: number): YearBook {
  return normalizeBook(books[String(year)]);
}

function normalizeYearBooks(books: unknown): Record<string, YearBook> {
  if (!books || typeof books !== "object" || Array.isArray(books)) return {};
  const next: Record<string, YearBook> = {};
  for (const [year, book] of Object.entries(books as Record<string, YearBook>)) {
    next[year] = normalizeBook(book);
  }
  return next;
}

function payloadFromState(state: Pick<BudgetState, "monthlyBudget" | "categories" | "transactions" | "yearBooks">) {
  return {
    monthlyBudget: state.monthlyBudget,
    categories: state.categories,
    transactions: state.transactions,
    yearBooks: state.yearBooks,
    deletedIds: [...deletedIds],
  };
}

function applyLedger(
  payload: {
    monthlyBudget: number;
    categories: Category[];
    transactions: Transaction[];
    yearBooks: Record<string, YearBook>;
    deletedIds?: string[];
  },
) {
  const current = useBudgetStore.getState();
  const transactions = payload.transactions.filter((tx) => !deletedIds.has(tx.id) && tx.amount > 0);
  if (transactions.length === 0 && current.transactions.length > 0) return;
  for (const id of payload.deletedIds ?? []) deletedIds.add(id);
  useBudgetStore.setState({
    monthlyBudget: payload.monthlyBudget,
    categories: payload.categories.length > 0 ? payload.categories : DEFAULT_CATEGORIES,
    transactions,
    yearBooks: Object.keys(payload.yearBooks).length > 0
      ? normalizeYearBooks(payload.yearBooks)
      : current.yearBooks,
    ready: true,
  });
}

function readLegacyLocal(): {
  monthlyBudget: number;
  categories: Category[];
  transactions: Transaction[];
  yearBooks: Record<string, YearBook>;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("saldo-budget-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> } & Record<string, unknown>;
    const state = (parsed.state ?? parsed) as Record<string, unknown>;
    const transactions = Array.isArray(state.transactions)
      ? state.transactions.filter(
          (tx): tx is Transaction =>
            Boolean(tx) &&
            typeof tx === "object" &&
            Number((tx as Transaction).amount) > 0 &&
            ((tx as Transaction).type === "income" || (tx as Transaction).type === "expense"),
        )
      : [];
    if (transactions.length === 0) return null;
    return {
      monthlyBudget: Number(state.monthlyBudget) || 0,
      categories: Array.isArray(state.categories) && state.categories.length > 0
        ? (state.categories as Category[])
        : DEFAULT_CATEGORIES,
      transactions: transactions.map((tx) => ({
        ...tx,
        amount: Math.round(Number(tx.amount)),
        accrued: tx.accrued === true,
      })),
      yearBooks: normalizeYearBooks(state.yearBooks),
    };
  } catch {
    return null;
  }
}

let saveTimer = 0;
let savePending = false;
let saveGen = 0;
let hydratePromise: Promise<void> | null = null;
const deletedIds = new Set<string>();

function queueSave() {
  if (typeof window === "undefined") return;
  const state = useBudgetStore.getState();
  if (!state.ready) return;
  savePending = true;
  const gen = ++saveGen;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const snapshot = useBudgetStore.getState();
    if (!snapshot.ready) {
      savePending = false;
      return;
    }
    void import("@/lib/budget-fns")
      .then(({ saveBudget }) => saveBudget({ data: payloadFromState(snapshot) }))
      .then((saved) => {
        if (gen !== saveGen) return;
        applyLedger(saved);
      })
      .catch((err) => console.error("budget save failed", err))
      .finally(() => {
        if (gen === saveGen) savePending = false;
      });
  }, 400);
}

export async function hydrateSharedBudget(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const { loadBudget } = await import("@/lib/budget-fns");
    let lastError: unknown;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const remote = await loadBudget({ data: {} });
        if (remote.transactions.length > 0) {
          applyLedger(remote);
          return;
        }
        const recovered = readLegacyLocal();
        if (recovered) {
          applyLedger(recovered);
          const { saveBudget } = await import("@/lib/budget-fns");
          const saved = await saveBudget({ data: { ...recovered, deletedIds: [] } });
          applyLedger(saved);
          return;
        }
        applyLedger(remote);
        return;
      } catch (err) {
        lastError = err;
        await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
    const recovered = readLegacyLocal();
    if (recovered) {
      applyLedger(recovered);
      return;
    }
    console.error("budget hydrate failed", lastError);
    useBudgetStore.setState({ ready: true });
  })();
  return hydratePromise;
}

export async function refreshSharedBudget(): Promise<void> {
  if (savePending) return;
  try {
    const { loadBudget } = await import("@/lib/budget-fns");
    const remote = await loadBudget({ data: {} });
    if (savePending) return;
    if (remote.transactions.length === 0) return;
    applyLedger(remote);
  } catch {
    /* keep current snapshot until next refresh */
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
        deletedIds.add(id);
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
      name: "koholma-ui-v1",
      partialize: (state) => ({ selectedMonth: state.selectedMonth }),
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
