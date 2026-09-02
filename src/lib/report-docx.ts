import { formatKr } from "./format.ts";
import { zipStore } from "./zip-store.ts";
import type { AnnualReport, ReportLine } from "./reports.ts";
import type { BalanceItem } from "./budget-store.ts";

function xml(text: string): string {
  return text
    .replaceAll("&", "&" + "amp;")
    .replaceAll("<", "&" + "lt;")
    .replaceAll(">", "&" + "gt;")
    .replaceAll('"', "&" + "quot;");
}

function paragraph(
  text: string,
  opts?: { bold?: boolean; size?: number; color?: string; after?: number; before?: number },
): string {
  const size = opts?.size ?? 22;
  const color = opts?.color ?? "1A1714";
  const bold = opts?.bold ? "<w:b/>" : "";
  const after = opts?.after ?? 80;
  const before = opts?.before ?? 0;
  return `<w:p>
    <w:pPr>
      <w:spacing w:before="${before}" w:after="${after}"/>
      <w:rPr>${bold}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${color}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
      </w:rPr>
    </w:pPr>
    <w:r>
      <w:rPr>${bold}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${color}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
      </w:rPr>
      <w:t xml:space="preserve">${xml(text)}</w:t>
    </w:r>
  </w:p>`;
}

function row(label: string, amount: number, opts?: { bold?: boolean; border?: boolean }): string {
  const size = opts?.bold ? 22 : 21;
  const bold = opts?.bold ? "<w:b/>" : "";
  const top = opts?.border
    ? `<w:top w:val="single" w:sz="6" w:space="0" w:color="D8CFBF"/>`
    : `<w:top w:val="nil"/>`;
  const cellBorders = `<w:tcBorders>
    ${top}
    <w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>
  </w:tcBorders>`;
  const fonts = `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="1A1714"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>`;
  return `<w:tr>
    <w:tc>
      <w:tcPr>${cellBorders}<w:tcW w:w="7000" w:type="dxa"/></w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>
        <w:r><w:rPr>${bold}${fonts}</w:rPr><w:t xml:space="preserve">${xml(label)}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>${cellBorders}<w:tcW w:w="2500" w:type="dxa"/></w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="right"/><w:spacing w:before="40" w:after="40"/></w:pPr>
        <w:r><w:rPr>${bold}${fonts}</w:rPr><w:t xml:space="preserve">${xml(formatKr(amount))}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>`;
}

function table(rowsXml: string): string {
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>
        <w:insideH w:val="nil"/><w:insideV w:val="nil"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="7000"/><w:gridCol w:w="2500"/></w:tblGrid>
    ${rowsXml}
  </w:tbl>`;
}

function lineRows(lines: ReportLine[], empty: string, sumLabel: string, sum: number): string {
  const body =
    lines.length === 0
      ? `<w:tr>
          <w:tc>
            <w:tcPr><w:tcW w:w="9500" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
            <w:p><w:r>
              <w:rPr><w:sz w:val="21"/><w:color w:val="6B6458"/><w:i/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              </w:rPr>
              <w:t>${xml(empty)}</w:t>
            </w:r></w:p>
          </w:tc>
        </w:tr>`
      : lines.map((line) => row(line.name, line.amount)).join("");
  return body + row(sumLabel, sum, { bold: true, border: true });
}

function itemRows(items: BalanceItem[]): string {
  return items.map((item) => row(item.name, item.amount)).join("");
}

function documentXml(report: AnnualReport): string {
  const body = [
    paragraph("SALDO", { size: 20, color: "6B6458", after: 40 }),
    paragraph(`Årsrapport ${report.label}`, { bold: true, size: 36, after: 60 }),
    paragraph(`Räkenskapsår ${report.periodLabel}`, { size: 22, color: "6B6458", after: 280 }),
    paragraph(`Resultaträkning ${report.label}`, { bold: true, size: 28, before: 120, after: 160 }),
    paragraph("INTÄKTER", { size: 18, color: "6B6458", after: 80 }),
    table(lineRows(report.incomeLines, "Inga intäkter under räkenskapsåret.", "Summa intäkter", report.income)),
    paragraph("KOSTNADER", { size: 18, color: "6B6458", before: 280, after: 80 }),
    table(lineRows(report.expenseLines, "Inga kostnader under räkenskapsåret.", "Summa kostnader", report.expense)),
    table(row("Årets resultat", report.result, { bold: true, border: true })),
    paragraph(`Balansräkning ${report.closingLabel}`, { bold: true, size: 28, before: 480, after: 160 }),
    paragraph("TILLGÅNGAR", { size: 18, color: "6B6458", after: 80 }),
    table(
      row("Likvida medel", report.cash) +
        itemRows(report.assets) +
        row("Summa tillgångar", report.totalAssets, { bold: true, border: true }),
    ),
    paragraph("EGET KAPITAL OCH SKULDER", { size: 18, color: "6B6458", before: 280, after: 80 }),
    table(
      row("Ingående eget kapital", report.openingEquity) +
        row("Årets resultat", report.result) +
        row("Summa eget kapital", report.equity, { bold: true, border: true }) +
        itemRows(report.liabilities) +
        row("Summa eget kapital och skulder", report.equity + report.liabilitySum, {
          bold: true,
          border: true,
        }),
    ),
    paragraph("Likvida medel = ingående saldo 1 juli + in- och utbetalningar. Upplupna intäkter ingår inte i kassan.", {
      size: 18,
      color: "6B6458",
      before: 280,
      after: 0,
    }),
    `<w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>`,
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

export function reportToDocx(report: AnnualReport): Blob {
  return zipStore([
    { path: "[Content_Types].xml", content: CONTENT_TYPES },
    { path: "_rels/.rels", content: ROOT_RELS },
    { path: "word/_rels/document.xml.rels", content: DOC_RELS },
    { path: "word/document.xml", content: documentXml(report) },
  ]);
}
