import { useState } from "react";
import { useSelectionStore, type SelectionEntry } from "@/hooks/useSelectionStore";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileSpreadsheet, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { exportToExcel, exportToCsvGeneric } from "@/lib/exportUtils";
import TableFilters, { useTableFilters } from "@/components/TableFilters";
import EditEntryDialog, { type EditColumn } from "@/components/EditEntryDialog";
import { toast } from "sonner";

const COLUMNS: { key: string; label: string; type?: "text" | "number" }[] = [
  { key: "date", label: "Date" }, { key: "groupe", label: "Groupe" }, { key: "horaire", label: "Horaire" },
  { key: "heure_debut", label: "H. Début" }, { key: "heure_fin", label: "H. Fin" },
  { key: "chef_equipe", label: "Chef Éq." }, { key: "modele", label: "Modèle" },
  { key: "couleur", label: "Couleur" }, { key: "format", label: "Format" },
  { key: "zone_presse", label: "Z. Presse", type: "number" }, { key: "zone_projecta", label: "Z. Projecta m²", type: "number" },
  { key: "zone_four", label: "Z. Four", type: "number" },
  { key: "choix_1_m2", label: "1er Choix m²", type: "number" }, { key: "choix_1_taux", label: "1er %", type: "number" },
  { key: "choix_2_m2", label: "2ème Choix m²", type: "number" }, { key: "choix_2_taux", label: "2ème %", type: "number" },
];

const EDIT_COLUMNS: EditColumn[] = COLUMNS.map((c) => ({ key: c.key, label: c.label, type: c.type ?? "text" }));

const FILTER_CONFIGS = [
  { key: "date", label: "Date", type: "date" as const },
  { key: "groupe", label: "Groupe", type: "select" as const },
  { key: "horaire", label: "Horaire", type: "select" as const },
];

export default function ViewSelection() {
  const { entries, isLoaded, updateEntry } = useSelectionStore();
  const { productionEdit } = usePermissions();
  const navigate = useNavigate();
  const [editingEntry, setEditingEntry] = useState<SelectionEntry | null>(null);

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const rows = sorted.map((e) => {
    const row: Record<string, any> = { _id: e.id };
    COLUMNS.forEach((c) => { row[c.label] = (e as any)[c.key]; });
    row.date = e.date;
    row.groupe = e.groupe;
    row.horaire = e.horaire;
    return row;
  });

  const { filteredData, filterValues, setFilter, clearFilters, hasActiveFilters, uniqueValues } =
    useTableFilters(rows, FILTER_CONFIGS);

  if (!isLoaded) return <p className="text-muted-foreground p-8">Chargement…</p>;

  const headers = COLUMNS.map((c) => c.label);
  const exportData = filteredData.map(({ _id, ...r }) => {
    const out: Record<string, any> = {};
    headers.forEach((h) => { out[h] = r[h]; });
    return out;
  });

  const handleRowClick = (row: Record<string, any>) => {
    const entry = entries.find((e) => e.id === row._id);
    if (entry) setEditingEntry(entry);
  };

  const handleSave = async (updated: Record<string, any>) => {
    const result = await updateEntry(updated as SelectionEntry);
    if (result) {
      toast.success("Rapport mis à jour");
      setEditingEntry(null);
    }
  };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/production/selection")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Aperçu — Sélection & Qualité</h1>
            <p className="text-sm text-muted-foreground">{filteredData.length} rapports</p>
          </div>
        </div>
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

      <TableFilters filterConfigs={FILTER_CONFIGS} filterValues={filterValues}
        uniqueValues={uniqueValues} onSetFilter={setFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} />

      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40px]" />
              {headers.map((h) => (
                <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, idx) => (
              <TableRow key={idx} className="group">
                <TableCell>
                  {productionEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRowClick(row)}>
                      <Pencil className="h-3.5 w-3.5" />
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

      <EditEntryDialog
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        columns={EDIT_COLUMNS}
        entry={editingEntry}
        onSave={handleSave}
        title="Modifier — Sélection & Qualité"
      />
    </div>
  );
}
