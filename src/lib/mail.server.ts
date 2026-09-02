import nodemailer from "nodemailer";
import { getSql } from "@/lib/db";
import { getMyAccessForUserId } from "@/lib/access.server";
import { buildInvoicePdf, invoiceFileName } from "@/lib/invoice-pdf";
import { invoiceBodyText, invoiceMailSubject, type Invoice } from "@/lib/invoices";
import { SELLER } from "@/lib/seller";

const SETTINGS_ID = "mail-smtp";

async function requireApproved(userId: string) {
  try {
    const access = await getMyAccessForUserId(userId);
    if (access.status === "denied") throw new Error("Forbidden");
    return access;
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") throw err;
    return { status: "approved" as const, email: null };
  }
}

function cleanPass(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function smtpError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err ?? "Kunde inte skicka.");
  if (/invalid login|username and password|badcredentials|eauth/i.test(message)) {
    return new Error("Gmail avvisade lösenordet. Spara app-lösenordet igen under Fakturauppgifter.");
  }
  if (/quota|daily.*limit|user sending/i.test(message)) {
    return new Error("Gmail har nått utskicksgränsen för idag.");
  }
  if (/unauthor|forbidden/i.test(message)) {
    return new Error("Inloggningen släppte. Ladda om sidan och skicka igen.");
  }
  return new Error(message.replace(/pass(word)?[=:].*/gi, "").trim() || "Kunde inte skicka mejlet.");
}

function transporter(pass: string) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: SELLER.email, pass },
  });
}

async function readPass(): Promise<string> {
  const envPass = cleanPass(process.env.GMAIL_APP_PASSWORD ?? process.env.SMTP_PASS ?? "");
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
  return cleanPass(String(data.pass ?? data.password ?? ""));
}

export async function mailConfigured(userId: string): Promise<{ configured: boolean; from: string }> {
  await requireApproved(userId);
  const pass = await readPass();
  return { configured: pass.length > 0, from: SELLER.email };
}

export async function saveMailPassword(userId: string, pass: string): Promise<{ configured: boolean; from: string }> {
  await requireApproved(userId);
  const next = cleanPass(pass);
  if (next.length < 8) throw new Error("Lösenordet är för kort.");
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
  const copy = Buffer.from(pdf);
  const body = `${invoiceBodyText(invoice)}\n\nFakturan är bifogad som PDF.\n\nMed vänlig hälsning\n${SELLER.name}\n${SELLER.email}`;
  const mail = {
    from: `"${SELLER.name}" <${SELLER.email}>`,
    to: invoice.email,
    replyTo: SELLER.email,
    subject: `${invoiceMailSubject(invoice)} · ${invoice.id.slice(0, 8)}`,
    text: body,
    messageId: `<faktura-${invoice.id}-${Date.now()}@koholmavagen>`,
    headers: { "X-Koholma-Invoice": invoice.id },
    attachments: [
      {
        filename: invoiceFileName(invoice),
        content: copy,
        contentType: "application/pdf",
      },
    ],
  };
  try {
    await transporter(pass).sendMail(mail);
  } catch (err) {
    try {
      await nodemailer
        .createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: { user: SELLER.email, pass },
        })
        .sendMail(mail);
    } catch (retryErr) {
      throw smtpError(retryErr);
    }
  }
  return { ok: true };
}
