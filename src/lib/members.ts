import { APP_NAME } from "@/lib/brand";
import { fiscalYearLabel, formatKr } from "@/lib/format";

export type AssociationMember = {
  id: string;
  name: string;
  email: string;
  property: string;
  address: string;
  phone: string;
  customerNo: string;
  share: number;
  fee: number;
  note: string;
};

export type MemberRegister = {
  members: AssociationMember[];
  deletedIds: string[];
  defaultFee: number;
  dueDate: string;
  payment: string;
  message: string;
};

export const EMPTY_REGISTER: MemberRegister = {
  members: [],
  deletedIds: [],
  defaultFee: 0,
  dueDate: "",
  payment: "",
  message: "",
};

const NAME_KEYS = ["namn", "name", "medlem", "förnamn", "efternamn", "fulltnamn", "ägare", "lagfaren", "kontaktperson", "kontakt", "person", "innehavare"];
const EMAIL_KEYS = ["e-post", "epost", "e post", "email", "e-mail", "mailadress"];
const PROPERTY_KEYS = ["fastighetsbeteckning", "fastighet", "beteckning", "property", "lägenhet", "tomt"];
const ADDRESS_KEYS = ["adress", "address", "gata", "postadress", "gatuadress"];
const POSTAL_KEYS = ["postnr", "postnummer", "postkod", "zip"];
const CITY_KEYS = ["ort", "stad", "postort", "city"];
const SHARE_KEYS = ["andelstal", "andel", "share"];
const FEE_KEYS = ["årsavgift", "avgift", "belopp", "fee"];
const NOTE_KEYS = ["notering", "note", "kommentar", "anteckning"];
const PHONE_KEYS = ["telefon", "tel", "mobil", "phone", "cellphone", "mobilnr"];
const CUSTOMER_KEYS = ["kundnr", "kundnummer", "kund nr", "customer"];
const HEADER_WORDS = [
  "fastighetsbeteckning",
  "namn",
  "ägare",
  "andel",
  "adress",
  "e-post",
  "email",
  "telefon",
  "kundnr",
  "avgift",
];

function normHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function headerMatches(header: string, keys: string[]): boolean {
  const h = normHeader(header).replace(/[_./]+/g, " ");
  return keys.some((key) => h === key || h.startsWith(`${key} `) || h.endsWith(` ${key}`) || h.includes(` ${key} `) || (key.length >= 5 && h.includes(key)));
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const [header, value] of Object.entries(row)) {
    if (headerMatches(header, keys) && value.trim()) return value.trim();
  }
  return "";
}

function columnValues(row: Record<string, string>): string[] {
  return Object.values(row).map((value) => String(value ?? "").trim());
}

export function tidyText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(?:\s*,\s*)+/g, ", ")
    .replace(/^[\s,;]+|[\s,;]+$/g, "")
    .trim();
}

function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && /^[+0-9][\d\s()/.-]*$/.test(value.trim());
}

export function looksLikeProperty(value: string): boolean {
  return /^(koholma\s+)?\d+\s*:\s*\d+$/i.test(tidyText(value));
}

export function looksLikePerson(value: string): boolean {
  const text = tidyText(value);
  if (text.length < 3 || text.includes("@") || looksLikeProperty(text) || looksLikePhone(text)) return false;
  if (/^\d+([.,]\d+)?$/.test(text) || /^\d{3}\s?\d{2}/.test(text)) return false;
  if (/\d/.test(text)) return false;
  if (HEADER_WORDS.includes(normHeader(text))) return false;
  return /[a-zA-ZåäöÅÄÖ]/.test(text);
}

function looksLikeHeaderRow(value: string): boolean {
  return HEADER_WORDS.includes(normHeader(value));
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function repairMember(member: AssociationMember): AssociationMember | null {
  const tokens = [member.name, member.email, member.property, member.address, member.phone, member.note]
    .flatMap((value) => String(value ?? "").split(/[,;]/))
    .map(tidyText)
    .filter((token) => token.length > 0 && !looksLikeHeaderRow(token) && !/^\d+([.,]\d+)?$/.test(token));

  if (tokens.length === 0) return null;

  const emails = tokens.filter(looksLikeEmail);
  const phones = tokens.filter(looksLikePhone);
  const properties = tokens.filter(looksLikeProperty);
  const used = new Set([...emails, ...phones, ...properties]);
  const rest = tokens.filter((token) => !used.has(token));
  const names = rest.filter(looksLikePerson);
  const addressParts = rest.filter((token) => !names.includes(token));

  const name = tidyText(names[0] ?? "");
  const property = tidyText(properties[0] ?? "");
  const email = tidyText(emails[0] ?? "").toLowerCase();
  const phone = tidyText(phones[0] ?? "");
  const address = tidyText(addressParts.join(", "));

  if (!name && !email && !property) return null;
  return {
    ...member,
    name: name || property || email || "Medlem",
    email: looksLikeEmail(email) ? email : "",
    property,
    address,
    phone,
    note: "",
    customerNo: tidyText(member.customerNo),
    share: member.share > 0 ? member.share : 1,
  };
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

function detectDelimiter(headerLine: string): string {
  const options: { d: string; n: number }[] = [
    { d: ";", n: (headerLine.match(/;/g) ?? []).length },
    { d: "\t", n: (headerLine.match(/\t/g) ?? []).length },
    { d: ",", n: (headerLine.match(/,/g) ?? []).length },
  ];
  options.sort((a, b) => b.n - a.n);
  return options[0] && options[0].n > 0 ? options[0].d : ";";
}

export function parseCsvText(text: string): Record<string, string>[] {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(lines[0]!);
  const first = splitCsvLine(lines[0]!, delimiter);
  const hasHeader = first.some((cell) => HEADER_WORDS.includes(normHeader(cell)) || headerMatches(cell, NAME_KEYS) || headerMatches(cell, PROPERTY_KEYS));
  const headers = hasHeader
    ? first.map((cell, index) => cell || `kolumn${index + 1}`)
    : first.map((_, index) => (index === 0 ? "Fastighetsbeteckning" : index === 1 ? "Namn" : index === 2 ? "Andel" : `kolumn${index + 1}`));
  const body = hasHeader ? lines.slice(1) : lines;
  return body.map((line) => {
    const cells = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = tidyText(cells[index] ?? "");
    });
    return row;
  });
}

function parseShare(raw: string): number {
  const n = Number(raw.replace("%", "").replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseFee(raw: string): number {
  const n = Number(raw.replace(/\s/g, "").replace(/kr|sek/ig, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function rowsToMembers(rows: Record<string, string>[]): AssociationMember[] {
  const members: AssociationMember[] = [];
  for (const row of rows) {
    const values = columnValues(row);
    const propertyPick = pick(row, PROPERTY_KEYS) || values.find(looksLikeProperty) || "";
    const emailPick = pick(row, EMAIL_KEYS) || values.find(looksLikeEmail) || "";
    const namePick =
      pick(row, NAME_KEYS) ||
      values.find((value) => looksLikePerson(value) && value !== propertyPick && value !== emailPick) ||
      "";
    const phonePick = pick(row, PHONE_KEYS) || values.find(looksLikePhone) || "";
    const postal = [pick(row, POSTAL_KEYS), pick(row, CITY_KEYS)].filter(Boolean).join(" ");
    const address = tidyText([pick(row, ADDRESS_KEYS), postal].filter(Boolean).join(", "));
    const repaired = repairMember({
      id: crypto.randomUUID(),
      name: tidyText(namePick),
      email: tidyText(emailPick),
      property: tidyText(propertyPick),
      address,
      phone: tidyText(phonePick),
      customerNo: tidyText(pick(row, CUSTOMER_KEYS)),
      share: parseShare(pick(row, SHARE_KEYS) || values.find((value) => /^\d+([.,]\d+)?$/.test(value)) || ""),
      fee: parseFee(pick(row, FEE_KEYS)),
      note: pick(row, NOTE_KEYS),
    });
    if (repaired) members.push(repaired);
  }
  return members;
}

export function memberKey(member: Pick<AssociationMember, "email" | "property" | "name">): string {
  return (member.email || member.property || member.name).trim().toLowerCase();
}

export function mergeMembers(current: AssociationMember[], incoming: AssociationMember[]): AssociationMember[] {
  const byKey = new Map<string, AssociationMember>();
  const byId = new Map<string, AssociationMember>();
  for (const member of [...current, ...incoming]) {
    const previous = byId.get(member.id) ?? byKey.get(memberKey(member));
    const next = previous ? { ...previous, ...member, id: previous.id } : member;
    byId.set(next.id, next);
    byKey.set(memberKey(next), next);
  }
  return [...new Map([...byId.values()].map((member) => [member.id, member])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, "sv"),
  );
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
    register.message || null,
    "",
    "Med vänlig hälsning",
    APP_NAME,
  ];
  return lines.filter((line) => line !== null).join("\n");
}

export function invoiceSubject(year: number): string {
  return `Faktura ${APP_NAME} ${fiscalYearLabel(year)}`;
}

export function invoiceMailto(member: AssociationMember, register: MemberRegister, year: number): string {
  const body = [
    invoiceBody(member, register, year),
    "",
    "Fakturan i PDF bifogas detta mejl.",
  ].join("\n");
  return `mailto:${encodeURIComponent(member.email)}?subject=${encodeURIComponent(invoiceSubject(year))}&body=${encodeURIComponent(body)}`;
}