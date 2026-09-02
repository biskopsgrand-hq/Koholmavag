import { zipSync } from "fflate";
import { invoiceBody, invoiceMailto, invoiceSubject, type AssociationMember, type MemberRegister } from "@/lib/members";
import { buildInvoicePdf, downloadPdf, invoiceFileName } from "@/lib/invoice-pdf";

export async function mailInvoicePdf(
  member: AssociationMember,
  register: MemberRegister,
  year: number,
): Promise<"shared" | "download"> {
  const bytes = await buildInvoicePdf(member, register, year);
  const filename = invoiceFileName(member, year);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const file = new File([copy], filename, { type: "application/pdf" });
  const shareData = {
    files: [file],
    title: invoiceSubject(year),
    text: invoiceBody(member, register, year),
  };
  if (typeof navigator.canShare === "function" && navigator.canShare(shareData)) {
    await navigator.share(shareData);
    return "shared";
  }
  downloadPdf(bytes, filename);
  if (member.email.includes("@")) {
    window.location.href = invoiceMailto(member, register, year);
  }
  return "download";
}

export async function downloadInvoicePdf(
  member: AssociationMember,
  register: MemberRegister,
  year: number,
) {
  const bytes = await buildInvoicePdf(member, register, year);
  downloadPdf(bytes, invoiceFileName(member, year));
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
    files[invoiceFileName(member, year)] = await buildInvoicePdf(member, register, year);
  }
  const zipped = zipSync(files);
  downloadPdf(zipped, `fakturor-${year}-${year + 1}.zip`, "application/zip");
}
