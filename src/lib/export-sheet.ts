/**
 * export-sheet.ts
 * Exports members, invoices and transactions to Excel (.xlsx) or CSV.
 * Uses the same SheetJS (xlsx) package already in the project.
 */

import type { AssociationMember } from "@/lib/members";
import type { Invoice } from "@/lib/invoices";
import type { Transaction } from "@/lib/budget-store";

// ─── helpers ────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoToSwedish(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

async function buildWorkbook(rows: Record<string, string | number | boolean>[], sheetName: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return { XLSX, wb };
}

// ─── Members ────────────────────────────────────────────────────────────────

export async function exportMembersXlsx(members: AssociationMember[], filename = "medlemmar.xlsx") {
  const rows = members.map((m) => ({
    Namn: m.name,
    Adress: m.address,
    Postnr: m.zip || m.postal || "",
    Postort: m.city || "",
    Fastighet: m.property,
    "E-post": m.email,
    Telefon: m.phone,
    Kundnummer: m.customerNo || "",
    Andel: m.share || 1,
    "Avgift (kr)": m.fee || "",
    Notering: m.note || "",
  }));
  const { XLSX, wb } = await buildWorkbook(rows, "Medlemmar");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  triggerDownload(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

export async function exportMembersCsv(members: AssociationMember[], filename = "medlemmar.csv") {
  const headers = ["Namn", "Adress", "Postnr", "Postort", "Fastighet", "E-post", "Telefon", "Kundnummer", "Andel", "Avgift (kr)", "Notering"];
  const lines = [
    headers.join(";"),
    ...members.map((m) =>
      [
        m.name,
        m.address,
        m.zip || m.postal || "",
        m.city || "",
        m.property,
        m.email,
        m.phone,
        m.customerNo || "",
        m.share || 1,
        m.fee || "",
        m.note || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    ),
  ];
  const bom = "\uFEFF"; // UTF-8 BOM so Excel opens it correctly
  triggerDownload(new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), filename);
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export async function exportInvoicesXlsx(invoices: Invoice[], filename = "fakturor.xlsx") {
  const rows = invoices.map((inv) => ({
    Fakturanr: inv.number,
    OCR: inv.ocr,
    Kundnummer: inv.customerNo,
    Namn: inv.name,
    Adress: inv.address,
    Postnr: inv.postal,
    "E-post": inv.email,
    Fastighet: inv.property,
    Beskrivning: inv.description,
    "Belopp (kr)": inv.amount,
    Antal: inv.qty,
    "Moms (%)": inv.vatRate,
    Förfallodag: isoToSwedish(inv.dueDate),
    Utfärdad: isoToSwedish(inv.issuedAt),
    Skickad: isoToSwedish(inv.sentAt),
    Betald: inv.paid ? "Ja" : "Nej",
    "Betald datum": isoToSwedish(inv.paidAt),
    År: inv.year,
  }));
  const { XLSX, wb } = await buildWorkbook(rows, "Fakturor");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  triggerDownload(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

export async function exportInvoicesCsv(invoices: Invoice[], filename = "fakturor.csv") {
  const headers = ["Fakturanr", "Namn", "E-post", "Fastighet", "Belopp (kr)", "Moms (%)", "Förfallodag", "Skickad", "Betald", "Betald datum"];
  const lines = [
    headers.join(";"),
    ...invoices.map((inv) =>
      [
        inv.number,
        inv.name,
        inv.email,
        inv.property,
        inv.amount,
        inv.vatRate,
        isoToSwedish(inv.dueDate),
        isoToSwedish(inv.sentAt),
        inv.paid ? "Ja" : "Nej",
        isoToSwedish(inv.paidAt),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    ),
  ];
  const bom = "\uFEFF";
  triggerDownload(new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), filename);
}

// ─── Transactions / Budget ───────────────────────────────────────────────────

export async function exportTransactionsXlsx(transactions: Transaction[], filename = "transaktioner.xlsx") {
  const rows = transactions.map((t) => ({
    Datum: isoToSwedish(t.date),
    Notering: t.note,
    Kategori: t.categoryId || "",
    "Belopp (kr)": t.amount,
    Typ: t.type === "income" ? "Inkomst" : "Utgift",
    År: t.date ? new Date(t.date).getFullYear() : "",
    Månad: t.date ? pad2(new Date(t.date).getMonth() + 1) : "",
    Periodiserad: t.accrued ? "Ja" : "Nej",
  }));
  const { XLSX, wb } = await buildWorkbook(rows, "Transaktioner");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  triggerDownload(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

export async function exportTransactionsCsv(transactions: Transaction[], filename = "transaktioner.csv") {
  const headers = ["Datum", "Notering", "Kategori", "Belopp (kr)", "Typ", "Periodiserad"];
  const lines = [
    headers.join(";"),
    ...transactions.map((t) =>
      [
        isoToSwedish(t.date),
        t.note,
        t.categoryId || "",
        t.amount,
        t.type === "income" ? "Inkomst" : "Utgift",
        t.accrued ? "Ja" : "Nej",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    ),
  ];
  const bom = "\uFEFF";
  triggerDownload(new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), filename);
}
