import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatIsoDate, formatMoney } from "@/lib/format";
import { invoiceTotals, type Invoice } from "@/lib/invoices";
import { SELLER } from "@/lib/seller";

const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.35, 0.35, 0.35);

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function invoiceFileName(invoice: Invoice): string {
  return `faktura-${invoice.number}-${slug(invoice.name) || "mottagare"}.pdf`;
}

function text(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = BLACK,
) {
  if (!value) return;
  page.drawText(value, { x, y, size, font, color });
}

function right(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = BLACK,
) {
  if (!value) return;
  page.drawText(value, { x: x - font.widthOfTextAtSize(value, size), y, size, font, color });
}

function pair(
  page: PDFPage,
  label: string,
  value: string,
  labelX: number,
  valueX: number,
  y: number,
  regular: PDFFont,
  bold: PDFFont,
) {
  text(page, label, labelX, y, regular, 9, GRAY);
  text(page, value, valueX, y, regular, 9);
}

export async function buildInvoicePdf(invoice: Invoice): Promise<Uint8Array> {
  const { qty, unit, net, vat, total } = invoiceTotals(invoice);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const left = 48;
  const rightEdge = width - 48;

  text(page, "Sida 1(1)", rightEdge - regular.widthOfTextAtSize("Sida 1(1)", 8), 812, regular, 8, GRAY);
  text(page, SELLER.name, left, 784, bold, 14);
  text(page, "Faktura", 360, 784, bold, 16);

  pair(page, "Fakturadatum", formatIsoDate(invoice.issuedAt), 360, 455, 752, regular, bold);
  pair(page, "Fakturanr", invoice.number, 360, 455, 738, regular, bold);
  pair(page, "OCR", invoice.ocr || invoice.number, 360, 455, 724, regular, bold);

  let y = 680;
  text(page, invoice.name, 360, y, regular, 10);
  y -= 14;
  if (invoice.address) {
    text(page, invoice.address, 360, y, regular, 10);
    y -= 14;
  }
  if (invoice.postal) {
    text(page, invoice.postal, 360, y, regular, 10);
  }

  pair(page, "Kundnr", invoice.customerNo || "—", left, 130, 600, regular, bold);
  pair(page, "Ert ordernr", invoice.customerNo || invoice.number, left, 130, 586, regular, bold);
  pair(page, "Vår referens", SELLER.reference, 360, 455, 600, regular, bold);
  pair(page, "Betalningsvillkor", SELLER.paymentTerms, 360, 455, 586, regular, bold);
  pair(page, "Förfallodatum", formatIsoDate(invoice.dueDate), 360, 455, 572, regular, bold);
  pair(page, "Dröjsmålsränta", SELLER.lateInterest, 360, 455, 558, regular, bold);

  const tableTop = 520;
  page.drawLine({ start: { x: left, y: tableTop + 16 }, end: { x: rightEdge, y: tableTop + 16 }, thickness: 0.8, color: BLACK });
  text(page, "Artnr", left, tableTop, bold, 8);
  text(page, "Benämning", 95, tableTop, bold, 8);
  right(page, "Lev ant", 390, tableTop, bold, 8);
  right(page, "À-pris", 480, tableTop, bold, 8);
  right(page, "Summa", rightEdge, tableTop, bold, 8);
  page.drawLine({ start: { x: left, y: tableTop - 8 }, end: { x: rightEdge, y: tableTop - 8 }, thickness: 0.6, color: BLACK });

  const rowY = tableTop - 28;
  text(page, "1", left, rowY, regular, 9);
  text(page, invoice.description || SELLER.itemName, 95, rowY, regular, 9);
  right(page, formatMoney(qty), 390, rowY, regular, 9);
  right(page, formatMoney(unit), 480, rowY, regular, 9);
  right(page, formatMoney(net), rightEdge, rowY, regular, 9);

  if (invoice.property) {
    text(page, invoice.property, left, 168, regular, 9);
  }

  const sumY = 148;
  page.drawLine({ start: { x: left, y: sumY + 16 }, end: { x: rightEdge, y: sumY + 16 }, thickness: 0.6, color: BLACK });
  text(page, "Exkl. moms", left, sumY, regular, 8, GRAY);
  text(page, "Totalt", 220, sumY, regular, 8, GRAY);
  right(page, "ATT BETALA", rightEdge, sumY, bold, 8);
  text(page, formatMoney(net), left, sumY - 16, regular, 10);
  text(page, formatMoney(total), 220, sumY - 16, regular, 10);
  right(page, `SEK ${formatMoney(total)}`, rightEdge, sumY - 16, bold, 12);
  if (vat > 0) {
    text(page, `Moms ${invoice.vatRate} % ${formatMoney(vat)}`, left, sumY - 32, regular, 8, GRAY);
  }
  page.drawLine({ start: { x: left, y: sumY - 26 }, end: { x: rightEdge, y: sumY - 26 }, thickness: 1, color: BLACK });

  const foot = 78;
  text(page, "Adress", left, foot, bold, 7, GRAY);
  text(page, SELLER.name, left, foot - 12, regular, 8);
  text(page, SELLER.street, left, foot - 24, regular, 8);
  text(page, SELLER.postal, left, foot - 36, regular, 8);
  text(page, SELLER.country, left, foot - 48, regular, 8);

  text(page, "Telefon", 200, foot, bold, 7, GRAY);
  text(page, SELLER.phone, 200, foot - 12, regular, 8);
  text(page, "E-post", 200, foot - 28, bold, 7, GRAY);
  text(page, SELLER.email, 200, foot - 40, regular, 8);

  text(page, "Plusgiro", 360, foot, bold, 7, GRAY);
  text(page, SELLER.plusgiro, 360, foot - 12, regular, 8);
  text(page, "Bankgiro", 360, foot - 28, bold, 7, GRAY);
  text(page, SELLER.bankgiro, 360, foot - 40, regular, 8);

  text(page, "Organisationsnr", 470, foot, bold, 7, GRAY);
  text(page, SELLER.orgNr, 470, foot - 12, regular, 8);

  return pdf.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string, mime = "application/pdf") {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const blob = new Blob([copy], { type: mime === "application/pdf" ? "application/octet-stream" : mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
