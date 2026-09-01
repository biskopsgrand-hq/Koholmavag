import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as Slot, N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as Root } from "../_libs/radix-ui__react-label.mjs";
import { n as parseISO, r as format, t as sv } from "../_libs/date-fns.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/budget-store-BmoyfTre.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:not-disabled:scale-[0.96]", {
	variants: {
		variant: {
			default: "bg-pine text-pine-fg hover:bg-pine/90",
			secondary: "bg-surface-2 text-ink hover:bg-line",
			outline: "bg-transparent text-ink shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
			ghost: "bg-transparent text-ink hover:bg-surface-2",
			destructive: "bg-clay text-destructive-foreground hover:bg-clay/90",
			link: "text-pine underline-offset-4 hover:underline"
		},
		size: {
			default: "h-11 px-4",
			sm: "h-9 rounded-sm px-3 text-sm",
			lg: "h-12 rounded-lg px-5",
			icon: "size-11",
			"icon-sm": "size-9 rounded-sm"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-11 w-full rounded-md bg-bg px-3 text-base text-ink shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 ease-out placeholder:text-subtle file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
var Label = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
	ref,
	className: cn("text-sm font-medium text-ink", className),
	...props
}));
Label.displayName = Root.displayName;
function formatKr(amount) {
	return new Intl.NumberFormat("sv-SE", {
		style: "currency",
		currency: "SEK",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}
function monthKeyFromDate(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function parseMonthKey(key) {
	return parseISO(`${key}-01`);
}
function formatMonthLabel(key) {
	const raw = format(parseMonthKey(key), "LLLL yyyy", { locale: sv });
	return raw.charAt(0).toUpperCase() + raw.slice(1);
}
function formatDayLabel(isoDate) {
	return format(parseISO(isoDate), "d MMM", { locale: sv });
}
function shiftMonth(key, delta) {
	const date = parseMonthKey(key);
	date.setMonth(date.getMonth() + delta);
	return monthKeyFromDate(date);
}
function parseAmountInput(raw) {
	return parseMoneyInput(raw, false);
}
function parseMoneyInput(raw, allowZero = false) {
	const cleaned = raw.replace(/\s/g, "").replace(",", ".");
	if (!cleaned) return null;
	const value = Number(cleaned);
	if (!Number.isFinite(value)) return null;
	if (allowZero ? value < 0 : value <= 0) return null;
	return Math.round(value);
}
function todayIso() {
	const now = /* @__PURE__ */ new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
/** Brutet räkenskapsår: 1 juli–30 juni. Nyckel = startår (2026 = 2026/2027). */
function currentFiscalYear(now = /* @__PURE__ */ new Date()) {
	const year = now.getFullYear();
	return now.getMonth() + 1 >= 7 ? year : year - 1;
}
function fiscalYearFromIso(isoDate) {
	const year = Number(isoDate.slice(0, 4));
	const month = Number(isoDate.slice(5, 7));
	if (!Number.isFinite(year) || !Number.isFinite(month)) return currentFiscalYear();
	return month >= 7 ? year : year - 1;
}
function fiscalYearLabel(startYear) {
	return `${startYear}/${startYear + 1}`;
}
function fiscalPeriodLabel(startYear) {
	return `1 juli ${startYear} – 30 juni ${startYear + 1}`;
}
function fiscalClosingLabel(startYear) {
	return `30 juni ${startYear + 1}`;
}
var EXPENSE_SWATCHES = [
	"var(--color-chart-housing)",
	"var(--color-chart-food)",
	"var(--color-chart-transport)",
	"var(--color-chart-bills)",
	"var(--color-chart-health)",
	"var(--color-chart-fun)",
	"var(--color-chart-shop)",
	"var(--color-chart-other)"
];
var INCOME_SWATCHES = [
	"var(--color-moss)",
	"var(--color-pine)",
	"var(--color-ink)",
	"var(--color-muted)"
];
var DEFAULT_CATEGORIES = [
	{
		id: "salary",
		name: "Lön",
		type: "income",
		swatch: "var(--color-moss)"
	},
	{
		id: "side",
		name: "Extraarbete",
		type: "income",
		swatch: "var(--color-pine)"
	},
	{
		id: "benefit",
		name: "Bidrag",
		type: "income",
		swatch: "var(--color-ink)"
	},
	{
		id: "income-other",
		name: "Övrig inkomst",
		type: "income",
		swatch: "var(--color-muted)"
	},
	{
		id: "housing",
		name: "Boende",
		type: "expense",
		swatch: "var(--color-chart-housing)"
	},
	{
		id: "food",
		name: "Mat & dryck",
		type: "expense",
		swatch: "var(--color-chart-food)"
	},
	{
		id: "transport",
		name: "Transport",
		type: "expense",
		swatch: "var(--color-chart-transport)"
	},
	{
		id: "bills",
		name: "Räkningar",
		type: "expense",
		swatch: "var(--color-chart-bills)"
	},
	{
		id: "health",
		name: "Hälsa",
		type: "expense",
		swatch: "var(--color-chart-health)"
	},
	{
		id: "fun",
		name: "Nöje",
		type: "expense",
		swatch: "var(--color-chart-fun)"
	},
	{
		id: "shop",
		name: "Shopping",
		type: "expense",
		swatch: "var(--color-chart-shop)"
	},
	{
		id: "other",
		name: "Övrigt",
		type: "expense",
		swatch: "var(--color-chart-other)"
	}
];
function categoriesFor(list, type) {
	return list.filter((c) => c.type === type);
}
function categoryById(list, id) {
	return list.find((c) => c.id === id);
}
function defaultCategory(list, type) {
	const preferred = type === "income" ? "salary" : "other";
	if (list.some((c) => c.id === preferred && c.type === type)) return preferred;
	return categoriesFor(list, type)[0]?.id ?? preferred;
}
function fallbackCategoryId(list, type, exceptId) {
	const rest = list.filter((c) => c.type === type && c.id !== exceptId);
	return rest.find((c) => c.id === "other" || c.id === "income-other" || c.name.toLowerCase().includes("övrig"))?.id ?? rest[0]?.id;
}
function nextSwatch(list, type) {
	const palette = type === "income" ? INCOME_SWATCHES : EXPENSE_SWATCHES;
	return palette[categoriesFor(list, type).length % palette.length] ?? palette[0];
}
function findDuplicate(list, type, name, exceptId) {
	const normalized = name.trim().toLocaleLowerCase("sv");
	return list.find((c) => c.type === type && c.id !== exceptId && c.name.trim().toLocaleLowerCase("sv") === normalized);
}
var EMPTY_YEAR_BOOK = {
	openingCash: 0,
	assets: [],
	liabilities: []
};
function seedMonth() {
	return monthKeyFromDate(/* @__PURE__ */ new Date());
}
function isoInMonth(month, day) {
	const [y, m] = month.split("-").map(Number);
	const last = new Date(y, m, 0).getDate();
	return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
}
function seedTransactions(month) {
	const d = (day) => isoInMonth(month, day);
	return [
		{
			id: "seed-lon",
			type: "income",
			amount: 38500,
			categoryId: "salary",
			note: "Månadslön",
			date: d(25)
		},
		{
			id: "seed-frilans",
			type: "income",
			amount: 4500,
			categoryId: "side",
			note: "Frilansuppdrag",
			date: d(12)
		},
		{
			id: "seed-hyra",
			type: "expense",
			amount: 14500,
			categoryId: "housing",
			note: "Hyra",
			date: d(1)
		},
		{
			id: "seed-ica",
			type: "expense",
			amount: 2450,
			categoryId: "food",
			note: "ICA",
			date: d(4)
		},
		{
			id: "seed-el",
			type: "expense",
			amount: 780,
			categoryId: "bills",
			note: "Elräkning",
			date: d(5)
		},
		{
			id: "seed-sl",
			type: "expense",
			amount: 1020,
			categoryId: "transport",
			note: "SL-kort",
			date: d(1)
		},
		{
			id: "seed-hemkop",
			type: "expense",
			amount: 890,
			categoryId: "food",
			note: "Hemköp",
			date: d(11)
		},
		{
			id: "seed-spotify",
			type: "expense",
			amount: 119,
			categoryId: "fun",
			note: "Spotify",
			date: d(3)
		},
		{
			id: "seed-gym",
			type: "expense",
			amount: 399,
			categoryId: "health",
			note: "Gymkort",
			date: d(2)
		},
		{
			id: "seed-klader",
			type: "expense",
			amount: 1290,
			categoryId: "shop",
			note: "Kläder",
			date: d(16)
		},
		{
			id: "seed-rest",
			type: "expense",
			amount: 640,
			categoryId: "fun",
			note: "Middag ute",
			date: d(18)
		},
		{
			id: "seed-apotek",
			type: "expense",
			amount: 175,
			categoryId: "health",
			note: "Apotek",
			date: d(9)
		},
		{
			id: "seed-bredband",
			type: "expense",
			amount: 399,
			categoryId: "bills",
			note: "Bredband",
			date: d(7)
		},
		{
			id: "seed-fika",
			type: "expense",
			amount: 165,
			categoryId: "food",
			note: "Fika",
			date: d(20)
		}
	];
}
function seedYearBooks() {
	return { [String(currentFiscalYear())]: {
		openingCash: 35e3,
		assets: [{
			id: "seed-spar",
			name: "Sparkonto",
			amount: 18e3
		}],
		liabilities: []
	} };
}
function bookFor(books, year) {
	return books[String(year)] ?? EMPTY_YEAR_BOOK;
}
var initialMonth = seedMonth();
var useBudgetStore = create()(persist((set, get) => ({
	transactions: seedTransactions(initialMonth),
	categories: DEFAULT_CATEGORIES,
	monthlyBudget: 25e3,
	selectedMonth: initialMonth,
	yearBooks: seedYearBooks(),
	addTransaction: (input) => set((state) => ({ transactions: [{
		id: crypto.randomUUID(),
		type: input.type,
		amount: input.amount,
		categoryId: input.categoryId,
		note: input.note.trim(),
		date: input.date
	}, ...state.transactions] })),
	updateTransaction: (id, input) => set((state) => ({ transactions: state.transactions.map((tx) => tx.id === id ? {
		...tx,
		type: input.type,
		amount: input.amount,
		categoryId: input.categoryId,
		note: input.note.trim(),
		date: input.date
	} : tx) })),
	deleteTransaction: (id) => set((state) => ({ transactions: state.transactions.filter((tx) => tx.id !== id) })),
	addCategory: (name, type) => {
		const trimmed = name.trim();
		if (!trimmed) return null;
		const { categories } = get();
		if (findDuplicate(categories, type, trimmed)) return null;
		const id = crypto.randomUUID();
		set({ categories: [...categories, {
			id,
			name: trimmed,
			type,
			swatch: nextSwatch(categories, type)
		}] });
		return id;
	},
	renameCategory: (id, name) => {
		const trimmed = name.trim();
		if (!trimmed) return false;
		const { categories } = get();
		const current = categories.find((c) => c.id === id);
		if (!current) return false;
		if (findDuplicate(categories, current.type, trimmed, id)) return false;
		set({ categories: categories.map((c) => c.id === id ? {
			...c,
			name: trimmed
		} : c) });
		return true;
	},
	deleteCategory: (id) => {
		const { categories, transactions } = get();
		const current = categories.find((c) => c.id === id);
		if (!current) return false;
		const fallback = fallbackCategoryId(categories, current.type, id);
		if (!fallback) return false;
		set({
			categories: categories.filter((c) => c.id !== id),
			transactions: transactions.map((tx) => tx.categoryId === id ? {
				...tx,
				categoryId: fallback
			} : tx)
		});
		return true;
	},
	setMonthlyBudget: (monthlyBudget) => set({ monthlyBudget }),
	setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
	setOpeningCash: (year, amount) => set((state) => {
		const key = String(year);
		const current = bookFor(state.yearBooks, year);
		return { yearBooks: {
			...state.yearBooks,
			[key]: {
				...current,
				openingCash: amount
			}
		} };
	}),
	addBalanceItem: (year, kind, name, amount) => {
		const trimmed = name.trim();
		if (!trimmed || amount <= 0) return null;
		const id = crypto.randomUUID();
		set((state) => {
			const key = String(year);
			const current = bookFor(state.yearBooks, year);
			return { yearBooks: {
				...state.yearBooks,
				[key]: {
					...current,
					[kind]: [...current[kind], {
						id,
						name: trimmed,
						amount
					}]
				}
			} };
		});
		return id;
	},
	removeBalanceItem: (year, kind, id) => set((state) => {
		const key = String(year);
		const current = bookFor(state.yearBooks, year);
		return { yearBooks: {
			...state.yearBooks,
			[key]: {
				...current,
				[kind]: current[kind].filter((item) => item.id !== id)
			}
		} };
	})
}), {
	name: "saldo-budget-v1",
	merge: (persisted, current) => {
		const p = persisted ?? {};
		const { savingsGoal, ...rest } = p;
		const fromNew = typeof rest.monthlyBudget === "number" && rest.monthlyBudget > 0 ? rest.monthlyBudget : void 0;
		const fromOld = typeof savingsGoal?.target === "number" && savingsGoal.target > 0 ? savingsGoal.target : void 0;
		return {
			...current,
			...rest,
			monthlyBudget: fromNew ?? fromOld ?? current.monthlyBudget,
			categories: Array.isArray(p.categories) && p.categories.length > 0 ? p.categories : current.categories,
			yearBooks: p.yearBooks && typeof p.yearBooks === "object" && !Array.isArray(p.yearBooks) ? p.yearBooks : current.yearBooks
		};
	}
}));
function monthTransactions(transactions, month) {
	return transactions.filter((tx) => tx.date.startsWith(month)).sort((a, b) => {
		if (a.date !== b.date) return a.date < b.date ? 1 : -1;
		if (a.type !== b.type) return a.type === "income" ? -1 : 1;
		return b.amount - a.amount;
	});
}
function monthTotals(transactions) {
	let income = 0;
	let expense = 0;
	for (const tx of transactions) if (tx.type === "income") income += tx.amount;
	else expense += tx.amount;
	return {
		income,
		expense,
		remaining: income - expense
	};
}
function spendingByCategory(transactions) {
	const map = /* @__PURE__ */ new Map();
	for (const tx of transactions) {
		if (tx.type !== "expense") continue;
		map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
	}
	return [...map.entries()].map(([categoryId, amount]) => ({
		categoryId,
		amount
	})).sort((a, b) => b.amount - a.amount);
}
//#endregion
export { shiftMonth as C, useBudgetStore as E, parseMoneyInput as S, todayIso as T, formatKr as _, buttonVariants as a, monthTransactions as b, cn as c, fallbackCategoryId as d, fiscalClosingLabel as f, formatDayLabel as g, fiscalYearLabel as h, Label as i, currentFiscalYear as l, fiscalYearFromIso as m, EMPTY_YEAR_BOOK as n, categoriesFor as o, fiscalPeriodLabel as p, Input as r, categoryById as s, Button as t, defaultCategory as u, formatMonthLabel as v, spendingByCategory as w, parseAmountInput as x, monthTotals as y };
