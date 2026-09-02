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
  return /\d+\s*:\s*\d+/.test(value) || /^koholma\b/i.test(value.trim());
}

export function looksLikePerson(value: string): boolean {
  const text = value.trim();
  if (text.length < 3 || text.includes("@") || looksLikeProperty(text) || /^\d+([.,]\d+)?$/.test(text)) return false;
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
  let name = tidyText(member.name);
  let email = tidyText(member.email);
  let property = tidyText(member.property);
  let address = tidyText(member.address);
  let phone = tidyText(member.phone ?? "");
  const share = member.share;
  const extra: string[] = [];

  if (looksLikeHeaderRow(name) && looksLikeProperty(email) && looksLikePerson(property)) {
    name = property;
    property = email;
    email = "";
  }
  if (looksLikeHeaderRow(name) || looksLikeHeaderRow(property)) return null;

  if (email && !looksLikeEmail(email)) {
    extra.push(email);
    email = "";
  }
  if (looksLikePhone(name) && !looksLikePerson(name)) {
    extra.push(name);
    name = "";
  }
  if (looksLikeProperty(name) && looksLikePerson(property)) {
    const swap = name;
    name = property;
    property = swap;
  }
  if (looksLikeProperty(name)) {
    const person = extra.find(looksLikePerson);
    if (person) {
      extra.splice(extra.indexOf(person), 1);
      if (!looksLikeProperty(property)) property = name;
      name = person;
    }
  }
  if (!looksLikeProperty(property)) {
    const found = extra.find(looksLikeProperty);
    if (found) {
      extra.splice(extra.indexOf(found), 1);
      if (looksLikePerson(property) && !looksLikePerson(name)) name = property;
      property = found;
    }
  }
  if (!looksLikePerson(name)) {
    const person = extra.find(looksLikePerson);
    if (person) {
      extra.splice(extra.indexOf(person), 1);
      name = person;
    }
  }
  if (!phone) {
    const found = extra.find(looksLikePhone);
    if (found) {
      extra.splice(extra.indexOf(found), 1);
      phone = found;
    }
  }
  if (!looksLikeEmail(email)) {
    const found = extra.find(looksLikeEmail);
    if (found) {
      extra.splice(extra.indexOf(found), 1);
      email = found;
    }
  }
  if (!address) {
    address = extra
      .filter((item) => looksLikePerson(item) === false && !looksLikeProperty(item) && !looksLikePhone(item) && !looksLikeEmail(item) && !/^\d+([.,]\d+)?$/.test(item) && !looksLikeHeaderRow(item))
      .map(tidyText)
      .filter(Boolean)
      .join(", ");
  }

  name = tidyText(name);
  address = tidyText(address);
  property = tidyText(property);
  email = tidyText(email).toLowerCase();
  phone = tidyText(phone);

  if (!name && !email && !property) return null;
  return {
    ...member,
    name: name || property || email || "Medlem",
    email: looksLikeEmail(email) ? email : "",
    property,
    address,
    phone,
    share: share > 0 ? share : 1,
    note: tidyText(member.note),
    customerNo: tidyText(member.customerNo),
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