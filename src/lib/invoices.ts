import { APP_NAME } from "@/lib/brand";
import { fiscalPeriodLabel, fiscalYearLabel, formatKr } from "@/lib/format";
import { memberFee, type AssociationMember, type MemberRegister } from "@/lib/members";

export const VAT_RATES = [0, 12, 25] as const;
export type VatRate = (typeof VAT_RATES)[number];

export type Invoice = {
  id: string;
  number: string;
  memberId: string | null;
  name: string;
  address: string;
  email: string;
  property: string;
  description: string;
  amount: number;
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

export function invoiceTotals(invoice: Pick<Invoice, "amount" | "vatRate">) {
  const net = Math.max(0, Math.round(invoice.amount));
  const vat = Math.round(net * invoice.vatRate / 100);
  return { net, vat, total: net + vat };
}

export function nextInvoiceNumber(invoices: Invoice[], year: number): string {
  let max = 0;
  for (const invoice of invoices) {
    if (invoice.year !== year) continue;
    const seq = Number(invoice.number.split("-").at(-1));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `F-${year}-${String(max + 1).padStart(3, "0")}`;
}

export function invoiceFromMember(
  member: AssociationMember,
  register: MemberRegister,
  year: number,
  number: string,
): Invoice {
  return {
    id: crypto.randomUUID(),
    number,
    memberId: member.id,
    name: member.name,
    address: member.address,
    email: member.email,
    property: member.property,
    description: `Årsavgift ${fiscalPeriodLabel(year)}`,
    amount: memberFee(member, register.defaultFee),
    vatRate: 0,
    dueDate: register.dueDate,
    issuedAt: new Date().toISOString(),
    paid: false,
    paidAt: null,
    year,
  };
}

export function invoiceBodyText(invoice: Invoice, payment: string): string {
  const { net, vat, total } = invoiceTotals(invoice);
  return [
    `Faktura ${invoice.number} från ${APP_NAME}`,
    "",
    `Mottagare: ${invoice.name}`,
    invoice.property ? `Fastighet: ${invoice.property}` : null,
    invoice.address ? `Adress: ${invoice.address}` : null,
    invoice.email ? `E-post: ${invoice.email}` : null,
    "",
    invoice.description,
    `Belopp exkl. moms: ${formatKr(net)}`,
    `Moms ${invoice.vatRate} %: ${formatKr(vat)}`,
    `Att betala: ${formatKr(total)}`,
    invoice.dueDate ? `Förfallodag: ${invoice.dueDate}` : null,
    `Referens: ${invoice.number}`,
    payment ? `Betalning: ${payment}` : null,
    invoice.paid ? "Status: Betald" : "Status: Obetald",
    "",
    "Med vänlig hälsning",
    APP_NAME,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function invoiceMailSubject(invoice: Invoice): string {
  return `Faktura ${invoice.number} ${APP_NAME} ${fiscalYearLabel(invoice.year)}`;
}

export function invoiceMailtoLink(invoice: Invoice, payment: string): string {
  const body = `${invoiceBodyText(invoice, payment)}\n\nFakturan i PDF bifogas detta mejl.`;
  return `mailto:${encodeURIComponent(invoice.email)}?subject=${encodeURIComponent(invoiceMailSubject(invoice))}&body=${encodeURIComponent(body)}`;
}
