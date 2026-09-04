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

function mergeLedgers(
  base: { monthlyBudget: number; categories: Category[]; transactions: Transaction[]; yearBooks: Record<string, YearBook> },
  extra?: { monthlyBudget?: number; categories?: Category[]; transactions?: Transaction[]; yearBooks?: Record<string, YearBook> } | null,
) {
  const byId = new Map<string, Transaction>();
  for (const tx of base.transactions) {
    if (!deletedIds.has(tx.id) && tx.amount > 0) byId.set(tx.id, tx);
  }
  for (const tx of extra?.transactions ?? []) {
    if (!deletedIds.has(tx.id) && tx.amount > 0) byId.set(tx.id, tx);
  }
  return {
    monthlyBudget: extra?.monthlyBudget || base.monthlyBudget,
    categories:
      extra?.categories && extra.categories.length > 0
        ? extra.categories
        : base.categories.length > 0
          ? base.categories
          : DEFAULT_CATEGORIES,
    transactions: [...byId.values()],
    yearBooks: { ...base.yearBooks, ...(extra?.yearBooks ?? {}) },
  };
}

function replaceLedger(payload: {
  monthlyBudget: number;
  categories: Category[];
  transactions: Transaction[];
  yearBooks: Record<string, YearBook>;
  deletedIds?: string[];
}) {
  for (const id of payload.deletedIds ?? []) deletedIds.add(id);
  const transactions = payload.transactions.filter((tx) => !deletedIds.has(tx.id) && tx.amount > 0);
  const yearBooks = normalizeYearBooks(payload.yearBooks ?? {});

  // Never overwrite user-customised categories with DEFAULT_CATEGORIES from a
  // poll refresh. If the server returns DEFAULT_CATEGORIES (e.g. because a save
  // hadn't landed yet) but the local store already has custom categories, keep
  // the local ones. Custom = any category whose id/name differs from defaults.
  const defaultIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
  const incomingAreDefault =
    payload.categories.length === DEFAULT_CATEGORIES.length &&
    payload.categories.every((c) => defaultIds.has(c.id));
  const currentCategories = useBudgetStore.getState().categories;
  const currentAreCustom =
    currentCategories.length > 0 &&
    !(
      currentCategories.length === DEFAULT_CATEGORIES.length &&
      currentCategories.every((c) => defaultIds.has(c.id))
    );
  const categories =
    incomingAreDefault && currentAreCustom
      ? currentCategories
      : payload.categories.length > 0
        ? payload.categories
        : DEFAULT_CATEGORIES;

  useBudgetStore.setState({
    monthlyBudget: payload.monthlyBudget,
    categories,
    transactions,
    yearBooks,
    ready: true,
  });
  if (transactions.length > 0) {
    rememberLocalBackup(transactions, yearBooks, categories);
  }
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
  replaceLedger(payload);
}

function coerceAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const n = Number(value.replace(/\s/g, "").replace("kr", "").replace("SEK", "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  return 0;
}

function asTx(raw: unknown): Transaction | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const type = row.type === "income" || row.type === "expense" ? row.type : null;
  const amount = Math.abs(coerceAmount(row.amount ?? row.belopp));
  const date = String(row.date ?? "").slice(0, 10);
  if (!type || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {
    id: String(row.id ?? `${type}-${date}-${amount}`),
    type,
    amount,
    categoryId: String(row.categoryId ?? ""),
    note: String(row.note ?? ""),
    date,
    accrued: row.accrued === true || row.accrued === "true",
  };
}

function collectTransactions(value: unknown, into: Map<string, Transaction>) {
  if (!value) return;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        collectTransactions(JSON.parse(trimmed), into);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const tx = asTx(item);
      if (tx) into.set(tx.id, tx);
      else collectTransactions(item, into);
    }
    return;
  }
  if (typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectTransactions(nested, into);
    }
  }
}

function ledgerFromTransactions(
  transactions: Transaction[],
  extra?: Partial<{ monthlyBudget: number; categories: Category[]; yearBooks: Record<string, YearBook> }>,
) {
  if (transactions.length === 0) return null;
  return {
    monthlyBudget: extra?.monthlyBudget || 0,
    categories: extra?.categories && extra.categories.length > 0 ? extra.categories : DEFAULT_CATEGORIES,
    transactions,
    yearBooks: extra?.yearBooks ?? {},
  };
}

function readAllLocalLedgers() {
  if (typeof window === "undefined") return null;
  const found = new Map<string, Transaction>();
  let categories: Category[] | undefined;
  let yearBooks: Record<string, YearBook> | undefined;
  let monthlyBudget = 0;
  const inspect = (raw: string | null) => {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { state?: Record<string, unknown> } & Record<string, unknown>;
      const state = (parsed.state ?? parsed) as Record<string, unknown>;
      collectTransactions(parsed, found);
      if (Array.isArray(state.categories) && state.categories.length > 0) {
        categories = state.categories as Category[];
      }
      if (state.yearBooks && typeof state.yearBooks === "object") {
        yearBooks = normalizeYearBooks(state.yearBooks);
      }
      const budget = coerceAmount(state.monthlyBudget);
      if (budget > monthlyBudget) monthlyBudget = budget;
    } catch {
      collectTransactions(raw, found);
    }
  };
  inspect(window.localStorage.getItem("saldo-budget-v1"));
  inspect(window.localStorage.getItem("koholma-ledger-backup"));
  inspect(window.localStorage.getItem("koholma-ui-v1"));
  for (let i = 0; i < window.localStorage.length; i += 1) {
    inspect(window.localStorage.getItem(window.localStorage.key(i) ?? ""));
  }
  try {
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      inspect(window.sessionStorage.getItem(window.sessionStorage.key(i) ?? ""));
    }
  } catch {
    /* ignore */
  }
  return ledgerFromTransactions([...found.values()], { monthlyBudget, categories, yearBooks });
}

function rememberLocalBackup(transactions: Transaction[], yearBooks: Record<string, YearBook>, categories: Category[]) {
  if (typeof window === "undefined" || transactions.length === 0) return;
  try {
    window.localStorage.setItem(
      "koholma-ledger-backup",
      JSON.stringify({ transactions, yearBooks, categories, savedAt: Date.now() }),
    );
  } catch {
    /* ignore quota */
  }
}

let saveTimer = 0;
let savePending = false;
let saveGen = 0;
let hydratePromise: Promise<void> | null = null;
const deletedIds = new Set<string>();

/** Notify other tabs/windows that data changed so they refresh immediately. */
function broadcastDataChanged() {
  try {
    // localStorage storage events only fire in OTHER tabs, not the current one.
    window.localStorage.setItem("koholma-data-changed", String(Date.now()));
  } catch {
    /* ignore quota */
  }
}

function queueSave() {
  if (typeof window === "undefined") return;
  const state = useBudgetStore.getState();
  if (!state.ready) return;
  savePending = true;
  const gen = ++saveGen;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const snapshot = useBudgetStore.getState();
    if (!snapshot.ready || snapshot.transactions.length === 0) {
      savePending = false;
      return;
    }
    // Safety: always clear savePending after 10 s even if the request hangs,
    // so refreshSharedBudget() never stays blocked forever.
    const stuck = window.setTimeout(() => {
      if (gen === saveGen) savePending = false;
    }, 10000);
    void import("@/lib/save-with-session")
      .then(async ({ withSessionRetry }) => {
        const { saveBudget } = await import("@/lib/budget-fns");
        return withSessionRetry(() => saveBudget({ data: payloadFromState(snapshot) }));
      })
      .then((saved) => {
        if (gen !== saveGen) return;
        applyLedger(saved);
        broadcastDataChanged();
      })
      .catch((err) => console.error("budget save failed", err))
      .finally(() => {
        window.clearTimeout(stuck);
        if (gen === saveGen) savePending = false;
      });
  }, 400);
}

export async function hydrateSharedBudget(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const { loadBudget, saveBudget } = await import("@/lib/budget-fns");
    let lastError: unknown;
    const local = readAllLocalLedgers();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const remote = await loadBudget({ data: {} });
        if (remote.transactions.length > 0 || Object.keys(remote.yearBooks ?? {}).length > 0) {
          applyLedger(remote);
          return;
        }
        if (local) {
          applyLedger(local);
          const { withSessionRetry } = await import("@/lib/save-with-session");
          const saved = await withSessionRetry(() => saveBudget({ data: { ...local, deletedIds: [] } }));
          applyLedger(saved);
          broadcastDataChanged();
        } else {
          applyLedger(remote);
        }
        return;
      } catch (err) {
        lastError = err;
        await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
    // Reset so the next mount (e.g. after reconnect) can try again.
    hydratePromise = null;
    if (local) {
      applyLedger(local);
      return;
    }
    console.error("budget hydrate failed", lastError);
    useBudgetStore.setState({ ready: true });
  })();
  return hydratePromise;
}

export async function restoreLocalBudget(): Promise<number> {
  const recovered = readAllLocalLedgers();
  if (!recovered) return 0;
  applyLedger(recovered);
  try {
    const { saveBudget } = await import("@/lib/budget-fns");
    const saved = await saveBudget({ data: { ...recovered, deletedIds: [] } });
    if (saved.transactions.length > 0) applyLedger(saved);
  } catch (err) {
    console.error("restore save failed", err);
  }
  return useBudgetStore.getState().transactions.length;
}

export async function refreshSharedBudget(): Promise<void> {
  // Skip refresh while a local save is in flight to avoid overwriting
  // an optimistic UI update. But don't wait forever — savePending is
  // cleared by a 10-second safety timer in queueSave().
  if (savePending) return;
  try {
    const { loadBudget } = await import("@/lib/budget-fns");
    const remote = await loadBudget({ data: {} });
    // Still pending? A save started while we were fetching — discard to
    // avoid clobbering the user's latest write.
    if (savePending) return;
    if (remote.transactions.length === 0 && Object.keys(remote.yearBooks ?? {}).length === 0) return;
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
        const id = input.id?.trim() || crypto.randomUUID();
        set((state) => ({
          transactions: [
            {
              id,
              type: input.type,
              amount: input.amount,
              categoryId: input.categoryId,
              note: input.note.trim(),
              date: input.date,
              accrued: Boolean(input.accrued),
            },
            ...state.transactions.filter((tx) => tx.id !== id),
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
