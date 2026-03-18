import type { DataRow } from "@/hooks/useDataStore";

export function exportToCsv(rows: DataRow[], columns: string[]) {
  const allCols = ["id", "timestamp", ...columns];
  const header = allCols.join(",");
  const body = rows
    .map((row) =>
      allCols
        .map((col) => {
          const val = row[col] ?? "";
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    )
    .join("\n");

  const csv = header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `data-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
