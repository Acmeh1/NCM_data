import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProductionStore, type ProductionEntry } from "@/hooks/useProductionStore";
import { useSelectionStore, type SelectionEntry } from "@/hooks/useSelectionStore";
import { usePermissions } from "@/hooks/usePermissions";
import ProductionForm from "@/components/ProductionForm";
import ProductionTable from "@/components/ProductionTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { toast } from "sonner";

function buildKey(date: string, groupe: string, horaire: string) {
  return `${date}||${groupe}||${horaire}`;
}

export default function ProductionJournalier() {
  const navigate = useNavigate(); // ✅ Fix: was imported but never assigned
  const { entries, isLoaded, addEntry, updateEntry, deleteEntry } = useProductionStore();
  const { entries: selectionEntries, isLoaded: selectionLoaded, updateEntry: updateSelectionEntry, deleteByKey } = useSelectionStore();
  const { productionEdit, loading: permLoading } = usePermissions();
  const [editingEntry, setEditingEntry] = useState<ProductionEntry | null>(null);

  const handleDelete = useCallback(async (entry: ProductionEntry) => {
    await deleteEntry(entry);
    await deleteByKey(entry.Date, entry.Groupe, entry.Horaire);
  }, [deleteEntry, deleteByKey]);

  const selectionByKey = useMemo(() => {
    const m = new Map<string, SelectionEntry>();
    selectionEntries.forEach((s) => m.set(buildKey(s.date, s.groupe, s.horaire), s));
    return m;
  }, [selectionEntries]);



  if (!isLoaded || !selectionLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold">Production Journalier</h1>
        <p className="text-sm text-muted-foreground">
          Saisie quotidienne de la production
        </p>
      </div>

      {productionEdit && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Formulaire de saisie</CardTitle>
            <CardDescription>
              Remplissez les champs ci-dessous. Les heures, le total et la cuisson sont calculés automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductionForm
              onSubmit={async (entry) => {
                const result = await addEntry(entry);
                if (result) {
                  toast.success("Entrée ajoutée");
                }
              }}
              editingEntry={editingEntry}
              onUpdate={async (entry) => {
                const result = await updateEntry(entry);
                if (result) {
                  toast.success("Entrée mise à jour");
                  setEditingEntry(null);
                }
              }}
              onCancelEdit={() => setEditingEntry(null)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Données enregistrées</CardTitle>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/production/journalier/view")}>
            <Eye className="h-4 w-4" /> Aperçu
          </Button>
        </CardHeader>
        <CardContent>
          <ProductionTable
            entries={entries}
            selectionEntries={selectionEntries}
            onDelete={productionEdit ? handleDelete : undefined}
            onEdit={productionEdit ? (entry) => setEditingEntry(entry) : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
