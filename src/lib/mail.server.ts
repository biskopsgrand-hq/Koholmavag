import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";
import { getSql } from "@/lib/db";
import { getMyAccessForUserId } from "@/lib/access.server";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { invoiceBodyText, invoiceMailSubject, invoicePdfUrl, type Invoice } from "@/lib/invoices";
import { SELLER } from "@/lib/seller";

const SETTINGS_ID = "mail-smtp";

type MailSettings = { pass: string; from: string; sendToken: string };

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

function newSendToken(): string {
  return `kv-${crypto.randomUUID().replaceAll("-", "")}`;
}

function passVariants(raw: string): string[] {
  const trimmed = String(raw ?? "").trim();
  const compact = trimmed.replace(/\s+/g, "");
  const spaced = compact.length === 16 ? compact.replace(/(.{4})/g, "$1 ").trim() : "";
  return [...new Set([compact, trimmed, spaced].filter((value) => value.length >= 8))];
}

function smtpError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err ?? "Kunde inte skicka.");
  if (/invalid login|username and password|badcredentials|eauth|application-specific password/i.test(message)) {
    return new Error(
      "Gmail tog inte emot lösenordet. Det ska vara ett app-lösenord (16 bokstäver) skapat inloggad som koholmavagen@gmail.com — inte webb-lösenordet. Skapa ett nytt på myaccount.google.com/apppasswords och spara det under Fakturauppgifter.",
    );
  }
  if (/quota|daily.*limit|user sending/i.test(message)) {
    return new Error("Gmail har nått utskicksgränsen för idag.");
  }
  return new Error(message.replace(/pass(word)?[=:].*/gi, "").trim() || "Kunde inte skicka mejlet.");
}

function smtpTransport(pass: string, port: 465 | 587) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: SELLER.email, pass },
  });
}

async function sendWithPass(pass: string, mail: SendMailOptions) {
  let last: unknown;
  for (const variant of passVariants(pass)) {
    for (const port of [465, 587] as const) {
      try {
        const info = await smtpTransport(variant, port).sendMail(mail);
        if (info.messageId) return info;
        last = new Error("Gmail svarade inte på utskicket.");
      } catch (err) {
        last = err;
      }
    }
  }
  throw smtpError(last);
}

async function verifyPass(pass: string): Promise<boolean> {
  for (const variant of passVariants(pass)) {
    for (const port of [465, 587] as const) {
      try {
        await smtpTransport(variant, port).verify();
        return true;
      } catch {
        /* try next */
      }
    }
  }
  return false;
}

async function readSettings(): Promise<MailSettings> {
  const envPass = cleanPass(process.env.GMAIL_APP_PASSWORD ?? process.env.SMTP_PASS ?? "");
  const sql = await getSql();
  for (const rowId of [SETTINGS_ID, "mail-smtp-backup"]) {
    const rows = await sql.query<{ payload: unknown }>(
      `select payload from budget_ledger where id = $1 limit 1`,
      [rowId],
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
    const pass = envPass || cleanPass(String(data.pass ?? data.password ?? ""));
    const sendToken = String(data.sendToken ?? "").trim();
    if (pass || sendToken) {
      return { pass, from: SELLER.email, sendToken };
    }
  }
  return { pass: envPass, from: SELLER.email, sendToken: "" };
}

async function writeSettings(settings: MailSettings): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into budget_ledger (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [SETTINGS_ID, JSON.stringify(settings)],
  );
}

export async function mailConfigured(userId: string): Promise<{ configured: boolean; from: string; sendToken: string }> {
  await requireApproved(userId);
  const settings = await readSettings();
  if (settings.pass && !settings.sendToken) {
    settings.sendToken = newSendToken();
    await writeSettings(settings);
  }
  return { configured: settings.pass.length > 0, from: SELLER.email, sendToken: settings.sendToken };
}

export async function saveMailPassword(_userId: string, pass: string): Promise<{ configured: boolean; from: string; sendToken: string }> {
  const next = cleanPass(pass);
  if (next.length < 8) throw new Error("Lösenordet är för kort.");
  const previous = await readSettings();
  const settings: MailSettings = {
    pass: next,
    from: SELLER.email,
    sendToken: previous.sendToken || newSendToken(),
  };
  await writeSettings(settings);
  await writeBackup(settings);
  const ok = await verifyPass(next);
  if (!ok) {
    throw new Error(
      "Gmail tog inte emot lösenordet. Logga in som koholmavagen@gmail.com, skapa ett nytt app-lösenord (16 bokstäver) på myaccount.google.com/apppasswords och klistra in det här. Inte webb-lösenordet.",
    );
  }
  return { configured: true, from: SELLER.email, sendToken: settings.sendToken };
}

async function writeBackup(settings: MailSettings) {
  const sql = await getSql();
  await sql.query(
    `insert into budget_ledger (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    ["mail-smtp-backup", JSON.stringify(settings)],
  );
}

export async function sendAllowed(sendToken: string | null | undefined): Promise<boolean> {
  const token = String(sendToken ?? "").trim();
  if (!token) return false;
  const settings = await readSettings();
  return Boolean(settings.sendToken) && settings.sendToken === token;
}

export async function sendInvoiceWithPdf(
  _userId: string | null,
  invoice: Invoice,
  smtpPass?: string | null,
): Promise<{ ok: true }> {
  if (!invoice.email.includes("@")) throw new Error("Fakturan saknar e-post.");
  if (!invoice.name.trim() || invoice.amount <= 0) throw new Error("Ange person och belopp.");
  const settings = await readSettings();
  const pass = String(smtpPass ?? "").trim() || settings.pass;
  if (!pass) {
    throw new Error("Ange Gmail-app-lösenord under Fakturauppgifter och tryck Spara lösenord.");
  }
  if (pass && pass !== settings.pass) {
    await writeSettings({ pass, from: SELLER.email, sendToken: settings.sendToken || newSendToken() });
    await writeBackup({ pass, from: SELLER.email, sendToken: settings.sendToken || newSendToken() });
  }
  const { publishInvoice, publishInvoicePdf } = await import("@/lib/invoices.server");
  await publishInvoice(invoice);
  const pdf = await buildInvoicePdf(invoice);
  const bytes = Buffer.from(pdf);
  if (bytes.length < 1000 || bytes.subarray(0, 4).toString() !== "%PDF") {
    throw new Error("PDF:en kunde inte skapas.");
  }
  const filename = `Faktura-${invoice.number.replace(/[^\w.-]+/g, "-")}.pdf`;
  await publishInvoicePdf(invoice.id, bytes, filename);
  const pdfUrl = invoicePdfUrl(invoice);
  const body = [
    invoiceBodyText(invoice),
    "",
    "PDF-fakturan är bifogad detta mejl.",
    "Om filen saknas, öppna fakturan här:",
    pdfUrl,
    "",
    "Med vänlig hälsning",
    SELLER.name,
    SELLER.email,
  ].join("\n");
  await sendWithPass(pass, {
    from: `"${SELLER.name}" <${SELLER.email}>`,
    to: invoice.email,
    replyTo: SELLER.email,
    subject: `${invoiceMailSubject(invoice)} · ${invoice.name} · ${Date.now().toString().slice(-6)}`,
    text: body,
    attachments: [{ filename, content: bytes, contentType: "application/pdf" }],
  });
  return { ok: true };
}
