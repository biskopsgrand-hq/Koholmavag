import { zipSync } from "fflate";
import {
  invoiceBodyText,
  invoiceFromMember,
  invoiceMailtoLink,
  invoiceMailSubject,
  type Invoice,
} from "@/lib/invoices";
import { buildInvoicePdf, downloadPdf, invoiceFileName } from "@/lib/invoice-pdf";
import type { AssociationMember, MemberRegister } from "@/lib/members";

export async function mailSavedInvoice(
  invoice: Invoice,
  payment: string,
  message: string,
): Promise<"shared" | "download"> {
  const bytes = await buildInvoicePdf(invoice, payment, message);
  const filename = invoiceFileName(invoice);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const file = new File([copy], filename, { type: "application/pdf" });
  const shareData = {
    files: [file],
    title: invoiceMailSubject(invoice),
    text: invoiceBodyText(invoice, payment),
  };
  if (typeof navigator.canShare === "function" && navigator.canShare(shareData)) {
    await navigator.share(shareData);
    return "shared";
  }
  downloadPdf(bytes, filename);
  if (invoice.email.includes("@")) window.location.href = invoiceMailtoLink(invoice, payment);
  return "download";
}

export async function downloadSavedInvoice(invoice: Invoice, payment: string, message: string) {
  const bytes = await buildInvoicePdf(invoice, payment, message);
  downloadPdf(bytes, invoiceFileName(invoice));
}

export async function mailInvoicePdf(
  member: AssociationMember,
  register: MemberRegister,
  year: number,
): Promise<"shared" | "download"> {
  const invoice = invoiceFromMember(member, register, year, `F-${year}`);
  return mailSavedInvoice(invoice, register.payment, register.message);
}

export async function downloadInvoicePdf(
  member: AssociationMember,
  register: MemberRegister,
  year: number,
) {
  const invoice = invoiceFromMember(member, register, year, `F-${year}`);
  await downloadSavedInvoice(invoice, register.payment, register.message);
}

export async function downloadAllInvoicePdfs(
  members: AssociationMember[],
  register: MemberRegister,
  year: number,
) {
  if (members.length === 1) {
    await downloadInvoicePdf(members[0]!, register, year);
    return;
  }
  const files: Record<string, Uint8Array> = {};
  for (const member of members) {
    const invoice = invoiceFromMember(member, register, year, `F-${year}`);
    files[invoiceFileName(invoice)] = await buildInvoicePdf(invoice, register.payment, register.message);
  }
  const zipped = zipSync(files);
  downloadPdf(zipped, `fakturor-${year}-${year + 1}.zip`, "application/zip");
}
