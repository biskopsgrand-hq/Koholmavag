import { formatIsoDate, formatMoney } from "@/lib/format";
import { memberFee, type AssociationMember, type MemberRegister } from "@/lib/members";
import { SELLER } from "@/lib/seller";

export const VAT_RATES = [0, 12, 25] as const;
export type VatRate = (typeof VAT_RATES)[number];

export type Invoice = {
  id: string;
  number: string;
  ocr: string;
  customerNo: string;
  memberId: string | null;
  name: string;
  address: string;
  postal: string;
  email: string;
  phone: string;
  property: string;
  description: string;
  amount: number;
  qty: number;
  vatRate: VatRate;
  dueDate: string;
  issuedAt: string;
  paid: boolean;
  paidAt: string | null;
  year: number;
};

export function parseVatRate(value: unknown): VatRate {
  const n = Number(value);
  if (n === 12 || n === 25) return n;
  return 0;
}

export function invoiceTotals(invoice: Pick<Invoice, "amount" | "vatRate" | "qty">) {
  const qty = invoice.qty > 0 ? invoice.qty : 1;
  const net = Math.max(0, Math.round(invoice.amount * qty));
  const vat = Math.round(net * invoice.vatRate / 100);
  return { qty, unit: Math.round(invoice.amount), net, vat, total: net + vat };
}

function seqFromNumber(number: unknown): number {
  const text = String(number ?? "").trim();
  if (/^\d+$/.test(text)) return Number(text);
  const last = text.split("-").at(-1);
  return Number(last) || 0;
}

export function nextInvoiceNumber(invoices: Invoice[]): string {
  let max = 0;
  for (const invoice of invoices) {
    const seq = seqFromNumber(invoice.number);
    if (seq > max) max = seq;
  }
  return String(max + 1);
}

export function nextCustomerNo(invoices: Invoice[], members: AssociationMember[]): string {
  let max = 0;
  for (const invoice of invoices) {
    const n = Number(invoice.customerNo);
    if (Number.isFinite(n) && n > max) max = n;
  }
  for (const member of members) {
    const n = Number(member.customerNo);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

export function makeOcr(number: string, customerNo: string): string {
  const digits = `${number.replace(/\D/g, "")}${customerNo.replace(/\D/g, "")}`;
  return digits || number;
}

export function dueInDays(issuedAt: string, days = 30): string {
  const date = new Date(issuedAt.slice(0, 10) || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function splitAddress(address: string): { street: string; postal: string } {
  const lines = address
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean);
  const postal = lines.find((line) => /^\d{3}\s?\d{2}/.test(line)) ?? "";
  const street = lines.filter((line) => line !== postal).join(", ");
  return { street, postal };
}

export function invoiceFromMember(
  member: AssociationMember,
  register: MemberRegister,
  year: number,
  number: string,
  customerNo: string,
): Invoice {
  const issuedAt = new Date().toISOString();
  const parsed = splitAddress(member.address);
  return {
    id: crypto.randomUUID(),
    number,
    ocr: makeOcr(number, member.customerNo || customerNo),
    customerNo: member.customerNo || customerNo,
    memberId: member.id,
    name: member.name,
    address: parsed.street || member.address,
    postal: member.postal || [member.zip, member.city].filter(Boolean).join(" ") || parsed.postal,
    email: member.email,
    phone: member.phone,
    property: member.property,
    description: SELLER.itemName,
    amount: memberFee(member, register.defaultFee),
    qty: 1,
    vatRate: 0,
    dueDate: register.dueDate || dueInDays(issuedAt),
    issuedAt,
    paid: false,
    paidAt: null,
    year,
  };
}

export function invoiceBodyText(invoice: Invoice): string {
  const { net, vat, total } = invoiceTotals(invoice);
  return [
    `Faktura ${invoice.number} från ${SELLER.name}`,
    "",
    invoice.name,
    invoice.address,
    invoice.postal,
    invoice.property ? invoice.property : null,
    "",
    invoice.description,
    `Exkl. moms: ${formatMoney(net)}`,
    vat > 0 ? `Moms ${invoice.vatRate} %: ${formatMoney(vat)}` : null,
    `Att betala: SEK ${formatMoney(total)}`,
    `Förfallodatum: ${formatIsoDate(invoice.dueDate)}`,
    `OCR: ${invoice.ocr}`,
    `Bankgiro: ${SELLER.bankgiro}`,
    `Plusgiro: ${SELLER.plusgiro}`,
    invoice.paid ? "Status: Betald" : "Status: Obetald",
    "",
    SELLER.name,
  ]
    .filter((line) => line !== null && String(line).trim().length > 0)
    .join("\n");
}

export function invoiceMailSubject(invoice: Invoice): string {
  return `Faktura ${invoice.number} ${SELLER.name}`;
}

export function invoiceMailBody(invoice: Invoice): string {
  return `${invoiceBodyText(invoice)}\n\nFakturan i PDF bifogas detta mejl.\n\nMed vänlig hälsning\n${SELLER.name}\n${SELLER.email}`;
}

export function invoiceGmailLink(invoice: Invoice): string {
  const from = SELLER.email;
  const compose = new URL("https://mail.google.com/mail/u/");
  compose.searchParams.set("authuser", from);
  compose.searchParams.set("view", "cm");
  compose.searchParams.set("fs", "1");
  compose.searchParams.set("tf", "1");
  compose.searchParams.set("to", invoice.email);
  compose.searchParams.set("su", invoiceMailSubject(invoice));
  compose.searchParams.set("body", invoiceMailBody(invoice));
  const chooser = new URL("https://accounts.google.com/AccountChooser");
  chooser.searchParams.set("Email", from);
  chooser.searchParams.set("hl", "sv");
  chooser.searchParams.set("continue", compose.toString());
  return chooser.toString();
}

export function invoiceGmailAppLink(invoice: Invoice): string {
  const params = new URLSearchParams({
    to: invoice.email,
    subject: invoiceMailSubject(invoice),
    body: invoiceMailBody(invoice).slice(0, 1800),
  });
  return `googlegmail://co?${params.toString()}`;
}
