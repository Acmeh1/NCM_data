import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Download, FileSpreadsheet, Pencil } from "lucide-react";
import type { SelectionEntry } from "@/hooks/useSelectionStore";
import { exportToExcel, exportToCsvGeneric } from "@/lib/exportUtils";
import TableFilters, { useTableFilters } from "@/components/TableFilters";

interface Props {
  entries: SelectionEntry[];
  onDelete?: (id: string) => void;
  onEdit?: (entry: SelectionEntry) => void;
}

const COLUMNS: { key: keyof SelectionEntry; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "groupe", label: "Groupe" },
  { key: "horaire", label: "Horaire" },
  { key: "heure_debut", label: "H. Début" },
  { key: "heure_fin", label: "H. Fin" },
  { key: "chef_equipe", label: "Chef Éq." },
  { key: "modele", label: "Modèle" },
  { key: "couleur", label: "Couleur" },
  { key: "format", label: "Format" },
  { key: "zone_presse", label: "Z. Presse" },
  { key: "zone_projecta", label: "Z. Projecta m²" },
  { key: "zone_four", label: "Z. Four" },
  { key: "choix_1_m2", label: "1er Choix m²" },
  { key: "choix_1_taux", label: "1er %" },
  { key: "choix_2_m2", label: "2ème Choix m²" },
  { key: "choix_2_taux", label: "2ème %" },
  { key: "choix_3_m2", label: "3ème Choix m²" },
  { key: "choix_3_taux", label: "3ème %" },
  { key: "calibre_taux", label: "Calibre %" },
  { key: "calibre_cause", label: "Calibre Cause" },
  { key: "planeite_taux", label: "Planéité %" },
  { key: "planeite_cause", label: "Planéité Cause" },
  { key: "operateur_aspect_taux", label: "Aspect %" },
  { key: "operateur_aspect_cause", label: "Aspect Cause" },
  { key: "tonalite_taux", label: "Tonalité %" },
  { key: "tonalite_cause", label: "Tonalité Cause" },
  { key: "duree_vide_maintenance", label: "Vide Maint. (min)" },
  { key: "intervention_maintenance", label: "Intervention Maint." },
  { key: "duree_vide_production", label: "Vide Prod. (min)" },
  { key: "intervention_production", label: "Intervention Prod." },
];

const FILTER_CONFIGS = [
  { key: "date", label: "Date", type: "date" as const },
  { key: "groupe", label: "Groupe", type: "select" as const },
  { key: "horaire", label: "Horaire", type: "select" as const },
  { key: "modele", label: "Modèle", type: "select" as const },
];

export default function ProductionSelectionTable({ entries, onDelete, onEdit }: Props) {
  // Build filterable rows
  const rows = entries.map((e) => {
    const row: Record<string, any> = { _entry_id: e.id };
    row.date = e.date;
    row.groupe = e.groupe;
    row.horaire = e.horaire;
    row.modele = e.modele;
    return row;
  });

  const { filteredData, filterValues, setFilter, clearFilters, hasActiveFilters, uniqueValues } =
    useTableFilters(rows, FILTER_CONFIGS);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-base font-medium">Aucune donnée</p>
        <p className="text-sm">Remplissez le formulaire ci-dessus pour ajouter des rapports.</p>
      </div>
    );
  }

  const filteredEntries = filteredData.map((r) => entries.find((e) => e.id === r._entry_id)!).filter(Boolean);

  const exportData = filteredEntries.map((e) => {
    const row: Record<string, any> = {};
    COLUMNS.forEach((c) => { row[c.label] = e[c.key]; });
    // Also add arrets info
    if (e.arrets && e.arrets.length > 0) {
      row["Arrêts"] = e.arrets.map((a) => `${a.zone}: ${a.duree_min}min - ${a.intervention_cause}`).join(" | ");
    }
    return row;
  });

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
          {filteredEntries.length} / {entries.length} rapport{entries.length > 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToCsvGeneric(exportData, "production_selection")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToExcel(exportData, "production_selection")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>
      <div className="rounded-lg border overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]" />
              {COLUMNS.map((col) => (
                <TableHead key={col.key} className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.slice().reverse().map((entry) => (
              <TableRow key={entry.id} className="group">
                <TableCell className="flex gap-1">
                  {onEdit && (
                    <Button variant="ghost" size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onEdit(entry)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => onDelete(entry.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
                {COLUMNS.map((col) => (
                  <TableCell key={col.key} className="font-mono text-xs whitespace-nowrap">
                    {typeof entry[col.key] === "number"
                      ? (entry[col.key] as number).toFixed(2)
                      : String(entry[col.key] ?? "—")}
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
