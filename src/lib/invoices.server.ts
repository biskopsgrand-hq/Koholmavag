import { getSql } from "@/lib/db";
import { getMyAccessForUserId } from "@/lib/access.server";
import { parseVatRate, type Invoice } from "@/lib/invoices";

const INVOICES_ID = "invoices";

async function requireApproved(userId: string): Promise<void> {
  const access = await getMyAccessForUserId(userId);
  if (access.status !== "approved") throw new Error("Forbidden");
}

function asInvoice(raw: unknown): Invoice | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? "").trim();
  const amount = Math.round(Number(row.amount) || 0);
  if (!name || amount <= 0) return null;
  const qty = Number(row.qty);
  return {
    id: String(row.id ?? crypto.randomUUID()),
    number: String(row.number ?? "").trim() || "1",
    ocr: String(row.ocr ?? row.number ?? "").trim(),
    customerNo: String(row.customerNo ?? "").trim(),
    memberId: row.memberId ? String(row.memberId) : null,
    name,
    address: String(row.address ?? "").trim(),
    postal: String(row.postal ?? "").trim(),
    email: String(row.email ?? "").trim().toLowerCase(),
    property: String(row.property ?? "").trim(),
    description: String(row.description ?? "").trim(),
    amount,
    qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
    vatRate: parseVatRate(row.vatRate),
    dueDate: String(row.dueDate ?? ""),
    issuedAt: String(row.issuedAt ?? new Date().toISOString()),
    paid: row.paid === true || row.paid === "true",
    paidAt: row.paidAt ? String(row.paidAt) : null,
    year: Number(row.year) || new Date().getFullYear(),
  };
}

export async function loadInvoices(userId: string): Promise<Invoice[]> {
  await requireApproved(userId);
  const sql = await getSql();
  const rows = await sql.query<{ payload: unknown }>(
    `select payload from budget_ledger where id = $1 limit 1`,
    [INVOICES_ID],
  );
  let parsed: unknown = rows[0]?.payload;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = {};
    }
  }
  const data = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const list = Array.isArray(data.invoices) ? data.invoices : Array.isArray(parsed) ? parsed : [];
  return list.map(asInvoice).filter((row): row is Invoice => row !== null);
}

export async function saveInvoices(userId: string, invoices: Invoice[]): Promise<Invoice[]> {
  await requireApproved(userId);
  const next = invoices.map(asInvoice).filter((row): row is Invoice => row !== null);
  const existing = await loadInvoices(userId);
  if (existing.length > 0 && next.length === 0) return existing;
  const sql = await getSql();
  if (existing.length > 0) {
    await sql.query(
      `insert into budget_ledger (id, payload, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
      ["invoices-backup", JSON.stringify({ invoices: existing })],
    );
  }
  await sql.query(
    `insert into budget_ledger (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [INVOICES_ID, JSON.stringify({ invoices: next })],
  );
  return next;
}
