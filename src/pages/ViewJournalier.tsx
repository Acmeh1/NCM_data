import { useState } from "react";
import { useProductionStore, type ProductionEntry } from "@/hooks/useProductionStore";
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
  { key: "Date", label: "Date" },
  { key: "Horaire", label: "Horaire" },
  { key: "Heure_Debut", label: "H. Début" },
  { key: "Heure_Fin", label: "H. Fin" },
  { key: "Groupe", label: "Groupe" },
  { key: "Chef_Equipe", label: "Chef Éq." },
  { key: "Modele", label: "Modèle" },
  { key: "Couleur", label: "Couleur" },
  { key: "Format", label: "Format" },
  { key: "Choix_1_m2", label: "1er Choix m²", type: "number" },
  { key: "Choix_2_m2", label: "2ème Choix m²", type: "number" },
  { key: "Choix_3_m2", label: "3ème Choix m²", type: "number" },
  { key: "Total_m2", label: "Total m²", type: "number" },
  { key: "Pressage_m2", label: "Pressage m²", type: "number" },
  { key: "Project_m2", label: "Projecta m²", type: "number" },
  { key: "Emaillage_m2", label: "Emaillage m²", type: "number" },
  { key: "Cycle_min", label: "Cycle min", type: "number" },
  { key: "Nb_Pieces_Four", label: "Nb Pièces Four", type: "number" },
  { key: "Surface_CAR_m2", label: "Surface CAR m²", type: "number" },
  { key: "Cuisson_M2", label: "Production Four m²", type: "number" },
  { key: "Four_Minutes_Vides", label: "Minutes vides Four", type: "number" },
  { key: "Four_Consommation_Kwh", label: "Consommation Four kW/h", type: "number" },
];

const EXTRA_SELECTION_COLUMNS: { key: keyof SelectionEntry; label: string; type?: "text" | "number" }[] = [
  { key: "duree_vide_maintenance", label: "Vide Maint. (min)", type: "number" },
  { key: "intervention_maintenance", label: "Intervention Maint.", type: "text" },
  { key: "duree_vide_production", label: "Vide Prod. (min)", type: "number" },
  { key: "intervention_production", label: "Cause production", type: "text" },
];

const EDIT_COLUMNS: EditColumn[] = COLUMNS.map((c) => ({
  key: c.key,
  label: c.label,
  type: c.type ?? "text",
}));

const FILTER_CONFIGS = [
  { key: "Date", label: "Date", type: "date" as const },
  { key: "Groupe", label: "Groupe", type: "select" as const },
  { key: "Horaire", label: "Horaire", type: "select" as const },
  { key: "Modele", label: "Modèle", type: "select" as const },
];

export default function ViewJournalier() {
  const { entries, isLoaded, updateEntry } = useProductionStore();
  const { entries: selectionEntries, isLoaded: selectionLoaded } = useSelectionStore();
  const { productionEdit } = usePermissions();
  const navigate = useNavigate();
  const [editingEntry, setEditingEntry] = useState<ProductionEntry | null>(null);

  const sorted = [...entries].sort((a, b) => b.Date.localeCompare(a.Date));

  const selectionByKey = new Map<string, SelectionEntry>();
  selectionEntries.forEach((s) => {
    selectionByKey.set(`${s.date}||${s.groupe}||${s.horaire}`, s);
  });

  const rows = sorted.map((e) => {
    const row: Record<string, any> = { _id: e.id };
    COLUMNS.forEach((c) => { row[c.label] = (e as any)[c.key]; });
    const sel = selectionByKey.get(`${e.Date}||${e.Groupe}||${e.Horaire}`);
    EXTRA_SELECTION_COLUMNS.forEach((c) => { row[c.label] = sel ? (sel as any)[c.key] : undefined; });
    row.Date = e.Date;
    row.Groupe = e.Groupe;
    row.Horaire = e.Horaire;
    row.Modele = e.Modele;
    return row;
  });

  const { filteredData, filterValues, setFilter, clearFilters, hasActiveFilters, uniqueValues } =
    useTableFilters(rows, FILTER_CONFIGS);

  if (!isLoaded || !selectionLoaded) return <p className="text-muted-foreground p-8">Chargement…</p>;

  const headers = [...COLUMNS.map((c) => c.label), ...EXTRA_SELECTION_COLUMNS.map((c) => c.label)];
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
    const result = await updateEntry(updated as ProductionEntry);
    if (result) {
      toast.success("Entrée mise à jour");
      setEditingEntry(null);
    }
  };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/production/journalier")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Aperçu — Production Journalier</h1>
            <p className="text-sm text-muted-foreground">{filteredData.length} entrées</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToCsvGeneric(exportData, "production_journalier")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToExcel(exportData, "production_journalier")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <TableFilters
        filterConfigs={FILTER_CONFIGS}
        filterValues={filterValues}
        uniqueValues={uniqueValues}
        onSetFilter={setFilter}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

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
        title="Modifier — Production Journalier"
      />
    </div>
  );
}
