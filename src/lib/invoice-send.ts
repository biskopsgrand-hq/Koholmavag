import { getBearerToken } from "@/lib/auth/client";
import type { Invoice } from "@/lib/invoices";

const PENDING_KEY = "koholma-pending-invoice";

export function rememberPendingInvoice(invoice: Invoice) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(invoice));
  } catch {
    /* ignore */
  }
}

export function takePendingInvoice(): Invoice | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);
    return JSON.parse(raw) as Invoice;
  } catch {
    return null;
  }
}

export async function postInvoiceMail(invoice: Invoice): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getBearerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch("/api/skicka-faktura", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(invoice),
  });
  if (response.status === 401) throw new Error("Unauthorized");
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || "Kunde inte skicka mejlet.");
}
