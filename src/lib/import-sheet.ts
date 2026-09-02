import { parseCsvText } from "@/lib/members";

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
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
  }
  const text = await file.text();
  return parseCsvText(text);
}
