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
  const fixed = fixMojibake(value);
  return fixed
    .replace(/\u00a0/g, " ")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(?:\s*,\s*)+/g, ", ")
    .replace(/^[\s,;]+|[\s,;]+$/g, "")
    .replace(/^\.+$/, "")
    .trim();
}

function fixMojibake(value: string): string {
  if (!/[ÃÂ]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    if (!decoded.includes("\uFFFD") && decoded !== value) return decoded;
  } catch {
    /* keep original */
  }
  return value;
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
  if (text.length < 3 || text.includes("@") || looksLikeProperty(text) || looksLikePhone(text) || looksLikeStreet(text)) return false;
  if (isJunkToken(text) || looksLikePostal(text)) return false;
  if (/\d/.test(text)) return false;
  if (HEADER_WORDS.includes(normHeader(text))) return false;
  return /[a-zA-ZåäöÅÄÖ]/.test(text);
}

function looksLikePostal(value: string): boolean {
  return /^\d{3}\s?\d{2}$/.test(tidyText(value));
}

function looksLikeStreet(value: string): boolean {
  const text = tidyText(value);
  if (!text || looksLikePostal(text) || looksLikePhone(text) || looksLikeEmail(text) || looksLikeProperty(text)) return false;
  return /[a-zA-ZåäöÅÄÖ]/.test(text) && /\d/.test(text);
}

const JUNK_WORDS = new Set([
  "sevat", "sek", "vat", "company", "private", "print", "email", "true", "false",
  "ab", "hb", "kb", "a", "b", "c", "yes", "no", "ja", "nej", "none", "null",
]);

function isJunkToken(value: string): boolean {
  const text = tidyText(value);
  if (!text || text === ".") return true;
  if (JUNK_WORDS.has(normHeader(text))) return true;
  if (/^\d+$/.test(text) && text.length !== 5) return true;
  return false;
}

function looksLikeHeaderRow(value: string): boolean {
  return HEADER_WORDS.includes(normHeader(value));
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

function explodeValue(value: string): string[] {
  const text = String(value ?? "");
  const commas = (text.match(/,/g) ?? []).length;
  const semis = (text.match(/;/g) ?? []).length;
  if (commas >= 5 || semis >= 5) {
    return splitCsvLine(text, commas >= semis ? "," : ";").flatMap((cell) => explodeValue(cell));
  }
  return [text];
}

function classifyValues(values: string[]): Pick<AssociationMember, "name" | "email" | "property" | "address" | "phone"> {
  const tokens = values
    .flatMap(explodeValue)
    .map(tidyText)
    .filter((token) => token.length > 0 && !looksLikeHeaderRow(token) && !isJunkToken(token));

  const emails = tokens.filter(looksLikeEmail);
  const phones = tokens.filter(looksLikePhone);
  const properties = tokens.filter(looksLikeProperty);
  const streets = tokens.filter(looksLikeStreet);
  const postals = tokens.filter(looksLikePostal);
  const cities: string[] = [];
  tokens.forEach((token, index) => {
    if (looksLikePostal(token)) {
      const next = tokens[index + 1];
      if (next && looksLikePerson(next) && !looksLikeEmail(next)) cities.push(next);
    }
  });
  const citySet = new Set(cities);
  const names = tokens.filter((token) => looksLikePerson(token) && !citySet.has(token));
  const address = tidyText(
    [streets[0] ?? "", [postals[0] ?? "", cities[0] ?? ""].filter(Boolean).join(" ")].filter(Boolean).join(", "),
  );
  return {
    name: tidyText(names[0] ?? ""),
    email: tidyText(emails[0] ?? "").toLowerCase(),
    property: tidyText(properties[0] ?? ""),
    address,
    phone: tidyText(phones[0] ?? ""),
  };
}

export function repairMember(member: AssociationMember): AssociationMember | null {
  const classified = classifyValues([
    member.name,
    member.email,
    member.property,
    member.address,
    member.phone,
    member.note,
  ]);
  if (!classified.name && !classified.email && !classified.property && !classified.address) return null;
  return {
    ...member,
    name: classified.name || classified.property || classified.email || "Medlem",
    email: looksLikeEmail(classified.email) ? classified.email : "",
    property: classified.property,
    address: classified.address,
    phone: classified.phone,
    note: "",
    customerNo: tidyText(member.customerNo),
    share: member.share > 0 ? member.share : 1,
  };
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
    : first.map((_, index) => `kolumn${index + 1}`);
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
    const classified = classifyValues(values);
    const repaired = repairMember({
      id: crypto.randomUUID(),
      name: pick(row, NAME_KEYS) || classified.name,
      email: pick(row, EMAIL_KEYS) || classified.email,
      property: pick(row, PROPERTY_KEYS) || classified.property,
      address: pick(row, ADDRESS_KEYS) || classified.address,
      phone: pick(row, PHONE_KEYS) || classified.phone,
      customerNo: pick(row, CUSTOMER_KEYS),
      share: parseShare(pick(row, SHARE_KEYS)),
      fee: parseFee(pick(row, FEE_KEYS)),
      note: "",
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