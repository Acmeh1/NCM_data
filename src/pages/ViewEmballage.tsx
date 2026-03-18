import { useState } from "react";
import { useEmballageStore, type EmballageEntry, type EmballageChoix } from "@/hooks/useEmballageStore";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileSpreadsheet, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { exportToExcel, exportToCsvGeneric } from "@/lib/exportUtils";
import TableFilters, { useTableFilters } from "@/components/TableFilters";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";

const FILTER_CONFIGS = [
  { key: "Date", label: "Date", type: "date" as const },
  { key: "Groupe", label: "Groupe", type: "select" as const },
  { key: "Horaire", label: "Horaire", type: "select" as const },
];

export default function ViewEmballage() {
  const { entries, isLoaded, updateEntry } = useEmballageStore();
  const { productionEdit } = usePermissions();
  const navigate = useNavigate();
  const [editingEntry, setEditingEntry] = useState<EmballageEntry | null>(null);
  const [editChoix, setEditChoix] = useState<EmballageChoix[]>([]);

  const flat: Record<string, any>[] = [];
  [...entries].sort((a, b) => b.Date.localeCompare(a.Date)).forEach((e) => {
    e.choix.forEach((c, ci) => {
      flat.push({
        _entryId: e.id,
        Date: e.Date, Horaire: e.Horaire, "H. Début": e.Heure_Debut, "H. Fin": e.Heure_Fin,
        Groupe: e.Groupe, "Chef Éq.": e.Chef_Equipe, Modèle: e.Modele, Couleur: e.Couleur,
        Format: e.Format, "Type Choix": c.Choice_Type, "Nb Palette": c.Nb_Palette,
        "Surface/Palette": c.Surface_par_palette, "Surface Totale m²": c.Surface_totale_m2,
        "Reste m²": c.Reste_m2,
      });
    });
  });

  const { filteredData, filterValues, setFilter, clearFilters, hasActiveFilters, uniqueValues } =
    useTableFilters(flat, FILTER_CONFIGS);

  if (!isLoaded) return <p className="text-muted-foreground p-8">Chargement…</p>;

  const headers = flat.length > 0 ? Object.keys(flat[0]).filter((h) => h !== "_entryId") : [];

  const handleRowClick = (row: Record<string, any>) => {
    const entry = entries.find((e) => e.id === row._entryId);
    if (entry) {
      setEditingEntry(entry);
      setEditChoix(entry.choix.map((c) => ({ ...c })));
    }
  };

  const updateChoixField = (idx: number, field: keyof EmballageChoix, value: number) => {
    setEditChoix((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    if (!editingEntry) return;
    const updated: EmballageEntry = { ...editingEntry, choix: editChoix };
    const result = await updateEntry(updated);
    if (result) {
      toast.success("Emballage mis à jour");
      setEditingEntry(null);
    }
  };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/production/emballage")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Aperçu — Production Emballage</h1>
            <p className="text-sm text-muted-foreground">{filteredData.length} lignes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToCsvGeneric(filteredData.map(({ _entryId, ...r }) => r), "production_emballage")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToExcel(filteredData.map(({ _entryId, ...r }) => r), "production_emballage")}>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(v) => { if (!v) setEditingEntry(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Modifier — Emballage</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {editingEntry && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">Date:</span> {editingEntry.Date}</p>
                  <p><span className="text-muted-foreground">Groupe:</span> {editingEntry.Groupe}</p>
                  <p><span className="text-muted-foreground">Modèle:</span> {editingEntry.Modele}</p>
                  <p><span className="text-muted-foreground">Format:</span> {editingEntry.Format}</p>
                </div>
                {editChoix.map((c, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium">{c.Choice_Type}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Nb Palette</Label>
                        <Input type="number" value={c.Nb_Palette} onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          onChange={(e) => updateChoixField(i, "Nb_Palette", Number(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Surface/Palette</Label>
                        <Input type="number" value={c.Surface_par_palette} onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          onChange={(e) => updateChoixField(i, "Surface_par_palette", Number(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Surface Totale m²</Label>
                        <Input type="number" value={c.Surface_totale_m2} onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          onChange={(e) => updateChoixField(i, "Surface_totale_m2", Number(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Reste m²</Label>
                        <Input type="number" value={c.Reste_m2} onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          onChange={(e) => updateChoixField(i, "Reste_m2", Number(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEditingEntry(null)}>Annuler</Button>
            <Button onClick={handleSave}>Mettre à jour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
