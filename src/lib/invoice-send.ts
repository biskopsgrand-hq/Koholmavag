import { getBearerToken } from "@/lib/auth/client";
import type { Invoice } from "@/lib/invoices";

const SEND_TOKEN_KEY = "koholma-send-token";
const MAIL_PASS_KEY = "koholma-gmail-pass";

export function rememberSendToken(token: string | null | undefined) {
  if (!token || typeof window === "undefined") return;
  try {
    localStorage.setItem(SEND_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function readSendToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(SEND_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberMailPass(pass: string) {
  const next = pass.replace(/\s+/g, "").trim();
  if (typeof window === "undefined" || next.length < 8) return;
  try {
    localStorage.setItem(MAIL_PASS_KEY, next);
  } catch {
    /* ignore */
  }
}

export function readMailPass(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(MAIL_PASS_KEY) ?? "").replace(/\s+/g, "").trim();
  } catch {
    return "";
  }
}

function mailHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extra };
  const bearer = getBearerToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const sendToken = readSendToken();
  if (sendToken) headers["X-Send-Token"] = sendToken;
  const pass = readMailPass();
  if (pass) headers["X-Smtp-Pass"] = pass;
  return headers;
}

export async function postMailPassword(pass: string): Promise<{ configured: boolean; sendToken?: string }> {
  rememberMailPass(pass);
  const response = await fetch("/api/mail-losenord", {
    method: "POST",
    credentials: "include",
    headers: mailHeaders(),
    body: JSON.stringify({ pass }),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; sendToken?: string; configured?: boolean };
  if (data.sendToken) rememberSendToken(data.sendToken);
  if (!response.ok && !readMailPass()) throw new Error(data.error || "Kunde inte spara lösenordet.");
  return { configured: true, sendToken: data.sendToken };
}

export async function postInvoiceMail(invoice: Invoice): Promise<void> {
  if (!readMailPass() && !readSendToken()) {
    throw new Error("Ange Gmail-app-lösenord under Fakturauppgifter och tryck Spara lösenord.");
  }
  const response = await fetch("/api/skicka-faktura", {
    method: "POST",
    credentials: "include",
    headers: mailHeaders(),
    body: JSON.stringify(invoice),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || "Kunde inte skicka mejlet.");
}
