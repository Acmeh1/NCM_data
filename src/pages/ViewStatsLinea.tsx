import { useState } from "react";
import { useStatsLineaStore, type StatsLineaEntry } from "@/hooks/useStatsLineaStore";
import { useProductionStore } from "@/hooks/useProductionStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileSpreadsheet, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { exportToExcel, exportToCsvGeneric, exportToPdf } from "@/lib/exportUtils";
import TableFilters, { useTableFilters } from "@/components/TableFilters";
import EditEntryDialog, { type EditColumn } from "@/components/EditEntryDialog";
import { toast } from "sonner";
import { FileText } from "lucide-react";

const STAT_FIELDS: { key: string; label: string; type: "number" }[] = [
  { key: "total_pieces", label: "Total pièces", type: "number" },
  { key: "total_surface_m2", label: "Total m²", type: "number" },
  { key: "choix1_pourcentage", label: "Choix1 %", type: "number" },
  { key: "choix2_pourcentage", label: "Choix2 %", type: "number" },
  { key: "choix3_pourcentage", label: "Choix3 %", type: "number" },
  { key: "machine_allumee", label: "Machine allumée", type: "number" },
  { key: "machine_en_marche", label: "Machine en marche", type: "number" },
  { key: "production_reelle_m2", label: "Prod. réelle m²", type: "number" },
  { key: "vitesse_moyenne_pieces_min", label: "Vitesse moy.", type: "number" },
  { key: "choix1_pieces", label: "Choix1 Pièces", type: "number" },
  { key: "choix1_surface_m2", label: "Choix1 Surface m²", type: "number" },
  { key: "choix2_pieces", label: "Choix2 Pièces", type: "number" },
  { key: "choix2_surface_m2", label: "Choix2 Surface m²", type: "number" },
  { key: "choix3_pieces", label: "Choix3 Pièces", type: "number" },
  { key: "choix3_surface_m2", label: "Choix3 Surface m²", type: "number" },
  { key: "minutes_absence_alimentation", label: "Min. Absence Alim.", type: "number" },
  { key: "minutes_urgence_manuelle", label: "Min. Urgence Man.", type: "number" },
  { key: "minutes_machine_saturee", label: "Min. Machine Saturée", type: "number" },
  { key: "minutes_total_machine", label: "Min. Total Machine", type: "number" },
  { key: "statut_donnees", label: "Statut", type: "string" as any },
  { key: "motif_incomplet", label: "Motif", type: "string" as any },
];

const EDIT_COLUMNS: EditColumn[] = STAT_FIELDS.map((f) => ({ key: f.key, label: f.label, type: f.type }));

const FILTER_CONFIGS = [
  { key: "Date", label: "Date", type: "dateRange" as const },
  { key: "Groupe", label: "Groupe", type: "select" as const },
  { key: "Horaire", label: "Horaire", type: "select" as const },
];

export default function ViewStatsLinea() {
  const { entries: stats, isLoaded, updateEntry } = useStatsLineaStore();
  const { entries: productions, isLoaded: pLoaded } = useProductionStore();
  const navigate = useNavigate();
  const [editingEntry, setEditingEntry] = useState<StatsLineaEntry | null>(null);

  const DISPLAY_HEADERS = ["Date", "Horaire", "Groupe", "Modele", ...STAT_FIELDS.map((f) => f.label)];

  const rows = [...stats]
    .map((s) => {
      const prod = productions.find((p) => p.id === s.production_id);
      const row: Record<string, any> = {
        _id: s.id,
        Date: prod?.Date ?? "—",
        Horaire: prod?.Horaire ?? "—",
        Groupe: prod?.Groupe ?? "—",
        Modele: prod?.Modele ?? "—",
        Statut: s.statut_donnees || "Complet",
      };
      STAT_FIELDS.forEach((f) => { row[f.label] = (s as any)[f.key]; });
      return row;
    })
    .sort((a, b) => (b.Date as string).localeCompare(a.Date as string));

  const { filteredData, filterValues, setFilter, clearFilters, hasActiveFilters, uniqueValues } =
    useTableFilters(rows, FILTER_CONFIGS);

  if (!isLoaded || !pLoaded) return <p className="text-muted-foreground p-8">Chargement…</p>;

  const handleRowClick = (row: Record<string, any>) => {
    const entry = stats.find((s) => s.id === row._id);
    if (entry) setEditingEntry(entry);
  };

  const handleSave = async (updated: Record<string, any>) => {
    const result = await updateEntry(updated as StatsLineaEntry);
    if (result) {
      toast.success("Statistique mise à jour");
      setEditingEntry(null);
    }
  };

  const exportData = filteredData.map(({ _id, ...rest }) => rest);

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/production/stats-linea")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Aperçu — Stats Linea</h1>
            <p className="text-sm text-muted-foreground">{filteredData.length} statistiques</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToCsvGeneric(exportData, "stats_linea")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToExcel(exportData, "stats_linea")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToPdf(exportData, "stats_linea")}>
            <FileText className="h-4 w-4" /> PDF
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
              {DISPLAY_HEADERS.map((h) => (
                <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, idx) => {
              const isIncomplet = row.Statut === "Incomplet";
              const isNonSaisi = row.Statut === "Non saisi";

              return (
                <TableRow 
                  key={idx} 
                  className={`group ${isIncomplet ? "bg-destructive/5 text-destructive italic" : isNonSaisi ? "opacity-50 grayscale" : ""}`}
                >
                  <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRowClick(row)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  </TableCell>
                  {DISPLAY_HEADERS.map((h) => (
                    <TableCell 
                      key={h} 
                      className={`font-mono text-xs whitespace-nowrap ${h === "Statut" && isIncomplet ? "font-bold text-destructive" : ""}`}
                    >
                      {typeof row[h] === "number" ? row[h].toFixed(2) : String(row[h] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <EditEntryDialog
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        columns={EDIT_COLUMNS}
        entry={editingEntry}
        onSave={handleSave}
        title="Modifier — Stats Linea"
      />
    </div>
  );
}
