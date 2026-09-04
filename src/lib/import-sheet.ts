import { headerMatches, isKoholmaAddressSheet, membersFromSheet, parseCsvText, NAME_KEYS, EMAIL_KEYS, ADDRESS_KEYS, PROPERTY_KEYS } from "@/lib/members";

async function readCsvText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("\uFFFD")) return utf8;
  return new TextDecoder("windows-1252").decode(buffer);
}

function memberToRow(member: {
  name: string;
  address: string;
  postal?: string;
  zip?: string;
  city?: string;
  property: string;
  email: string;
  phone: string;
  note: string;
}): Record<string, string> {
  return {
    Namn: member.name,
    Adress: member.address,
    Postnr: member.zip ?? member.postal ?? "",
    Postort: member.city ?? "",
    Fastighet: member.property,
    Email: member.email,
    Telefon: member.phone,
    Notering: member.note,
  };
}

export async function rowsFromFile(file: File): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
    const header = Array.isArray(matrix[0]) ? matrix[0] : [];

    // If the first row has named column headers (Namn, E-post, Adress etc),
    // use them directly — this handles exports from this app and structured sheets.
    const hasNamedHeaders = header.some((h) =>
      headerMatches(String(h), NAME_KEYS) ||
      headerMatches(String(h), EMAIL_KEYS) ||
      headerMatches(String(h), ADDRESS_KEYS) ||
      headerMatches(String(h), PROPERTY_KEYS)
    );
    if (hasNamedHeaders) {
      return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
    }

    // Fall back to legacy Koholma positional format (no headers)
    if (isKoholmaAddressSheet(header) || matrix.length > 1) {
      return membersFromSheet(matrix).map(memberToRow);
    }
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
  }
  return parseCsvText(await readCsvText(file));
}
