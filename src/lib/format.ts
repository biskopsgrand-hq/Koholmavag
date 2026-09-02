import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

export function formatKr(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatIsoDate(value: string): string {
  const iso = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : value;
}

export function monthKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseMonthKey(key: string): Date {
  return parseISO(`${key}-01`);
}

export function formatMonthLabel(key: string): string {
  const raw = format(parseMonthKey(key), "LLLL yyyy", { locale: sv });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatDayLabel(isoDate: string): string {
  return format(parseISO(isoDate), "d MMM", { locale: sv });
}

export function shiftMonth(key: string, delta: number): string {
  const date = parseMonthKey(key);
  date.setMonth(date.getMonth() + delta);
  return monthKeyFromDate(date);
}

export function fiscalMonthKeys(startYear: number): string[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = ((6 + index) % 12) + 1;
    const year = startYear + (6 + index >= 12 ? 1 : 0);
    return `${year}-${String(month).padStart(2, "0")}`;
  });
}

export function formatMonthShort(key: string): string {
  const raw = format(parseMonthKey(key), "LLL", { locale: sv });
  return raw.replace(".", "").slice(0, 3);
}

export function parseAmountInput(raw: string): number | null {
  return parseMoneyInput(raw, false);
}

export function parseMoneyInput(raw: string, allowZero = false): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  if (allowZero ? value < 0 : value <= 0) return null;
  return Math.round(value);
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Brutet räkenskapsår: 1 juli–30 juni. Nyckel = startår (2026 = 2026/2027). */
export function currentFiscalYear(now = new Date()): number {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 7 ? year : year - 1;
}

export function fiscalYearFromIso(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month)) return currentFiscalYear();
  return month >= 7 ? year : year - 1;
}

export function fiscalYearLabel(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

export function fiscalPeriodLabel(startYear: number): string {
  return `1 juli ${startYear} – 30 juni ${startYear + 1}`;
}

export function fiscalClosingLabel(startYear: number): string {
  return `30 juni ${startYear + 1}`;
}
