import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import type { StatsLineaEntry } from "@/hooks/useStatsLineaStore";
import type { ProductionEntry } from "@/hooks/useProductionStore";
import { exportToExcel, exportToCsvGeneric } from "@/lib/exportUtils";
import TableFilters, { useTableFilters } from "@/components/TableFilters";

interface Props {
  stats: StatsLineaEntry[];
  productions: ProductionEntry[];
  onEdit: (entry: StatsLineaEntry) => void;
  onDelete: (id: string) => void;
}

const FILTER_CONFIGS = [
  { key: "Date", label: "Date", type: "date" as const },
  { key: "Groupe", label: "Groupe", type: "select" as const },
  { key: "Horaire", label: "Horaire", type: "select" as const },
];

export default function StatsLineaTable({ stats, productions, onEdit, onDelete }: Props) {
  const rows = stats.map((s) => {
    const prod = productions.find((p) => p.id === s.production_id);
    return {
      Date: prod?.Date ?? "—",
      Horaire: prod?.Horaire ?? "—",
      Groupe: prod?.Groupe ?? "—",
      Modele: prod?.Modele ?? "—",
      Format: prod?.Format ?? "—",
      "Choix1 Pièces": s.choix1_pieces,
      "Choix1 Surface m²": s.choix1_surface_m2,
      "Choix1 %": s.choix1_pourcentage,
      "Choix2 Pièces": s.choix2_pieces,
      "Choix2 Surface m²": s.choix2_surface_m2,
      "Choix2 %": s.choix2_pourcentage,
      "Choix3 Pièces": s.choix3_pieces,
      "Choix3 Surface m²": s.choix3_surface_m2,
      "Choix3 %": s.choix3_pourcentage,
      "Total pièces": s.total_pieces,
      "Total m²": s.total_surface_m2,
      "C1 Opérateur pcs": s.choix1_operateur_pieces,
      "C1 Opérateur %": s.choix1_operateur_pourcentage,
      "C1 Planar pcs": s.choix1_planar_pieces,
      "C1 Planar %": s.choix1_planar_pourcentage,
      "C1 Calibre pcs": s.choix1_calibre_pieces,
      "C1 Calibre %": s.choix1_calibre_pourcentage,
      "C2 Opérateur pcs": s.choix2_operateur_pieces,
      "C2 Opérateur %": s.choix2_operateur_pourcentage,
      "C2 Planar pcs": s.choix2_planar_pieces,
      "C2 Planar %": s.choix2_planar_pourcentage,
      "C2 Calibre pcs": s.choix2_calibre_pieces,
      "C2 Calibre %": s.choix2_calibre_pourcentage,
      "C3 Opérateur pcs": s.choix3_operateur_pieces,
      "C3 Opérateur %": s.choix3_operateur_pourcentage,
      "C3 Planar pcs": s.choix3_planar_pieces,
      "C3 Planar %": s.choix3_planar_pourcentage,
      "C3 Calibre pcs": s.choix3_calibre_pieces,
      "C3 Calibre %": s.choix3_calibre_pourcentage,
       "Min. Absence Alim.": s.minutes_absence_alimentation,
       "Min. Urgence Man.": s.minutes_urgence_manuelle,
      "Min. Machine Saturée": s.minutes_machine_saturee,
      "Min. Total Machine": s.minutes_total_machine,
      "Vitesse moy. (pcs/min)": s.vitesse_moyenne_pieces_min,
      "Machine allumée": s.machine_allumee,
      "Machine en marche": s.machine_en_marche,
      "Prod. réelle m²": s.production_reelle_m2,
      _id: s.id,
    };
  });

  const { filteredData, filterValues, setFilter, clearFilters, hasActiveFilters, uniqueValues } =
    useTableFilters(rows, FILTER_CONFIGS);

  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-base font-medium">Aucune statistique enregistrée</p>
        <p className="text-sm">Remplissez le formulaire ci-dessus pour ajouter une analyse.</p>
      </div>
    );
  }

  const headers = Object.keys(rows[0]).filter((h) => h !== "_id");
  const exportData = filteredData.map(({ _id, ...rest }) => rest);

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
          {filteredData.length} / {stats.length} statistique{stats.length > 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToCsvGeneric(exportData, "stats_linea")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToExcel(exportData, "stats_linea")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]" />
              {headers.map((h) => (
                <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.slice().reverse().map((row, idx) => (
              <TableRow key={idx} className="group">
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const entry = stats.find((s) => s.id === row._id);
                      if (entry) onEdit(entry);
                    }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => onDelete(row._id as string)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
                {headers.map((h) => {
                  const v = row[h];
                  return (
                    <TableCell key={h} className="font-mono text-xs whitespace-nowrap">
                      {typeof v === "number" ? v.toFixed(2) : String(v ?? "—")}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
