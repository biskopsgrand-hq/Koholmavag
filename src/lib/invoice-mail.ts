import { zipSync } from "fflate";
import {
  invoiceFromMember,
  nextCustomerNo,
  nextInvoiceNumber,
  type Invoice,
} from "@/lib/invoices";
import { buildInvoicePdf, downloadPdf, invoiceFileName } from "@/lib/invoice-pdf";
import type { AssociationMember, MemberRegister } from "@/lib/members";

export async function mailSavedInvoice(invoice: Invoice): Promise<void> {
  await downloadSavedInvoice(invoice);
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
