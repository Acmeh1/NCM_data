import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Download, FileSpreadsheet, Pencil } from "lucide-react";
import type { ProductionEntry } from "@/hooks/useProductionStore";
import type { SelectionEntry } from "@/hooks/useSelectionStore";
import { exportToExcel, exportToCsvGeneric } from "@/lib/exportUtils";
import TableFilters, { useTableFilters } from "@/components/TableFilters";

interface Props {
  entries: ProductionEntry[];
  selectionEntries?: SelectionEntry[];
  onDelete?: (entry: ProductionEntry) => void;
  onEdit?: (entry: ProductionEntry) => void;
}

const COLUMNS: { key: keyof ProductionEntry; label: string }[] = [
  { key: "Date", label: "Date" },
  { key: "Horaire", label: "Horaire" },
  { key: "Heure_Debut", label: "H. Début" },
  { key: "Heure_Fin", label: "H. Fin" },
  { key: "Groupe", label: "Groupe" },
  { key: "Chef_Equipe", label: "Chef Éq." },
  { key: "Modele", label: "Modèle" },
  { key: "Couleur", label: "Couleur" },
  { key: "Format", label: "Format" },
  { key: "Choix_1_m2", label: "1er Choix m²" },
  { key: "Choix_2_m2", label: "2ème Choix m²" },
  { key: "Choix_3_m2", label: "3ème Choix m²" },
  { key: "Total_m2", label: "Total m²" },
  { key: "Pressage_m2", label: "Pressage m²" },
  { key: "Project_m2", label: "Projecta m²" },
  { key: "Emaillage_m2", label: "Emaillage m²" },
  { key: "Cycle_min", label: "Cycle min" },
  { key: "Nb_Pieces_Four", label: "Nb Pièces Four" },
  { key: "Surface_CAR_m2", label: "Surface CAR m²" },
  { key: "Cuisson_M2", label: "Production Four m²" },
  { key: "Four_Minutes_Vides", label: "Minutes vides Four" },
  { key: "Four_Consommation_Kwh", label: "Consommation Four kW/h" },
];

const EXTRA_SELECTION_COLUMNS: { key: keyof SelectionEntry; label: string }[] = [];

const FILTER_CONFIGS = [
  { key: "_f_Date", label: "Date", type: "date" as const },
  { key: "_f_Groupe", label: "Groupe", type: "select" as const },
  { key: "_f_Horaire", label: "Horaire", type: "select" as const },
  { key: "_f_Modele", label: "Modèle", type: "select" as const },
];

function buildKey(date: string, groupe: string, horaire: string) {
  return `${date}||${groupe}||${horaire}`;
}

export default function ProductionTable({ entries, selectionEntries, onDelete, onEdit }: Props) {
  const selectionByKey = new Map<string, SelectionEntry>();
  (selectionEntries ?? []).forEach((s) => {
    selectionByKey.set(buildKey(s.date, s.groupe, s.horaire), s);
  });

  // Build flat rows for filtering
  const rows = entries.map((e) => {
    const row: Record<string, any> = { _entry_id: e.id };
    COLUMNS.forEach((c) => { row[c.label] = e[c.key]; });
    const sel = selectionByKey.get(buildKey(e.Date, e.Groupe, e.Horaire));
    EXTRA_SELECTION_COLUMNS.forEach((c) => {
      row[c.label] = sel ? (sel as any)[c.key] : undefined;
    });
    // Prefixed keys for filtering (avoid collision with display labels)
    row._f_Date = e.Date;
    row._f_Groupe = e.Groupe;
    row._f_Horaire = e.Horaire;
    row._f_Modele = e.Modele;
    return row;
  });

  const { filteredData, filterValues, setFilter, clearFilters, hasActiveFilters, uniqueValues } =
    useTableFilters(rows, FILTER_CONFIGS);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-base font-medium">Aucune donnée</p>
        <p className="text-sm">Remplissez le formulaire ci-dessus pour ajouter des entrées.</p>
      </div>
    );
  }

  const exportData = filteredData.map(({ _entry_id, _f_Date, _f_Groupe, _f_Horaire, _f_Modele, ...rest }) => rest);
  const displayColumns = [...COLUMNS.map((c) => ({ key: String(c.key), label: c.label })), ...EXTRA_SELECTION_COLUMNS.map((c) => ({ key: String(c.key), label: c.label }))];

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
          {filteredData.length} / {entries.length} entrée{entries.length > 1 ? "s" : ""}
        </p>
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
              {EXTRA_SELECTION_COLUMNS.map((col) => (
                <TableHead key={String(col.key)} className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.slice().reverse().map((row) => {
              const entry = entries.find((e) => e.id === row._entry_id);
              if (!entry) return null;
              const sel = selectionByKey.get(buildKey(entry.Date, entry.Groupe, entry.Horaire));
              return (
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
                        onClick={() => onDelete(entry)}>
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
                  {EXTRA_SELECTION_COLUMNS.map((col) => (
                    <TableCell key={String(col.key)} className="font-mono text-xs whitespace-nowrap">
                      {typeof (sel as any)?.[col.key] === "number"
                        ? Number((sel as any)[col.key]).toFixed(2)
                        : String((sel as any)?.[col.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
