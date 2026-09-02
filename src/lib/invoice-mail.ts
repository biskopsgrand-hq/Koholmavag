import { zipSync } from "fflate";
import {
  invoiceFromMember,
  invoiceGmailAppLink,
  invoiceGmailLink,
  nextCustomerNo,
  nextInvoiceNumber,
  type Invoice,
} from "@/lib/invoices";
import { buildInvoicePdf, downloadPdf, invoiceFileName } from "@/lib/invoice-pdf";
import type { AssociationMember, MemberRegister } from "@/lib/members";

function clickHref(href: string, newTab = false) {
  const link = document.createElement("a");
  link.href = href;
  if (newTab) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function openInvoiceGmail(invoice: Invoice) {
  clickHref(invoiceGmailLink(invoice), true);
}

function openGmailAppThenWeb(invoice: Invoice) {
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (mobile) {
    clickHref(invoiceGmailAppLink(invoice));
    window.setTimeout(() => {
      if (document.visibilityState === "visible") openInvoiceGmail(invoice);
    }, 900);
    return;
  }
  openInvoiceGmail(invoice);
}

export async function shareInvoiceWithPdf(invoice: Invoice): Promise<"gmail"> {
  const bytes = await buildInvoicePdf(invoice);
  downloadPdf(bytes, invoiceFileName(invoice));
  openGmailAppThenWeb(invoice);
  return "gmail";
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
