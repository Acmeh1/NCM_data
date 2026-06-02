import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProductionStore } from "@/hooks/useProductionStore";
import { useEmballageStore, type EmballageEntry } from "@/hooks/useEmballageStore";
import { usePermissions } from "@/hooks/usePermissions";
import EmballageForm from "@/components/EmballageForm";
import EmballageTable from "@/components/EmballageTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { JsonImport } from "@/components/JsonImport";

export default function ProductionEmballage() {
  const { entries: journalierEntries, isLoaded: jLoaded } = useProductionStore();
  const { entries, isLoaded, addEntry, updateEntry, deleteEntry } = useEmballageStore();
  const { productionEdit, loading: permLoading } = usePermissions();
  const [editingEntry, setEditingEntry] = useState<EmballageEntry | null>(null);
  const navigate = useNavigate();

  if (!isLoaded || !jLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  // Filtrage intelligent : n'affiche que les rapports journaliers non utilisés
  const selectableJournalier = journalierEntries.filter(
    (j) =>
      !entries.some((e) => e.Linked_Journalier_ID === j.id) ||
      (editingEntry && editingEntry.Linked_Journalier_ID === j.id)
  );

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold">Production Emballage</h1>
        <p className="text-sm text-muted-foreground">
          Saisie de l'emballage liée à la production journalier
        </p>
      </div>

      {productionEdit && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Formulaire Emballage</CardTitle>
            <CardDescription>
              Sélectionnez une entrée de production journalier, puis saisissez les choix d'emballage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmballageForm
              journalierEntries={selectableJournalier}
              onSubmit={async (entry) => {
                const result = await addEntry(entry);
                if (result) toast.success("Emballage enregistré");
              }}
              editingEntry={editingEntry}
              onUpdate={async (entry) => {
                const result = await updateEntry(entry);
                if (result) {
                  toast.success("Emballage mis à jour");
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
          <CardTitle className="text-base">Données Emballage</CardTitle>
          <div className="flex gap-2">
            <JsonImport onImport={async (data) => {
              for (const item of data) {
                await addEntry(item);
              }
            }} />
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/production/emballage/view")}>
              <Eye className="h-4 w-4" /> Aperçu
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EmballageTable
            entries={entries}
            onDelete={productionEdit ? deleteEntry : undefined}
            onEdit={productionEdit ? (entry) => setEditingEntry(entry) : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
