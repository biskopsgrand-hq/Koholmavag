import { getSql } from "@/lib/db";
import { getMyAccessForUserId } from "@/lib/access.server";
import { DEFAULT_CATEGORIES, type Category } from "@/lib/categories";
import type { Transaction, YearBook } from "@/lib/budget-store";
import type { BudgetPayload, LoadedBudget } from "@/lib/budget-types";

const LEDGER_ID = "shared";
const BACKUP_ID = "shared-backup";

const EMPTY_PAYLOAD: BudgetPayload = {
  monthlyBudget: 0,
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  yearBooks: {},
  deletedIds: [],
};

async function requireApproved(userId: string) {
  const access = await getMyAccessForUserId(userId);
  if (access.status === "approved") return access;
  const sql = await getSql();
  const rows = await sql<{ status: string }>`
    select status from access_members
    where user_id = ${userId} or lower(trim(email)) = ${access.email ?? ""}
    order by case status when 'approved' then 0 else 1 end
    limit 1
  `;
  if (rows[0]?.status === "approved") return access;
  throw new Error("Forbidden");
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const n = Number(value.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n) : fallback;
  }
  return fallback;
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
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
    accrued: row.accrued === true || row.accrued === "true",
  };
}

function parseYearBooks(raw: unknown): Record<string, YearBook> {
  const source = asRecord(raw);
  const books: Record<string, YearBook> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!/^\d{4}$/.test(key)) continue;
    const row = asRecord(value);
    books[key] = {
      openingCash: Math.max(0, asNumber(row.openingCash)),
      annualBudget: Math.max(0, asNumber(row.annualBudget)),
      assets: parseItems(row.assets),
      liabilities: parseItems(row.liabilities),
    };
  }
  return books;
}

function parseDeletedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.map((id) => String(id)).filter((id) => id.length > 0 && !id.startsWith("seed-"));
  return [...new Set(ids)].slice(0, 4000);
}

function parsePayload(raw: unknown): BudgetPayload {
  const data = asRecord(raw);
  const deletedIds = parseDeletedIds(data.deletedIds);
  const deleted = new Set(deletedIds);
  const transactions = Array.isArray(data.transactions)
    ? data.transactions
        .map(parseTransaction)
        .filter((tx): tx is Transaction => tx !== null && !deleted.has(tx.id))
    : [];
  return {
    monthlyBudget: Math.max(0, asNumber(data.monthlyBudget)),
    categories: Array.isArray(data.categories) && data.categories.length > 0
      ? (data.categories as Category[])
      : DEFAULT_CATEGORIES,
    transactions,
    yearBooks: parseYearBooks(data.yearBooks),
    deletedIds,
  };
}

function mergePayloads(base: BudgetPayload, incoming: BudgetPayload): BudgetPayload {
  const deletedIds = parseDeletedIds([...(base.deletedIds ?? []), ...(incoming.deletedIds ?? [])]);
  const deleted = new Set(deletedIds);
  const byId = new Map<string, Transaction>();
  for (const tx of base.transactions) {
    if (!deleted.has(tx.id)) byId.set(tx.id, tx);
  }
  for (const tx of incoming.transactions) {
    if (!deleted.has(tx.id)) byId.set(tx.id, tx);
  }
  return {
    monthlyBudget: incoming.monthlyBudget || base.monthlyBudget,
    categories: incoming.categories.length > 0 ? incoming.categories : base.categories,
    transactions: [...byId.values()],
    yearBooks: { ...base.yearBooks, ...incoming.yearBooks },
    deletedIds,
  };
}

export async function loadSharedBudget(userId: string): Promise<LoadedBudget> {
  await requireApproved(userId);
  const sql = await getSql();
  const rows = await sql<{ id: string; payload: unknown }>`
    select id, payload from budget_ledger where id in (${LEDGER_ID}, ${BACKUP_ID})
  `;
  const live = parsePayload(rows.find((row) => row.id === LEDGER_ID)?.payload);
  const backup = parsePayload(rows.find((row) => row.id === BACKUP_ID)?.payload);
  const best =
    live.transactions.length >= backup.transactions.length ? mergePayloads(backup, live) : mergePayloads(live, backup);
  return { ...best, existed: best.transactions.length > 0 };
}

export async function saveSharedBudget(userId: string, payload: BudgetPayload): Promise<BudgetPayload> {
  await requireApproved(userId);
  const incoming = parsePayload(payload);
  const sql = await getSql();
  const rows = await sql<{ id: string; payload: unknown }>`
    select id, payload from budget_ledger where id in (${LEDGER_ID}, ${BACKUP_ID})
  `;
  const existing = parsePayload(rows.find((row) => row.id === LEDGER_ID)?.payload);
  const backup = parsePayload(rows.find((row) => row.id === BACKUP_ID)?.payload);
  const richest =
    existing.transactions.length >= backup.transactions.length ? existing : backup;
  if (incoming.transactions.length === 0 && richest.transactions.length > 0) {
    return richest;
  }
  const next = richest.transactions.length > 0 ? mergePayloads(richest, incoming) : incoming;
  if (next.transactions.length === 0) {
    return richest.transactions.length > 0 ? richest : next;
  }
  if (existing.transactions.length >= backup.transactions.length && existing.transactions.length > 0) {
    await sql.query(
      `insert into budget_ledger (id, payload, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
      [BACKUP_ID, JSON.stringify(existing)],
    );
  }
  await sql.query(
    `insert into budget_ledger (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [LEDGER_ID, JSON.stringify(next)],
  );
  return next;
}
