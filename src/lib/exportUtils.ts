import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToCsvGeneric(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(";"),
    ...data.map((row) =>
      headers.map((h) => {
        const val = String(row[h] ?? "");
        return val.includes(";") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(";")
    ),
  ];
  const csv = "\uFEFF" + csvRows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}_${dateStamp()}.csv`);
}

export function exportToExcel(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}_${dateStamp()}.xlsx`);
}

export function exportToPdf(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  
  const doc = new jsPDF({ orientation: "landscape" });
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => String(row[h] ?? "")));

  doc.text(`Export: ${filename}`, 14, 15);
  doc.setFontSize(8);
  doc.text(`Généré le: ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 25,
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`${filename}_${dateStamp()}.pdf`);
}

function dateStamp() {
  return new Date().toISOString().split("T")[0];
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
