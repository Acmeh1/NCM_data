import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelectionStore, type SelectionEntry } from "@/hooks/useSelectionStore";
import { useProductionStore } from "@/hooks/useProductionStore";
import { usePermissions } from "@/hooks/usePermissions";
import ProductionSelectionForm from "@/components/ProductionSelectionForm";
import ProductionSelectionTable from "@/components/ProductionSelectionTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { toast } from "sonner";

export default function ProductionSelection() {
  const { entries, isLoaded, addEntry, deleteEntry, updateEntry } = useSelectionStore();
  const { entries: journalierEntries, isLoaded: jLoaded } = useProductionStore();
  const { productionEdit, loading: permLoading } = usePermissions();
  const [editingEntry, setEditingEntry] = useState<SelectionEntry | null>(null);
  const navigate = useNavigate();

  if (!isLoaded || !jLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  // Build set of done keys (Date+Groupe+Horaire already having a selection entry)
  const doneKeys = new Set(
    entries
      .filter((e) => !(editingEntry && e.id === editingEntry.id))
      .map((e) => `${e.date}||${e.groupe}||${e.horaire}`)
  );

  // Deduplicate journalier by Date+Groupe+Horaire (one representative per combo)
  const seen = new Set<string>();
  const selectableJournalier = journalierEntries.filter((j) => {
    const key = `${j.Date}||${j.Groupe}||${j.Horaire}`;
    if (doneKeys.has(key)) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold">Production Sélection & Qualité</h1>
        <p className="text-sm text-muted-foreground">
          Rapport de sélection, tri final, arrêts de zone et contrôle qualité
        </p>
      </div>

      {productionEdit && (
        <ProductionSelectionForm
          journalierEntries={selectableJournalier}
          onSubmit={async (entry) => {
            const result = await addEntry(entry);
            if (result) toast.success("Rapport ajouté avec succès");
          }}
          editingEntry={editingEntry}
          onUpdate={async (entry) => {
            const result = await updateEntry(entry);
            if (result) {
              toast.success("Rapport mis à jour avec succès");
              setEditingEntry(null);
            }
          }}
          onCancelEdit={() => setEditingEntry(null)}
        />
      )}

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Rapports enregistrés</CardTitle>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/production/selection/view")}>
            <Eye className="h-4 w-4" /> Aperçu
          </Button>
        </CardHeader>
        <CardContent>
          <ProductionSelectionTable
            entries={entries}
            onDelete={productionEdit ? deleteEntry : undefined}
            onEdit={productionEdit ? (entry) => setEditingEntry(entry) : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
