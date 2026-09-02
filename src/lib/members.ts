import { APP_NAME } from "@/lib/brand";
import { fiscalYearLabel, formatKr } from "@/lib/format";

export type AssociationMember = {
  id: string;
  name: string;
  email: string;
  property: string;
  address: string;
  share: number;
  fee: number;
  note: string;
};

export type MemberRegister = {
  members: AssociationMember[];
  defaultFee: number;
  dueDate: string;
  payment: string;
  message: string;
};

export const EMPTY_REGISTER: MemberRegister = {
  members: [],
  defaultFee: 0,
  dueDate: "",
  payment: "",
  message: "",
};

const NAME_KEYS = ["namn", "name", "medlem", "förnamn", "fulltnamn"];
const EMAIL_KEYS = ["e-post", "epost", "email", "mail", "e_post"];
const PROPERTY_KEYS = ["fastighet", "fastighetsbeteckning", "beteckning", "property", "lägenhet"];
const ADDRESS_KEYS = ["adress", "address", "gata", "postadress"];
const SHARE_KEYS = ["andel", "andelstal", "share", "andel %"];
const FEE_KEYS = ["avgift", "årsavgift", "fee", "belopp", "kr"];
const NOTE_KEYS = ["notering", "note", "kommentar", "anteckning"];

function normHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const found = Object.entries(row).find(([header]) => normHeader(header) === key || normHeader(header).includes(key));
    if (found?.[1]) return found[1].trim();
  }
  return "";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseCsvText(text: string): Record<string, string>[] {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headerLine = lines[0]!;
  const delimiter = (headerLine.match(/;/g)?.length ?? 0) > (headerLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitCsvLine(headerLine, delimiter);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header || `kolumn${index + 1}`] = cells[index] ?? "";
    });
    return row;
  });
}

function parseShare(raw: string): number {
  const n = Number(raw.replace("%", "").replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseFee(raw: string): number {
  const n = Number(raw.replace(/\s/g, "").replace("kr", "").replace("SEK", "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function rowsToMembers(rows: Record<string, string>[]): AssociationMember[] {
  const members: AssociationMember[] = [];
  for (const row of rows) {
    const name = pick(row, NAME_KEYS) || pick(row, ["kolumn1"]);
    const email = pick(row, EMAIL_KEYS).toLowerCase();
    const property = pick(row, PROPERTY_KEYS);
    if (!name && !email && !property) continue;
    members.push({
      id: crypto.randomUUID(),
      name: name || property || email || "Medlem",
      email,
      property,
      address: pick(row, ADDRESS_KEYS),
      share: parseShare(pick(row, SHARE_KEYS)),
      fee: parseFee(pick(row, FEE_KEYS)),
      note: pick(row, NOTE_KEYS),
    });
  }
  return members;
}

export function mergeMembers(current: AssociationMember[], incoming: AssociationMember[]): AssociationMember[] {
  const byKey = new Map<string, AssociationMember>();
  const keyOf = (member: AssociationMember) =>
    (member.email || member.property || member.name).trim().toLowerCase();
  for (const member of current) byKey.set(keyOf(member), member);
  for (const member of incoming) {
    const key = keyOf(member);
    const previous = byKey.get(key);
    byKey.set(key, previous ? { ...previous, ...member, id: previous.id } : member);
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

export function memberFee(member: AssociationMember, defaultFee: number): number {
  return member.fee > 0 ? member.fee : defaultFee;
}

export function invoiceBody(
  member: AssociationMember,
  register: MemberRegister,
  year: number,
): string {
  const amount = memberFee(member, register.defaultFee);
  const lines = [
    `Faktura från ${APP_NAME}`,
    "",
    `Mottagare: ${member.name}`,
    member.property ? `Fastighet: ${member.property}` : null,
    member.address ? `Adress: ${member.address}` : null,
    member.email ? `E-post: ${member.email}` : null,
    "",
    `Årsavgift räkenskapsår ${fiscalYearLabel(year)}: ${formatKr(amount)}`,
    register.dueDate ? `Förfallodag: ${register.dueDate}` : null,
    member.property ? `Referens: ${member.property}` : `Referens: ${member.name}`,
    register.payment ? `Betalning: ${register.payment}` : null,
    register.message ? "" : null,
    register.message || null,
    "",
    "Med vänlig hälsning",
    APP_NAME,
  ];
  return lines.filter((line) => line !== null).join("\n");
}

export function invoiceMailto(member: AssociationMember, register: MemberRegister, year: number): string {
  const subject = `Faktura ${APP_NAME} ${fiscalYearLabel(year)}`;
  return `mailto:${encodeURIComponent(member.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(invoiceBody(member, register, year))}`;
}
