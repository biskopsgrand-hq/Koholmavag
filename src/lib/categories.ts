export type TxType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  type: TxType;
  /** Token color used as a CSS color value (theme tokens). */
  swatch: string;
};

const EXPENSE_SWATCHES = [
  "var(--color-chart-housing)",
  "var(--color-chart-food)",
  "var(--color-chart-transport)",
  "var(--color-chart-bills)",
  "var(--color-chart-health)",
  "var(--color-chart-fun)",
  "var(--color-chart-shop)",
  "var(--color-chart-other)",
];

const INCOME_SWATCHES = [
  "var(--color-moss)",
  "var(--color-pine)",
  "var(--color-ink)",
  "var(--color-muted)",
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "member-fee", name: "Årsavgift", type: "income", swatch: "var(--color-moss)" },
  { id: "salary", name: "Lön", type: "income", swatch: "var(--color-pine)" },
  { id: "side", name: "Extraarbete", type: "income", swatch: "var(--color-ink)" },
  { id: "income-other", name: "Övrig inkomst", type: "income", swatch: "var(--color-muted)" },

  { id: "housing", name: "Boende", type: "expense", swatch: "var(--color-chart-housing)" },
  { id: "food", name: "Mat & dryck", type: "expense", swatch: "var(--color-chart-food)" },
  { id: "transport", name: "Transport", type: "expense", swatch: "var(--color-chart-transport)" },
  { id: "bills", name: "Räkningar", type: "expense", swatch: "var(--color-chart-bills)" },
  { id: "health", name: "Hälsa", type: "expense", swatch: "var(--color-chart-health)" },
  { id: "fun", name: "Nöje", type: "expense", swatch: "var(--color-chart-fun)" },
  { id: "shop", name: "Shopping", type: "expense", swatch: "var(--color-chart-shop)" },
  { id: "other", name: "Övrigt", type: "expense", swatch: "var(--color-chart-other)" },
];

export function categoriesFor(list: Category[], type: TxType): Category[] {
  return list.filter((c) => c.type === type);
}

export function categoryById(list: Category[], id: string): Category | undefined {
  return list.find((c) => c.id === id);
}

export function defaultCategory(list: Category[], type: TxType): string {
  const preferred = type === "income" ? "salary" : "other";
  if (list.some((c) => c.id === preferred && c.type === type)) return preferred;
  return categoriesFor(list, type)[0]?.id ?? preferred;
}

export function fallbackCategoryId(
  list: Category[],
  type: TxType,
  exceptId?: string,
): string | undefined {
  const rest = list.filter((c) => c.type === type && c.id !== exceptId);
  const other = rest.find((c) => c.id === "other" || c.id === "income-other" || c.name.toLowerCase().includes("övrig"));
  return other?.id ?? rest[0]?.id;
}

export function nextSwatch(list: Category[], type: TxType): string {
  const palette = type === "income" ? INCOME_SWATCHES : EXPENSE_SWATCHES;
  const used = categoriesFor(list, type).length;
  return palette[used % palette.length] ?? palette[0];
}

export function findDuplicate(list: Category[], type: TxType, name: string, exceptId?: string): Category | undefined {
  const normalized = name.trim().toLocaleLowerCase("sv");
  return list.find(
    (c) => c.type === type && c.id !== exceptId && c.name.trim().toLocaleLowerCase("sv") === normalized,
  );
}
