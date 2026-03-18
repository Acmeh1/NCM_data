import * as XLSX from "xlsx";

export async function parseFile(
  file: File
): Promise<Record<string, string | number>[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return parseCsv(file);
  } else if (ext === "xlsx" || ext === "xls") {
    return parseExcel(file);
  }
  throw new Error("Unsupported file type. Please upload a CSV or Excel file.");
}

async function parseCsv(
  file: File
): Promise<Record<string, string | number>[]> {
  const text = await file.text();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj: Record<string, string | number> = {};
    headers.forEach((h, i) => {
      const val = values[i] ?? "";
      const num = Number(val);
      obj[h] = val !== "" && !isNaN(num) ? num : val;
    });
    return obj;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

async function parseExcel(
  file: File
): Promise<Record<string, string | number>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(
    sheet
  );
  return jsonData;
}
