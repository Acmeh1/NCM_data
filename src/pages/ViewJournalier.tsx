import { useState } from "react";
import { useProductionStore, type ProductionEntry } from "@/hooks/useProductionStore";
import { useSelectionStore, type SelectionEntry } from "@/hooks/useSelectionStore";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileSpreadsheet, Pencil, FileText, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { exportToExcel, exportToCsvGeneric, exportToPdf } from "@/lib/exportUtils";
import TableFilters, { useTableFilters } from "@/components/TableFilters";
import EditEntryDialog, { type EditColumn } from "@/components/EditEntryDialog";
import { Checkbox } from "@/components/ui/checkbox";
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

  { key: "Nb_Pieces_Four", label: "Nb Pièces Four", type: "number" },
  { key: "Surface_CAR_m2", label: "Surface CAR m²", type: "number" },
  { key: "Cuisson_M2", label: "Production Four m²", type: "number" },
  { key: "Four_Minutes_Vides", label: "Minutes vides Four", type: "number" },
  { key: "VIDE_f_maintenance", label: "Vide Maintenance", type: "number" },
  { key: "VIDE_f_production", label: "Vide Production", type: "number" },
  { key: "Four_Consommation_Kwh", label: "Consommation Four kW/h", type: "number" },
];

const EXTRA_SELECTION_COLUMNS: { key: keyof SelectionEntry; label: string; type?: "text" | "number" }[] = [];

const EDIT_COLUMNS: EditColumn[] = COLUMNS.map((c) => ({
  key: c.key,
  label: c.label,
  type: c.type ?? "text",
}));

const FILTER_CONFIGS = [
  { key: "Date", label: "Date", type: "dateRange" as const },
  { key: "Groupe", label: "Groupe", type: "select" as const },
  { key: "Horaire", label: "Horaire", type: "select" as const },
  { key: "Modele", label: "Modèle", type: "select" as const },
];

export default function ViewJournalier() {
  const [showVideDetails, setShowVideDetails] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { entries, isLoaded, updateEntry, deleteEntry, deleteMultipleEntries } = useProductionStore();
  const { entries: selectionEntries, isLoaded: selectionLoaded } = useSelectionStore();
  const { productionEdit } = usePermissions();
  const navigate = useNavigate();
  const [editingEntry, setEditingEntry] = useState<ProductionEntry | null>(null);

  const sorted = [...entries].sort((a, b) => String(b.Date || "").localeCompare(String(a.Date || "")));

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

  const activeColumns = COLUMNS.filter(c => {
    if (c.key === "VIDE_f_maintenance" || c.key === "VIDE_f_production") {
      return showVideDetails;
    }
    return true;
  });

  const headers = [...activeColumns.map((c) => c.label), ...EXTRA_SELECTION_COLUMNS.map((c) => c.label)];
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

  const handleDeleteClick = async (row: Record<string, any>) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette production ?")) {
      const entry = entries.find((e) => e.id === row._id);
      if (entry) {
        await deleteEntry(entry);
        toast.success("Entrée supprimée avec succès");
      }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredData.map(r => r._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement les ${selectedIds.size} entrées sélectionnées ?`)) {
      const success = await deleteMultipleEntries(Array.from(selectedIds));
      if (success) {
        toast.success(`${selectedIds.size} entrées supprimées avec succès`);
        setSelectedIds(new Set());
      }
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
        <div className="flex gap-2 items-center">
          {selectedIds.size > 0 && productionEdit && (
            <Button variant="destructive" size="sm" className="gap-2 mr-2" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4" /> Supprimer ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToCsvGeneric(exportData, "production_journalier")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToExcel(exportData, "production_journalier")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToPdf(exportData, "production_journalier")}>
            <FileText className="h-4 w-4" /> PDF
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
              {productionEdit && (
                <TableHead className="w-[40px] px-3">
                  <Checkbox 
                    checked={filteredData.length > 0 && selectedIds.size === filteredData.length}
                    onCheckedChange={(c) => handleSelectAll(!!c)}
                  />
                </TableHead>
              )}
              <TableHead className="w-[80px]" />
              {activeColumns.map((c) => (
                <TableHead 
                  key={c.key} 
                  className={`font-semibold text-xs uppercase tracking-wider whitespace-nowrap ${c.key === "Four_Minutes_Vides" ? "cursor-help text-primary hover:underline" : ""}`}
                  onClick={() => c.key === "Four_Minutes_Vides" && setShowVideDetails(!showVideDetails)}
                >
                  {c.label}
                </TableHead>
              ))}
              {EXTRA_SELECTION_COLUMNS.map((col) => (
                <TableHead key={String(col.key)} className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, idx) => (
              <TableRow key={idx} className={`group ${selectedIds.has(row._id) ? "bg-muted/30" : ""}`}>
                {productionEdit && (
                  <TableCell className="px-3">
                    <Checkbox 
                      checked={selectedIds.has(row._id)}
                      onCheckedChange={(c) => handleSelectRow(row._id, !!c)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {productionEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10"
                        onClick={() => handleRowClick(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {productionEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(row)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                {activeColumns.map((c) => {
                  const val = row[c.label];
                  const hasVideValue = c.key === "Four_Minutes_Vides" && Number(val) > 0;
                  return (
                    <TableCell 
                      key={c.key} 
                      className={`font-mono text-xs whitespace-nowrap ${hasVideValue ? "cursor-pointer text-primary font-bold hover:bg-primary/5" : ""}`}
                      onClick={() => hasVideValue && setShowVideDetails(!showVideDetails)}
                    >
                      {typeof val === "number" ? val.toFixed(2) : String(val ?? "—")}
                    </TableCell>
                  );
                })}
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
