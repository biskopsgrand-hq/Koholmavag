import { zipSync } from "fflate";
import {
  invoiceBodyText,
  invoiceFromMember,
  invoiceMailtoLink,
  invoiceMailSubject,
  nextCustomerNo,
  nextInvoiceNumber,
  type Invoice,
} from "@/lib/invoices";
import { buildInvoicePdf, downloadPdf, invoiceFileName } from "@/lib/invoice-pdf";
import type { AssociationMember, MemberRegister } from "@/lib/members";

export async function mailSavedInvoice(invoice: Invoice): Promise<"shared" | "download"> {
  const bytes = await buildInvoicePdf(invoice);
  const filename = invoiceFileName(invoice);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const file = new File([copy], filename, { type: "application/pdf" });
  const shareData = {
    files: [file],
    title: invoiceMailSubject(invoice),
    text: invoiceBodyText(invoice),
  };
  if (typeof navigator.canShare === "function" && navigator.canShare(shareData)) {
    await navigator.share(shareData);
    return "shared";
  }
  downloadPdf(bytes, filename);
  if (invoice.email.includes("@")) window.open(invoiceMailtoLink(invoice), "_blank", "noopener");
  return "download";
}

export async function downloadSavedInvoice(invoice: Invoice) {
  const bytes = await buildInvoicePdf(invoice);
  downloadPdf(bytes, invoiceFileName(invoice));
}

export async function downloadAllInvoicePdfs(
  members: AssociationMember[],
  register: MemberRegister,
  year: number,
  existing: Invoice[] = [],
) {
  const files: Record<string, Uint8Array> = {};
  let number = Number(nextInvoiceNumber(existing)) - 1;
  let customer = Number(nextCustomerNo(existing, members)) - 1;
  for (const member of members) {
    number += 1;
    customer += 1;
    const invoice = invoiceFromMember(
      member,
      register,
      year,
      String(number),
      member.customerNo || String(customer),
    );
    files[invoiceFileName(invoice)] = await buildInvoicePdf(invoice);
  }
  if (members.length === 1) {
    downloadPdf(Object.values(files)[0]!, Object.keys(files)[0]!);
    return;
  }
  const zipped = zipSync(files);
  downloadPdf(zipped, `fakturor-${year}-${year + 1}.zip`, "application/zip");
}

export async function downloadInvoiceZip(invoices: Invoice[], filename: string) {
  if (invoices.length === 1) {
    await downloadSavedInvoice(invoices[0]!);
    return;
  }
  const files: Record<string, Uint8Array> = {};
  for (const invoice of invoices) {
    files[invoiceFileName(invoice)] = await buildInvoicePdf(invoice);
  }
  downloadPdf(zipSync(files), filename, "application/zip");
}
