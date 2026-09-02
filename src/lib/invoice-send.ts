import { getBearerToken } from "@/lib/auth/client";
import type { Invoice } from "@/lib/invoices";

const SEND_TOKEN_KEY = "koholma-send-token";

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

export async function postInvoiceMail(invoice: Invoice): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const bearer = getBearerToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const sendToken = readSendToken();
  if (sendToken) headers["X-Send-Token"] = sendToken;
  const response = await fetch("/api/skicka-faktura", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(invoice),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || "Kunde inte skicka mejlet.");
}
