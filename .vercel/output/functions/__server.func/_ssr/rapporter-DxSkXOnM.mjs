import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as cn, n as Input, r as Label, t as Button } from "./label-BRi1-1MI.mjs";
import { a as Plus, c as Download, f as ArrowLeft, i as Printer, l as ChevronRight, r as Trash2, u as ChevronLeft } from "../_libs/lucide-react.mjs";
import { i as BrandLockup, n as AdminNav, r as AuthGate, t as AccountChip } from "./brand-lockup-fWDKVPML.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { _ as parseMoneyInput, c as fiscalPeriodLabel, f as formatKr, g as parseAmountInput, i as currentFiscalYear, l as fiscalYearFromIso, m as monthTotals, r as categoryById, s as fiscalClosingLabel, t as EMPTY_YEAR_BOOK, u as fiscalYearLabel, x as useBudgetStore } from "./budget-store-DNr10-pq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rapporter-DxSkXOnM.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function transactionsInFiscalYear(transactions, startYear) {
	const start = `${startYear}-07-01`;
	const end = `${startYear + 1}-06-30`;
	return transactions.filter((tx) => tx.date >= start && tx.date <= end);
}
function yearsFromData(transactions, yearBooks, fallbackYear) {
	const set = /* @__PURE__ */ new Set();
	set.add(fallbackYear);
	for (const tx of transactions) set.add(fiscalYearFromIso(tx.date));
	for (const key of Object.keys(yearBooks)) {
		const y = Number(key);
		if (Number.isFinite(y)) set.add(y);
	}
	return [...set].sort((a, b) => a - b);
}
function linesFor(transactions, categories, type) {
	const map = /* @__PURE__ */ new Map();
	for (const tx of transactions) {
		if (tx.type !== type) continue;
		map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
	}
	return [...map.entries()].map(([categoryId, amount]) => ({
		categoryId,
		name: categoryById(categories, categoryId)?.name ?? "Övrigt",
		amount
	})).sort((a, b) => b.amount - a.amount);
}
function buildAnnualReport(year, transactions, categories, book) {
	const yearTx = transactionsInFiscalYear(transactions, year);
	const totals = monthTotals(yearTx);
	const resolved = book ?? EMPTY_YEAR_BOOK;
	const openingCash = resolved.openingCash;
	const assets = resolved.assets;
	const liabilities = resolved.liabilities;
	const assetSum = assets.reduce((sum, item) => sum + item.amount, 0);
	const liabilitySum = liabilities.reduce((sum, item) => sum + item.amount, 0);
	const cash = openingCash + totals.remaining;
	const totalAssets = cash + assetSum;
	const equity = totalAssets - liabilitySum;
	return {
		year,
		label: fiscalYearLabel(year),
		periodLabel: fiscalPeriodLabel(year),
		closingLabel: fiscalClosingLabel(year),
		income: totals.income,
		expense: totals.expense,
		result: totals.remaining,
		incomeLines: linesFor(yearTx, categories, "income"),
		expenseLines: linesFor(yearTx, categories, "expense"),
		openingCash,
		cash,
		assets,
		assetSum,
		liabilities,
		liabilitySum,
		totalAssets,
		equity,
		openingEquity: equity - totals.remaining
	};
}
var CRC_TABLE = /* @__PURE__ */ new Uint32Array(256);
for (let i = 0; i < 256; i++) {
	let c = i;
	for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
	CRC_TABLE[i] = c >>> 0;
}
function crc32(data) {
	let c = 4294967295;
	for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 255] ^ c >>> 8;
	return (c ^ 4294967295) >>> 0;
}
function u16(value) {
	const b = /* @__PURE__ */ new Uint8Array(2);
	b[0] = value & 255;
	b[1] = value >>> 8 & 255;
	return b;
}
function u32(value) {
	const b = /* @__PURE__ */ new Uint8Array(4);
	b[0] = value & 255;
	b[1] = value >>> 8 & 255;
	b[2] = value >>> 16 & 255;
	b[3] = value >>> 24 & 255;
	return b;
}
function concat(parts) {
	const total = parts.reduce((n, p) => n + p.length, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}
/** Uncompressed ZIP (store). Valid for Office Open XML. */
function zipStore(files) {
	const enc = new TextEncoder();
	const locals = [];
	const centrals = [];
	let offset = 0;
	for (const file of files) {
		const name = enc.encode(file.path);
		const data = enc.encode(file.content);
		const crc = crc32(data);
		const local = concat([
			u32(67324752),
			u16(20),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(crc),
			u32(data.length),
			u32(data.length),
			u16(name.length),
			u16(0),
			name,
			data
		]);
		const central = concat([
			u32(33639248),
			u16(20),
			u16(20),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(crc),
			u32(data.length),
			u32(data.length),
			u16(name.length),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(0),
			u32(offset),
			name
		]);
		locals.push(local);
		centrals.push(central);
		offset += local.length;
	}
	const centralDir = concat(centrals);
	const eocd = concat([
		u32(101010256),
		u16(0),
		u16(0),
		u16(files.length),
		u16(files.length),
		u32(centralDir.length),
		u32(offset),
		u16(0)
	]);
	const bytes = concat([
		...locals,
		centralDir,
		eocd
	]);
	const buffer = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(buffer).set(bytes);
	return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
function xml(text) {
	return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}
function paragraph(text, opts) {
	const size = opts?.size ?? 22;
	const color = opts?.color ?? "1A1714";
	const bold = opts?.bold ? "<w:b/>" : "";
	const after = opts?.after ?? 80;
	return `<w:p>
    <w:pPr>
      <w:spacing w:before="${opts?.before ?? 0}" w:after="${after}"/>
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
function row(label, amount, opts) {
	const size = opts?.bold ? 22 : 21;
	const bold = opts?.bold ? "<w:b/>" : "";
	const cellBorders = `<w:tcBorders>
    ${opts?.border ? `<w:top w:val="single" w:sz="6" w:space="0" w:color="D8CFBF"/>` : `<w:top w:val="nil"/>`}
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
function table(rowsXml) {
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
function lineRows(lines, empty, sumLabel, sum) {
	return (lines.length === 0 ? `<w:tr>
          <w:tc>
            <w:tcPr><w:tcW w:w="9500" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
            <w:p><w:r>
              <w:rPr><w:sz w:val="21"/><w:color w:val="6B6458"/><w:i/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              </w:rPr>
              <w:t>${xml(empty)}</w:t>
            </w:r></w:p>
          </w:tc>
        </w:tr>` : lines.map((line) => row(line.name, line.amount)).join("")) + row(sumLabel, sum, {
		bold: true,
		border: true
	});
}
function itemRows(items) {
	return items.map((item) => row(item.name, item.amount)).join("");
}
function documentXml(report) {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${[
		paragraph("SALDO", {
			size: 20,
			color: "6B6458",
			after: 40
		}),
		paragraph(`Årsrapport ${report.label}`, {
			bold: true,
			size: 36,
			after: 60
		}),
		paragraph(`Räkenskapsår ${report.periodLabel}`, {
			size: 22,
			color: "6B6458",
			after: 280
		}),
		paragraph(`Resultaträkning ${report.label}`, {
			bold: true,
			size: 28,
			before: 120,
			after: 160
		}),
		paragraph("INTÄKTER", {
			size: 18,
			color: "6B6458",
			after: 80
		}),
		table(lineRows(report.incomeLines, "Inga intäkter under räkenskapsåret.", "Summa intäkter", report.income)),
		paragraph("KOSTNADER", {
			size: 18,
			color: "6B6458",
			before: 280,
			after: 80
		}),
		table(lineRows(report.expenseLines, "Inga kostnader under räkenskapsåret.", "Summa kostnader", report.expense)),
		table(row("Årets resultat", report.result, {
			bold: true,
			border: true
		})),
		paragraph(`Balansräkning ${report.closingLabel}`, {
			bold: true,
			size: 28,
			before: 480,
			after: 160
		}),
		paragraph("TILLGÅNGAR", {
			size: 18,
			color: "6B6458",
			after: 80
		}),
		table(row("Likvida medel", report.cash) + itemRows(report.assets) + row("Summa tillgångar", report.totalAssets, {
			bold: true,
			border: true
		})),
		paragraph("EGET KAPITAL OCH SKULDER", {
			size: 18,
			color: "6B6458",
			before: 280,
			after: 80
		}),
		table(row("Ingående eget kapital", report.openingEquity) + row("Årets resultat", report.result) + row("Summa eget kapital", report.equity, {
			bold: true,
			border: true
		}) + itemRows(report.liabilities) + row("Summa eget kapital och skulder", report.equity + report.liabilitySum, {
			bold: true,
			border: true
		})),
		paragraph("Likvida medel = ingående saldo 1 juli + årets resultat.", {
			size: 18,
			color: "6B6458",
			before: 280,
			after: 0
		}),
		`<w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>`
	].join("")}</w:body>
</w:document>`;
}
var CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
var ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
var DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;
function reportToDocx(report) {
	return zipStore([
		{
			path: "[Content_Types].xml",
			content: CONTENT_TYPES
		},
		{
			path: "_rels/.rels",
			content: ROOT_RELS
		},
		{
			path: "word/_rels/document.xml.rels",
			content: DOC_RELS
		},
		{
			path: "word/document.xml",
			content: documentXml(report)
		}
	]);
}
function AnnualReports() {
	const transactions = useBudgetStore((s) => s.transactions);
	const categories = useBudgetStore((s) => s.categories);
	const yearBooks = useBudgetStore((s) => s.yearBooks);
	const setOpeningCash = useBudgetStore((s) => s.setOpeningCash);
	const addBalanceItem = useBudgetStore((s) => s.addBalanceItem);
	const removeBalanceItem = useBudgetStore((s) => s.removeBalanceItem);
	const [year, setYear] = (0, import_react.useState)(currentFiscalYear());
	const [openingDraft, setOpeningDraft] = (0, import_react.useState)(null);
	const [assetName, setAssetName] = (0, import_react.useState)("");
	const [assetAmount, setAssetAmount] = (0, import_react.useState)("");
	const [debtName, setDebtName] = (0, import_react.useState)("");
	const [debtAmount, setDebtAmount] = (0, import_react.useState)("");
	const years = (0, import_react.useMemo)(() => yearsFromData(transactions, yearBooks, currentFiscalYear()), [transactions, yearBooks]);
	const report = (0, import_react.useMemo)(() => buildAnnualReport(year, transactions, categories, yearBooks[String(year)]), [
		year,
		transactions,
		categories,
		yearBooks
	]);
	const openingValue = openingDraft ?? String(report.openingCash);
	(0, import_react.useEffect)(() => {
		setOpeningDraft(null);
	}, [year]);
	function commitOpening() {
		const parsed = parseMoneyInput(openingValue, true);
		if (parsed === null) {
			setOpeningDraft(null);
			return;
		}
		setOpeningCash(year, parsed);
		setOpeningDraft(null);
	}
	function handleAdd(kind) {
		const name = kind === "assets" ? assetName : debtName;
		const parsed = parseAmountInput(kind === "assets" ? assetAmount : debtAmount);
		if (!name.trim() || parsed === null) {
			toast("Ange namn och belopp.");
			return;
		}
		if (!addBalanceItem(year, kind, name, parsed)) {
			toast("Posten kunde inte läggas till.");
			return;
		}
		if (kind === "assets") {
			setAssetName("");
			setAssetAmount("");
		} else {
			setDebtName("");
			setDebtAmount("");
		}
		toast(kind === "assets" ? "Tillgången lades till" : "Skulden lades till");
	}
	function download() {
		const blob = reportToDocx(report);
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `saldo-arsrapport-${year}-${year + 1}.docx`;
		a.click();
		URL.revokeObjectURL(url);
		toast("Word-filen laddades ner");
	}
	function printReport() {
		window.print();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex min-h-dvh w-full max-w-3xl min-w-0 flex-col overflow-x-clip px-4 pt-6 pb-16 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6 flex flex-col gap-4 print:mb-8 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLockup, { page: `Årsrapport ${report.label}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: report.periodLabel
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2 print:hidden",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountChip, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminNav, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, {}), "Budget"]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YearNav, {
							year,
							years,
							onChange: setYear
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-6 hidden text-sm text-muted print:block",
				children: [
					"Räkenskapsår ",
					report.periodLabel,
					". Belopp i svenska kronor."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-6 flex flex-wrap gap-2 print:hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: printReport,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, {}), "Skriv ut / PDF"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					onClick: download,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), "Ladda ner Word"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(StatementCard, {
						title: `Resultaträkning ${report.label}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LedgerSection, {
								label: "Intäkter",
								children: [report.incomeLines.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyRow, { text: "Inga intäkter under räkenskapsåret." }) : report.incomeLines.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
									label: line.name,
									amount: line.amount
								}, line.categoryId)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
									label: "Summa intäkter",
									amount: report.income,
									total: true
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LedgerSection, {
								label: "Kostnader",
								children: [report.expenseLines.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyRow, { text: "Inga kostnader under räkenskapsåret." }) : report.expenseLines.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
									label: line.name,
									amount: line.amount
								}, line.categoryId)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
									label: "Summa kostnader",
									amount: report.expense,
									total: true
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
								label: "Årets resultat",
								amount: report.result,
								emphasize: true,
								tone: report.result < 0 ? "negative" : "positive"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(StatementCard, {
						title: `Balansräkning ${report.closingLabel}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LedgerSection, {
								label: "Tillgångar",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
										label: "Likvida medel",
										amount: report.cash
									}),
									report.assets.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
										label: item.name,
										amount: item.amount
									}, item.id)),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
										label: "Summa tillgångar",
										amount: report.totalAssets,
										total: true
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LedgerSection, {
								label: "Eget kapital och skulder",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
										label: "Ingående eget kapital",
										amount: report.openingEquity
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
										label: "Årets resultat",
										amount: report.result,
										tone: report.result < 0 ? "negative" : void 0
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
										label: "Summa eget kapital",
										amount: report.equity,
										total: true
									}),
									report.liabilities.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
										label: item.name,
										amount: item.amount
									}, item.id)),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerRow, {
										label: "Summa eget kapital och skulder",
										amount: report.equity + report.liabilitySum,
										total: true
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-4 text-sm text-muted",
								children: [
									"Likvida medel = ingående saldo 1 juli (",
									formatKr(report.openingCash),
									") + årets resultat."
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] print:hidden sm:p-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
								className: "font-display text-xl font-medium tracking-tight text-ink",
								children: ["Balansposter ", report.label]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: "Ange ingående likvida medel den 1 juli samt övriga tillgångar och skulder per 30 juni."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 grid gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "opening-cash",
									children: "Ingående likvida medel (1 jul)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "opening-cash",
									inputMode: "decimal",
									className: "tabular-nums",
									value: openingValue,
									onChange: (e) => setOpeningDraft(e.target.value),
									onBlur: commitOpening,
									onKeyDown: (e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											commitOpening();
										}
									},
									placeholder: "0"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemEditor, {
								title: "Övriga tillgångar",
								name: assetName,
								amount: assetAmount,
								onName: setAssetName,
								onAmount: setAssetAmount,
								items: report.assets,
								onAdd: () => handleAdd("assets"),
								onRemove: (id) => removeBalanceItem(year, "assets", id),
								namePlaceholder: "Sparkonto, ISK, bostad…"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemEditor, {
								title: "Skulder",
								name: debtName,
								amount: debtAmount,
								onName: setDebtName,
								onAmount: setDebtAmount,
								items: report.liabilities,
								onAdd: () => handleAdd("liabilities"),
								onRemove: (id) => removeBalanceItem(year, "liabilities", id),
								namePlaceholder: "Bolån, CSN, kreditkort…"
							})
						]
					})
				]
			})
		]
	});
}
function YearNav({ year, years, onChange }) {
	const min = Math.min(...years, year, currentFiscalYear()) - 1;
	const max = Math.max(...years, year, currentFiscalYear()) + 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex w-fit items-center gap-1 rounded-lg bg-surface p-1 shadow-[var(--shadow-border)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "icon-sm",
				onClick: () => onChange(year - 1),
				disabled: year <= min,
				"aria-label": "Föregående räkenskapsår",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "min-w-[4.75rem] px-1 text-center text-sm font-medium whitespace-nowrap text-ink",
				children: [
					year,
					"/",
					year + 1
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "icon-sm",
				onClick: () => onChange(year + 1),
				disabled: year >= max,
				"aria-label": "Nästa räkenskapsår",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {})
			})
		]
	});
}
function StatementCard({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "break-inside-avoid rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] print:shadow-none sm:p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-xl font-medium tracking-tight text-ink",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-5 flex flex-col gap-5",
			children
		})]
	});
}
function LedgerSection({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mb-2 text-xs font-medium tracking-widest text-muted uppercase",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children })] });
}
function LedgerRow({ label, amount, total, emphasize, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex items-baseline justify-between gap-4 py-1.5 text-sm", total && "border-t border-line pt-2 font-medium", emphasize && "mt-1 border-t border-ink/20 pt-3 text-base"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("min-w-0 truncate", emphasize ? "font-medium text-ink" : "text-ink"),
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("shrink-0 tabular-nums", tone === "positive" && "text-moss", tone === "negative" && "text-clay"),
			children: formatKr(amount)
		})]
	});
}
function EmptyRow({ text }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-1.5 text-sm text-muted",
		children: text
	});
}
function ItemEditor({ title, name, amount, onName, onAmount, items, onAdd, onRemove, namePlaceholder }) {
	function handleSubmit(event) {
		event.preventDefault();
		onAdd();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-medium text-ink",
				children: title
			}),
			items.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 divide-y divide-line",
				children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-2 py-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "min-w-0 flex-1 truncate text-sm text-ink",
							children: item.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm tabular-nums text-ink",
							children: formatKr(item.amount)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "icon-sm",
							"aria-label": `Ta bort ${item.name}`,
							className: "text-muted hover:text-clay",
							onClick: () => onRemove(item.id),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {})
						})
					]
				}, item.id))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: handleSubmit,
				className: "mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_auto]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: name,
						onChange: (e) => onName(e.target.value),
						placeholder: namePlaceholder,
						maxLength: 40,
						"aria-label": `${title} namn`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: amount,
						onChange: (e) => onAmount(e.target.value),
						placeholder: "Belopp",
						inputMode: "decimal",
						className: "tabular-nums",
						"aria-label": `${title} belopp`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "submit",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {}), "Lägg till"]
					})
				]
			})
		]
	});
}
function ReportsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthGate, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "min-h-dvh overflow-x-clip bg-bg text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnnualReports, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
			position: "top-center",
			offset: 16,
			toastOptions: { className: "!bg-surface !text-ink !border-0 !shadow-[var(--shadow-raised)] !font-sans" }
		})]
	}) });
}
//#endregion
export { ReportsPage as component };
