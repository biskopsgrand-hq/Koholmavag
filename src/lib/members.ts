import { APP_NAME } from "@/lib/brand";
import { fiscalYearLabel, formatKr } from "@/lib/format";

export type AssociationMember = {
  id: string;
  name: string;
  email: string;
  property: string;
  address: string;
  zip: string;
  city: string;
  postal: string;
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
  listId?: string;
};

export const EMPTY_REGISTER: MemberRegister = {
  members: [],
  deletedIds: [],
  defaultFee: 0,
  dueDate: "",
  payment: "",
  message: "",
  listId: "",
};

export const KOHOLMA_LIST_ID = "adresslista-koholma-2026-postnr";

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

export function formatProperty(value: string): string {
  const match = tidyText(value).match(/(\d+)\s*:\s*(\d+)/);
  if (!match) return tidyText(value);
  return `Koholma ${match[1]}:${match[2]}`;
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

export function looksLikePostalLine(value: string): boolean {
  return /^\d{3}\s?\d{2}\b/.test(tidyText(value));
}

export function formatZip(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 5) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return tidyText(value);
}

export function parseZipCity(value: string): { zip: string; city: string } {
  const text = tidyText(value);
  const match = text.match(/^(\d{3}\s?\d{2})\s*(.*)$/);
  if (!match) return { zip: "", city: text };
  return { zip: formatZip(match[1] ?? ""), city: tidyText(match[2] ?? "") };
}

export function formatPostal(zip: string, city: string): string {
  return [formatZip(zip), tidyText(city)].filter(Boolean).join(" ");
}

export function splitStreetAndPostal(address: string): { street: string; postal: string; zip: string; city: string } {
  const lines = address
    .split(/[\n,]/)
    .map(tidyText)
    .filter(Boolean);
  const postal = lines.find(looksLikePostalLine) ?? "";
  const street = lines.filter((line) => line !== postal).join(", ");
  const parsed = parseZipCity(postal);
  return { street, postal: formatPostal(parsed.zip, parsed.city), zip: parsed.zip, city: parsed.city };
}

function looksLikeStreet(value: string): boolean {
  const text = tidyText(value);
  if (!text || looksLikePostal(text) || looksLikePostalLine(text) || looksLikePhone(text) || looksLikeEmail(text) || looksLikeProperty(text)) return false;
  if (/\d+\s*:\s*\d+/.test(text)) return false;
  return /[a-zA-ZåäöÅÄÖ]/.test(text) && /\d/.test(text);
}

const JUNK_WORDS = new Set([
  "sevat", "sek", "vat", "company", "private", "print", "email", "true", "false",
  "ab", "hb", "kb", "a", "b", "c", "yes", "no", "ja", "nej", "none", "null",
]);

function isJunkToken(value: string): boolean {
  const text = tidyText(value);
  if (!text || text === ".") return true;
  if (looksLikePhone(text) || looksLikeEmail(text) || looksLikeProperty(text) || looksLikePostal(text)) return false;
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

function classifyValues(values: string[]): Pick<AssociationMember, "name" | "email" | "property" | "address" | "zip" | "city" | "postal" | "phone"> {
  const tokens = values
    .flatMap(explodeValue)
    .map(tidyText)
    .filter((token) => token.length > 0 && !looksLikeHeaderRow(token) && !isJunkToken(token));

  const emails = tokens.filter(looksLikeEmail);
  const phones = tokens.filter(looksLikePhone);
  const properties = tokens.filter(looksLikeProperty);
  const streets = tokens.filter(looksLikeStreet);
  const postalLines = tokens.filter(looksLikePostalLine);
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
  const postal = tidyText(postalLines[0] ?? [postals[0] ?? "", cities[0] ?? ""].filter(Boolean).join(" "));
  const parsed = parseZipCity(postal);
  return {
    name: tidyText(names[0] ?? ""),
    email: tidyText(emails[0] ?? "").toLowerCase(),
    property: tidyText(properties[0] ?? ""),
    address: tidyText(streets[0] ?? ""),
    zip: parsed.zip,
    city: parsed.city,
    postal: formatPostal(parsed.zip, parsed.city),
    phone: tidyText(phones[0] ?? ""),
  };
}

export function repairMember(member: AssociationMember): AssociationMember | null {
  const classified = classifyValues([
    member.name,
    member.email,
    member.property,
    member.address,
    member.postal,
    member.zip,
    member.city,
    member.phone,
    member.note,
  ]);
  if (!classified.name && !classified.email && !classified.property && !classified.address) return null;
  const split = splitStreetAndPostal([classified.address, classified.postal || member.postal].filter(Boolean).join(", "));
  const zip = classified.zip || member.zip || split.zip;
  const city = classified.city || member.city || split.city;
  return {
    ...member,
    name: classified.name || classified.property || classified.email || "Medlem",
    email: looksLikeEmail(classified.email) ? classified.email : "",
    property: classified.property,
    address: split.street || classified.address,
    zip,
    city,
    postal: formatPostal(zip, city),
    phone: classified.phone || member.phone,
    note: member.note,
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
      zip: formatZip(pick(row, POSTAL_KEYS) || classified.zip),
      city: pick(row, CITY_KEYS) || classified.city,
      postal: classified.postal,
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

function emailsIn(text: string): string[] {
  return (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []).map((email) => email.toLowerCase());
}

export function memberFromSheetRow(cells: string[]): AssociationMember | null {
  const values = cells.map(tidyText);
  const name = values[0] ?? "";
  if (!name || /^namn$/i.test(name)) return null;
  const propIdx = values.findIndex((cell, index) => index >= 1 && looksLikeProperty(cell));
  const addressParts = values.slice(1, propIdx === -1 ? 4 : propIdx).filter((cell) => cell && cell !== "0");
  let tail = propIdx >= 0 ? values.slice(propIdx) : values.slice(4);
  const properties: string[] = [];
  if (tail[0] && looksLikeProperty(tail[0])) {
    properties.push(formatProperty(tail[0]!));
    tail = tail.slice(1);
  }
  let note = "";
  if (/^(ja|nej)$/i.test(tail[0] ?? "")) {
    if (/^nej$/i.test(tail[0]!)) note = "Ej medlem";
    tail = tail.slice(1);
  }
  if (tail[0] && looksLikeProperty(tail[0])) {
    properties.push(formatProperty(tail[0]!));
    tail = tail.slice(1);
  }
  const blob = tail.join(" ");
  const emails = emailsIn(blob);
  const phones = tail.filter((cell) => looksLikePhone(cell) || /^\d{8,12}$/.test(cell));
  if (phones.length === 0) {
    const loose = blob.match(/0[\d][\d\s-]{6,}/g) ?? [];
    phones.push(...loose.map(tidyText));
  }
  const extra = tail
    .filter((cell) => !looksLikeEmail(cell) && !looksLikePhone(cell) && !looksLikeProperty(cell) && cell.length > 2)
    .join(" ");
  const postalCell = addressParts.find(looksLikePostalLine) ?? "";
  const streetParts = addressParts.filter((cell) => cell !== postalCell);
  const parsed = parseZipCity(postalCell);
  const member: AssociationMember = {
    id: crypto.randomUUID(),
    name,
    email: emails[0] ?? "",
    property: properties.join(", "),
    address: tidyText(streetParts.join(", ")),
    zip: parsed.zip,
    city: parsed.city,
    postal: formatPostal(parsed.zip, parsed.city),
    phone: tidyText(phones[0] ?? ""),
    customerNo: "",
    share: 1,
    fee: 0,
    note: [note, extra, emails.slice(1).join(", ")].filter(Boolean).join(" · "),
  };
  return member.name ? member : null;
}

export function membersFromSheet(matrix: unknown[][]): AssociationMember[] {
  return matrix
    .map((row) => memberFromSheetRow((Array.isArray(row) ? row : []).map((cell) => String(cell ?? ""))))
    .filter((row): row is AssociationMember => row !== null);
}

export function isKoholmaAddressSheet(header: unknown[]): boolean {
  const text = header.map((cell) => normHeader(String(cell ?? ""))).join(" ");
  return text.includes("namn") && (text.includes("fastighet") || text.includes("mobilnr") || text.includes("email"));
}

function seedMatchKey(member: Pick<AssociationMember, "email" | "name" | "property">): string[] {
  const keys = [member.name.trim().toLowerCase().replace(/\s+/g, " ")];
  if (member.email.includes("@")) keys.push(member.email.trim().toLowerCase());
  for (const part of member.property.split(/[,/]/).map((item) => item.trim().toLowerCase()).filter(Boolean)) {
    keys.push(part);
  }
  return keys;
}

function hasZip(value: string | undefined): boolean {
  return /^\d{3}\s?\d{2}\b/.test(tidyText(value ?? ""));
}

export function ensurePostal(member: AssociationMember): AssociationMember {
  let zip = formatZip(member.zip ?? "");
  let city = tidyText(member.city ?? "");
  let address = member.address;
  if (!hasZip(zip)) {
    const fromPostal = parseZipCity(member.postal ?? "");
    if (hasZip(fromPostal.zip)) {
      zip = fromPostal.zip;
      city = city || fromPostal.city;
    }
  }
  if (!hasZip(zip)) {
    const split = splitStreetAndPostal(member.address);
    if (hasZip(split.zip)) {
      zip = split.zip;
      city = city || split.city;
      address = split.street || address;
    }
  }
  return { ...member, address, zip: hasZip(zip) ? zip : "", city, postal: formatPostal(zip, city) };
}

export function applySeedPhones(members: AssociationMember[], seed: AssociationMember[]): { members: AssociationMember[]; changed: number } {
  const index = new Map<string, AssociationMember>();
  for (const row of seed) {
    for (const key of seedMatchKey(row)) index.set(key, row);
  }
  let changed = 0;
  const next = members.map((member) => {
    const base = ensurePostal(member);
    const hit = seedMatchKey(base).map((key) => index.get(key)).find(Boolean);
    if (!hit) return base;
    const zip = hasZip(base.zip) ? formatZip(base.zip) : hit.zip;
    const city = tidyText(base.city) || hit.city;
    const updated: AssociationMember = {
      ...base,
      address: base.address.trim() || hit.address,
      zip,
      city,
      postal: formatPostal(zip, city),
      email: base.email.trim() || hit.email,
      phone: base.phone.trim() || hit.phone,
      property: base.property.trim() || hit.property,
      name: base.name.trim() || hit.name,
    };
    if (
      updated.zip !== member.zip ||
      updated.city !== member.city ||
      updated.postal !== member.postal ||
      updated.phone !== member.phone ||
      updated.email !== member.email ||
      updated.address !== member.address
    ) {
      changed += 1;
    }
    return updated;
  });
  return { members: next, changed };
}

export function memberKey(member: Pick<AssociationMember, "email" | "property" | "name">): string {
  return (member.email || member.property || member.name).trim().toLowerCase();
}

function nonEmpty(value: string | undefined): string {
  return (value ?? "").trim();
}

function pickCustom(seedValue: string, ...values: string[]): string {
  const filled = values.map(nonEmpty).filter(Boolean);
  const seed = nonEmpty(seedValue);
  return filled.find((value) => value !== seed) || filled[0] || seed;
}

export function mergeMemberFields(base: AssociationMember, overlay: AssociationMember, seed?: AssociationMember | null): AssociationMember {
  return {
    ...base,
    ...overlay,
    id: base.id || overlay.id,
    name: pickCustom(seed?.name ?? "", overlay.name, base.name),
    email: pickCustom(seed?.email ?? "", overlay.email, base.email),
    property: pickCustom(seed?.property ?? "", overlay.property, base.property),
    address: pickCustom(seed?.address ?? "", overlay.address, base.address),
    zip: hasZip(overlay.zip) ? formatZip(overlay.zip) : hasZip(base.zip) ? formatZip(base.zip) : formatZip(seed?.zip ?? ""),
    city: nonEmpty(overlay.city) || nonEmpty(base.city) || nonEmpty(seed?.city),
    postal: formatPostal(
      hasZip(overlay.zip) ? overlay.zip : hasZip(base.zip) ? base.zip : seed?.zip ?? "",
      nonEmpty(overlay.city) || nonEmpty(base.city) || seed?.city || "",
    ),
    phone: pickCustom(seed?.phone ?? "", overlay.phone, base.phone),
    note: pickCustom(seed?.note ?? "", overlay.note, base.note),
    customerNo: pickCustom(seed?.customerNo ?? "", overlay.customerNo, base.customerNo),
    share: overlay.share || base.share,
    fee: overlay.fee || base.fee,
  };
}

export function mergeMemberLists(lists: AssociationMember[][], seed: AssociationMember[] = []): AssociationMember[] {
  const seedByKey = new Map<string, AssociationMember>();
  for (const row of seed) {
    seedByKey.set(memberKey(row), row);
    if (row.email) seedByKey.set(row.email.toLowerCase(), row);
    seedByKey.set(row.name.trim().toLowerCase(), row);
  }
  const byId = new Map<string, AssociationMember>();
  const byKey = new Map<string, AssociationMember>();
  for (const list of lists) {
    for (const member of list) {
      const previous = byId.get(member.id) ?? byKey.get(memberKey(member));
      const seedHit = seedByKey.get(member.id) ?? seedByKey.get(memberKey(member)) ?? seedByKey.get(member.email) ?? seedByKey.get(member.name.trim().toLowerCase());
      const next = previous ? mergeMemberFields(previous, member, seedHit) : member;
      byId.set(next.id, next);
      byKey.set(memberKey(next), next);
    }
  }
  return [...new Map([...byId.values()].map((member) => [member.id, member])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, "sv"),
  );
}

export function mergeMembers(current: AssociationMember[], incoming: AssociationMember[]): AssociationMember[] {
  return mergeMemberLists([current, incoming]);
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