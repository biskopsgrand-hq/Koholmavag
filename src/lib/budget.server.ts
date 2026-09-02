import { getSql } from "@/lib/db";
import { getMyAccessForUserId } from "@/lib/access.server";
import { DEFAULT_CATEGORIES, type Category } from "@/lib/categories";
import type { Transaction, YearBook } from "@/lib/budget-store";
import type { BudgetPayload, LoadedBudget } from "@/lib/budget-types";

const LEDGER_ID = "shared";

const EMPTY_PAYLOAD: BudgetPayload = {
  monthlyBudget: 0,
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  yearBooks: {},
};

async function requireApproved(userId: string): Promise<void> {
  const access = await getMyAccessForUserId(userId);
  if (access.status !== "approved") throw new Error("Forbidden");
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseItems(raw: unknown): { id: string; name: string; amount: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const amount = asNumber(row.amount);
    const name = String(row.name ?? "").trim();
    if (!name || amount <= 0) return [];
    return [{ id: String(row.id ?? `${name}-${amount}`), name, amount }];
  });
}

function parseTransaction(raw: unknown): Transaction | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const type = row.type === "income" || row.type === "expense" ? row.type : null;
  const amount = asNumber(row.amount);
  const date = String(row.date ?? "").slice(0, 10);
  if (!type || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {
    id: String(row.id ?? `${type}-${date}-${amount}`),
    type,
    amount,
    categoryId: String(row.categoryId ?? ""),
    note: String(row.note ?? ""),
    date,
    accrued: Boolean(row.accrued),
  };
}

function parseYearBooks(raw: unknown): Record<string, YearBook> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const books: Record<string, YearBook> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}$/.test(key)) continue;
    const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    books[key] = {
      openingCash: Math.max(0, asNumber(row.openingCash)),
      assets: parseItems(row.assets),
      liabilities: parseItems(row.liabilities),
    };
  }
  return books;
}

function parsePayload(raw: unknown): BudgetPayload {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const transactions = Array.isArray(data.transactions)
    ? data.transactions.map(parseTransaction).filter((tx): tx is Transaction => tx !== null)
    : [];
  return {
    monthlyBudget: Math.max(0, asNumber(data.monthlyBudget)),
    categories: Array.isArray(data.categories) && data.categories.length > 0
      ? (data.categories as Category[])
      : DEFAULT_CATEGORIES,
    transactions,
    yearBooks: parseYearBooks(data.yearBooks),
  };
}

export async function loadSharedBudget(userId: string): Promise<LoadedBudget> {
  await requireApproved(userId);
  const sql = await getSql();
  const rows = await sql<{ payload: unknown }>`
    select payload from budget_ledger where id = ${LEDGER_ID} limit 1
  `;
  if (!rows[0]) return { ...EMPTY_PAYLOAD, existed: false };
  return { ...parsePayload(rows[0].payload), existed: true };
}

export async function saveSharedBudget(userId: string, payload: BudgetPayload): Promise<BudgetPayload> {
  await requireApproved(userId);
  const next = parsePayload(payload);
  const sql = await getSql();
  await sql.query(
    `insert into budget_ledger (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [LEDGER_ID, JSON.stringify(next)],
  );
  return next;
}
