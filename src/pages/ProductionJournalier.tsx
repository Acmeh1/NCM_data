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
import { JsonImport } from "@/components/JsonImport";

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
          <div className="flex gap-2">
            <JsonImport onImport={async (data) => {
              for (const item of data) {
                const mappedItem = {
                  Date: item.date || item.Date,
                  Horaire: item.horaire || item.Horaire,
                  Heure_Debut: item.heure_debut || item.Heure_Debut,
                  Heure_Fin: item.heure_fin || item.Heure_Fin,
                  Groupe: item.groupe || item.Groupe || "",
                  Chef_Equipe: item.chef_equipe || item.Chef_Equipe,
                  Modele: item.modele || item.Modele,
                  Couleur: item.couleur || item.Couleur || "",
                  Format: item.format || item.Format,
                  Choix_1_m2: Number(item.choix_1_m2 ?? item.Choix_1_m2) || 0,
                  Choix_2_m2: Number(item.choix_2_m2 ?? item.Choix_2_m2) || 0,
                  Choix_3_m2: Number(item.choix_3_m2 ?? item.Choix_3_m2) || 0,
                  Total_m2: Number(item.total_m2 ?? item.Total_m2) || 0,
                  Pressage_m2: Number(item.pressage_m2 ?? item.Pressage_m2) || 0,
                  Project_m2: Number(item.Project_m2 ?? item.project_m2) || 0,
                  Emaillage_m2: Number(item.emaillage_m2 ?? item.Emaillage_m2) || 0,
                  Cycle_min: Number(item.cycle_min ?? item.Cycle_min) || 0,
                  Nb_Pieces_Four: Number(item.nb_pieces_four ?? item.Nb_Pieces_Four) || 0,
                  Surface_CAR_m2: Number(item.surface_car_m2 ?? item.Surface_CAR_m2) || 0,
                  Cuisson_M2: Number(item.cuisson_m2 ?? item.Cuisson_M2) || 0,
                  Four_Minutes_Vides: Number(item.four_minutes_vides ?? item.Four_Minutes_Vides) || 0,
                  Four_Consommation_Kwh: Number(item.four_consommation_kwh ?? item.Four_Consommation_Kwh) || 0,
                  VIDE_f_maintenance: Number(item.VIDE_f_maintenance ?? item.vide_f_maintenance) || 0,
                  VIDE_f_production: Number(item.VIDE_f_production ?? item.vide_f_production) || 0,
                };
                await addEntry(mappedItem as any);
              }
              toast.success("Importation terminée");
            }} />
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/production/journalier/view")}>
              <Eye className="h-4 w-4" /> Aperçu
            </Button>
          </div>
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
