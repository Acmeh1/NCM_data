import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Download, FileSpreadsheet, Pencil, FileText } from "lucide-react";
import type { EmballageEntry } from "@/hooks/useEmballageStore";
import { exportToExcel, exportToCsvGeneric, exportToPdf } from "@/lib/exportUtils";
import TableFilters, { useTableFilters } from "@/components/TableFilters";

interface Props {
  entries: EmballageEntry[];
  onDelete?: (id: string) => void;
  onEdit?: (entry: EmballageEntry) => void;
}

const FILTER_CONFIGS = [
  { key: "Date", label: "Date", type: "dateRange" as const },
  { key: "Groupe", label: "Groupe", type: "select" as const },
  { key: "Horaire", label: "Horaire", type: "select" as const },
];

function flattenEntries(entries: EmballageEntry[]) {
  const rows: Record<string, any>[] = [];
  entries.forEach((e) => {
    e.choix.forEach((c) => {
      rows.push({
        Date: e.Date,
        Horaire: e.Horaire,
        "H. Début": e.Heure_Debut,
        "H. Fin": e.Heure_Fin,
        Groupe: e.Groupe,
        "Chef Éq.": e.Chef_Equipe,
        Modèle: e.Modele,
        Couleur: e.Couleur,
        Format: e.Format,
        "Type Choix": c.Choice_Type,
        "Nb Palette": c.Nb_Palette,
        "Surface/Palette": c.Surface_par_palette,
        "Surface Totale m²": c.Surface_totale_m2,
        "Reste m²": c.Reste_m2,
        _id: e.id,
      });
    });
  });
  return rows;
}

export default function EmballageTable({ entries, onDelete, onEdit }: Props) {
  const flat = flattenEntries(entries);

  const { filteredData, filterValues, setFilter, clearFilters, hasActiveFilters, uniqueValues } =
    useTableFilters(flat, FILTER_CONFIGS);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-base font-medium">Aucune donnée d'emballage</p>
      </div>
    );
  }

  const exportData = filteredData.map(({ _id, ...rest }) => rest);
  const headers = Object.keys(flat[0]).filter((h) => h !== "_id");

  return (
    <div className="space-y-3">
      <TableFilters
        filterConfigs={FILTER_CONFIGS}
        filterValues={filterValues}
        uniqueValues={uniqueValues}
        onSetFilter={setFilter}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {filteredData.length} / {flat.length} ligne{flat.length > 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToCsvGeneric(exportData, "production_emballage")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToExcel(exportData, "production_emballage")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToPdf(exportData, "production_emballage")}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>
      <div className="rounded-lg border overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]" />
              {headers.map((h) => (
                <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, idx) => (
              <TableRow key={idx} className="group">
                <TableCell className="flex gap-1">
                  {onEdit && (
                    <Button variant="ghost" size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const entry = entries.find((e) => e.id === row._id);
                        if (entry) onEdit(entry);
                      }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => onDelete(row._id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
                {headers.map((h) => (
                  <TableCell key={h} className="font-mono text-xs whitespace-nowrap">
                    {typeof row[h] === "number" ? row[h].toFixed(2) : String(row[h] ?? "—")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
