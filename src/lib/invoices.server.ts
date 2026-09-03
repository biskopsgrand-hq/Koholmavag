import { getSql } from "@/lib/db";
import { getMyAccessForUserId } from "@/lib/access.server";
import { parseVatRate, type Invoice } from "@/lib/invoices";

const INVOICES_ID = "invoices";

async function requireApproved(userId: string): Promise<void> {
  const access = await getMyAccessForUserId(userId);
  if (access.status === "approved") return;
  const sql = await getSql();
  const rows = await sql<{ status: string }>`
    select status from access_members
    where user_id = ${userId} or lower(trim(email)) = ${access.email ?? ""}
    order by case status when 'approved' then 0 else 1 end
    limit 1
  `;
  if (rows[0]?.status === "approved") return;
  throw new Error("Forbidden");
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
    phone: String(row.phone ?? "").trim(),
    property: String(row.property ?? "").trim(),
    description: String(row.description ?? "").trim(),
    amount,
    qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
    vatRate: parseVatRate(row.vatRate),
    dueDate: String(row.dueDate ?? ""),
    issuedAt: String(row.issuedAt ?? new Date().toISOString()),
    paid: row.paid === true || row.paid === "true",
    paidAt: row.paidAt ? String(row.paidAt) : null,
    sentAt: row.sentAt ? String(row.sentAt) : null,
    year: Number(row.year) || new Date().getFullYear(),
  };
}

function parsePayload(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

export async function publishInvoice(invoice: Invoice): Promise<Invoice | null> {
  const next = asInvoice(invoice);
  if (!next) return null;
  const sql = await getSql();
  await sql.query(
    `insert into budget_ledger (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [`invoice:${next.id}`, JSON.stringify(next)],
  );
  return next;
}

export async function publishInvoicePdf(id: string, bytes: Uint8Array, filename: string): Promise<void> {
  const needle = String(id ?? "").trim();
  if (!needle || bytes.byteLength < 100) return;
  const sql = await getSql();
  await sql.query(
    `insert into budget_ledger (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [
      `invoice-pdf:${needle}`,
      JSON.stringify({
        filename,
        pdf: Buffer.from(bytes).toString("base64"),
      }),
    ],
  );
}

export async function findInvoicePdf(id: string): Promise<{ filename: string; bytes: Buffer } | null> {
  const needle = decodeURIComponent(String(id ?? "").trim());
  if (!needle) return null;
  const sql = await getSql();
  const rows = await sql.query<{ payload: unknown }>(
    `select payload from budget_ledger where id = $1 limit 1`,
    [`invoice-pdf:${needle}`],
  );
  const parsed = parsePayload(rows[0]?.payload);
  const data = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const pdf = String(data.pdf ?? "").trim();
  if (!pdf) return null;
  return {
    filename: String(data.filename ?? "faktura.pdf"),
    bytes: Buffer.from(pdf, "base64"),
  };
}

export async function findInvoiceById(id: string): Promise<Invoice | null> {
  const needle = decodeURIComponent(String(id ?? "").trim());
  if (!needle) return null;
  const sql = await getSql();
  const direct = await sql.query<{ payload: unknown }>(
    `select payload from budget_ledger where id = $1 limit 1`,
    [`invoice:${needle}`],
  );
  const published = asInvoice(parsePayload(direct[0]?.payload));
  if (published) return published;
  for (const rowId of [INVOICES_ID, "invoices-backup"]) {
    const rows = await sql.query<{ payload: unknown }>(
      `select payload from budget_ledger where id = $1 limit 1`,
      [rowId],
    );
    const parsed = parsePayload(rows[0]?.payload);
    const data = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const list = Array.isArray(data.invoices) ? data.invoices : Array.isArray(parsed) ? parsed : [];
    const hit = list.map(asInvoice).find((row): row is Invoice => row !== null && row.id === needle);
    if (hit) return hit;
  }
  return null;
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
  for (const invoice of next) {
    await publishInvoice(invoice);
  }
  return next;
}
