import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { APP_NAME } from "@/lib/brand";
import { fiscalYearLabel, formatKr } from "@/lib/format";
import { invoiceTotals, type Invoice } from "@/lib/invoices";

const PINE = rgb(30 / 255, 70 / 255, 56 / 255);
const INK = rgb(26 / 255, 23 / 255, 20 / 255);
const MUTED = rgb(90 / 255, 84 / 255, 76 / 255);
const RULE = rgb(214 / 255, 206 / 255, 190 / 255);
const CREAM = rgb(239 / 255, 233 / 255, 220 / 255);

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
  return `faktura-${invoice.number}-${slug(invoice.property || invoice.name) || "mottagare"}.pdf`;
}

function wrap(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= max) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function buildInvoicePdf(invoice: Invoice, payment: string, message = ""): Promise<Uint8Array> {
  const { net, vat, total } = invoiceTotals(invoice);
  const issued = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long" }).format(new Date(invoice.issuedAt));
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: height - 96, width, height: 96, color: PINE });
  page.drawText(APP_NAME, { x: 48, y: height - 48, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Samfällighet · Rådmansö", { x: 48, y: height - 68, size: 10, font: helvetica, color: CREAM });
  page.drawText("FAKTURA", {
    x: width - 48 - bold.widthOfTextAtSize("FAKTURA", 18),
    y: height - 52,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });

  let y = height - 140;
  page.drawText("Mottagare", { x: 48, y, size: 9, font: bold, color: MUTED });
  y -= 18;
  for (const line of [invoice.name, invoice.property, invoice.address].filter(Boolean)) {
    page.drawText(line, { x: 48, y, size: 11, font: helvetica, color: INK });
    y -= 16;
  }

  const metaX = 340;
  let metaY = height - 140;
  const meta = [
    ["Fakturanr", invoice.number],
    ["Fakturadatum", issued],
    ["Räkenskapsår", fiscalYearLabel(invoice.year)],
    invoice.dueDate ? ["Förfallodag", invoice.dueDate] : null,
    ["Status", invoice.paid ? "Betald" : "Obetald"],
  ].filter((row): row is [string, string] => row !== null);
  for (const [label, value] of meta) {
    page.drawText(label, { x: metaX, y: metaY, size: 9, font: bold, color: MUTED });
    page.drawText(value, { x: metaX + 90, y: metaY, size: 10, font: helvetica, color: INK });
    metaY -= 16;
  }

  y = Math.min(y, metaY) - 28;
  page.drawRectangle({ x: 48, y: y - 8, width: width - 96, height: 28, color: CREAM });
  page.drawText("Beskrivning", { x: 60, y, size: 10, font: bold, color: INK });
  page.drawText("Belopp", {
    x: width - 48 - bold.widthOfTextAtSize("Belopp", 10),
    y,
    size: 10,
    font: bold,
    color: INK,
  });

  y -= 36;
  page.drawText(invoice.description || `Årsavgift ${fiscalYearLabel(invoice.year)}`, {
    x: 60,
    y,
    size: 11,
    font: helvetica,
    color: INK,
  });
  const netLabel = formatKr(net);
  page.drawText(netLabel, {
    x: width - 48 - helvetica.widthOfTextAtSize(netLabel, 11),
    y,
    size: 11,
    font: helvetica,
    color: INK,
  });

  y -= 22;
  page.drawText(`Moms ${invoice.vatRate} %`, { x: 60, y, size: 11, font: helvetica, color: INK });
  const vatLabel = formatKr(vat);
  page.drawText(vatLabel, {
    x: width - 48 - helvetica.widthOfTextAtSize(vatLabel, 11),
    y,
    size: 11,
    font: helvetica,
    color: INK,
  });

  y -= 20;
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: RULE });
  y -= 24;
  page.drawText("Att betala", { x: 60, y, size: 12, font: bold, color: INK });
  const totalLabel = formatKr(total);
  page.drawText(totalLabel, {
    x: width - 48 - bold.widthOfTextAtSize(totalLabel, 14),
    y,
    size: 14,
    font: bold,
    color: PINE,
  });

  y -= 48;
  page.drawText("Betalning", { x: 48, y, size: 9, font: bold, color: MUTED });
  y -= 18;
  if (payment) {
    page.drawText(payment, { x: 48, y, size: 11, font: helvetica, color: INK });
    y -= 16;
  }
  page.drawText(`Ange referens: ${invoice.number}`, { x: 48, y, size: 11, font: helvetica, color: INK });
  y -= 28;
  if (message) {
    for (const line of wrap(message, helvetica, 10, width - 96)) {
      page.drawText(line, { x: 48, y, size: 10, font: helvetica, color: INK });
      y -= 14;
    }
  }

  page.drawLine({ start: { x: 48, y: 56 }, end: { x: width - 48, y: 56 }, thickness: 1, color: RULE });
  page.drawText(APP_NAME, { x: 48, y: 36, size: 9, font: helvetica, color: MUTED });

  return pdf.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string, mime = "application/pdf") {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const blob = new Blob([copy], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
