import { isKoholmaAddressSheet, membersFromSheet, parseCsvText } from "@/lib/members";

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
  property: string;
  email: string;
  phone: string;
  note: string;
}): Record<string, string> {
  return {
    Namn: member.name,
    Adress: member.address,
    Postnr: member.postal ?? "",
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
    if (isKoholmaAddressSheet(header) || matrix.length > 1) {
      return membersFromSheet(matrix).map(memberToRow);
    }
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
  }
  return parseCsvText(await readCsvText(file));
}