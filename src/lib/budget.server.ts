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

function parsePayload(raw: unknown): BudgetPayload {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    monthlyBudget: Math.max(0, asNumber(data.monthlyBudget)),
    categories: Array.isArray(data.categories) && data.categories.length > 0
      ? (data.categories as Category[])
      : DEFAULT_CATEGORIES,
    transactions: Array.isArray(data.transactions) ? (data.transactions as Transaction[]) : [],
    yearBooks:
      data.yearBooks && typeof data.yearBooks === "object" && !Array.isArray(data.yearBooks)
        ? (data.yearBooks as Record<string, YearBook>)
        : {},
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
