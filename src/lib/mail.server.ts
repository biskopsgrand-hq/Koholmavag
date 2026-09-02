import nodemailer from "nodemailer";
import { getSql } from "@/lib/db";
import { getMyAccessForUserId } from "@/lib/access.server";
import { isOwnerEmail } from "@/lib/access";
import { buildInvoicePdf, invoiceFileName } from "@/lib/invoice-pdf";
import { invoiceBodyText, invoiceMailSubject, type Invoice } from "@/lib/invoices";
import { SELLER } from "@/lib/seller";

const SETTINGS_ID = "mail-smtp";

async function requireApproved(userId: string) {
  const access = await getMyAccessForUserId(userId);
  if (access.status !== "approved") throw new Error("Forbidden");
  return access;
}

async function readPass(): Promise<string> {
  const envPass = process.env.GMAIL_APP_PASSWORD?.trim() || process.env.SMTP_PASS?.trim();
  if (envPass) return envPass;
  const sql = await getSql();
  const rows = await sql.query<{ payload: unknown }>(
    `select payload from budget_ledger where id = $1 limit 1`,
    [SETTINGS_ID],
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
  return String(data.pass ?? data.password ?? "").trim();
}

export async function mailConfigured(userId: string): Promise<{ configured: boolean; from: string }> {
  await requireApproved(userId);
  const pass = await readPass();
  return { configured: pass.length > 0, from: SELLER.email };
}

export async function saveMailPassword(userId: string, pass: string): Promise<{ configured: boolean; from: string }> {
  const access = await requireApproved(userId);
  if (!isOwnerEmail(access.email)) throw new Error("Forbidden");
  const next = pass.trim();
  const sql = await getSql();
  await sql.query(
    `insert into budget_ledger (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [SETTINGS_ID, JSON.stringify({ pass: next, from: SELLER.email })],
  );
  return { configured: next.length > 0, from: SELLER.email };
}

export async function sendInvoiceWithPdf(userId: string, invoice: Invoice): Promise<{ ok: true }> {
  await requireApproved(userId);
  if (!invoice.email.includes("@")) throw new Error("Fakturan saknar e-post.");
  if (!invoice.name.trim() || invoice.amount <= 0) throw new Error("Ange person och belopp.");
  const pass = await readPass();
  if (!pass) {
    throw new Error("Ange Gmail-app-lösenord under Fakturauppgifter för att skicka med PDF.");
  }
  const pdf = await buildInvoicePdf(invoice);
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: SELLER.email, pass },
  });
  await transporter.sendMail({
    from: `"${SELLER.name}" <${SELLER.email}>`,
    to: invoice.email,
    replyTo: SELLER.email,
    subject: invoiceMailSubject(invoice),
    text: `${invoiceBodyText(invoice)}\n\nFakturan är bifogad som PDF.\n\nMed vänlig hälsning\n${SELLER.name}\n${SELLER.email}`,
    attachments: [
      {
        filename: invoiceFileName(invoice),
        content: Buffer.from(pdf),
        contentType: "application/pdf",
      },
    ],
  });
  return { ok: true };
}
