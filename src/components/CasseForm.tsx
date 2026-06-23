import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, X } from "lucide-react";
import type { CasseEntry } from "@/hooks/useCasseStore";

interface CasseFormProps {
  initialData?: {
    date: string;
    horaire: string;
    groupe: string;
    chef_equipe: string;
  };
  editingEntry?: CasseEntry | null;
  onSubmit: (entry: Omit<CasseEntry, "id">) => void;
  onUpdate?: (entry: CasseEntry) => void;
  onCancelEdit?: () => void;
}

export default function CasseForm({
  initialData,
  editingEntry,
  onSubmit,
  onUpdate,
  onCancelEdit,
}: CasseFormProps) {
  const isEditMode = !!editingEntry && !!onUpdate;

  const [form, setForm] = useState({
    presse_casse_kg: "",
    presse_poudre_recyclee_kg: "",
    presse_elev_tamis_kg: "",
    sortie_sechoir_kg: "",
    emaillage_kg: "",
    projecta_kg: "",
    entree_four_kg: "",
    sortie_four_kg: "",
    marteaux_kg: "",
    empileur_kg: "",
    robot_kg: "",
  });

  useEffect(() => {
    if (editingEntry) {
      setForm({
        presse_casse_kg: String((editingEntry as any).presse_casse_kg || (editingEntry as any).press_kg || ""),
        presse_poudre_recyclee_kg: String((editingEntry as any).presse_poudre_recyclee_kg || ""),
        presse_elev_tamis_kg: String((editingEntry as any).presse_elev_tamis_kg || ""),
        sortie_sechoir_kg: String(editingEntry.sortie_sechoir_kg || ""),
        emaillage_kg: String(editingEntry.emaillage_kg || ""),
        projecta_kg: String(editingEntry.projecta_kg || ""),
        entree_four_kg: String(editingEntry.entree_four_kg || ""),
        sortie_four_kg: String((editingEntry as any).sortie_four_kg || (editingEntry as any).casse_cuite_kg || ""),
        marteaux_kg: String((editingEntry as any).marteaux_kg || ""),
        empileur_kg: String((editingEntry as any).empileur_kg || ""),
        robot_kg: String((editingEntry as any).robot_kg || ""),
      });
    } else {
      setForm({
        presse_casse_kg: "",
        presse_poudre_recyclee_kg: "",
        presse_elev_tamis_kg: "",
        sortie_sechoir_kg: "",
        emaillage_kg: "",
        projecta_kg: "",
        entree_four_kg: "",
        sortie_four_kg: "",
        marteaux_kg: "",
        empileur_kg: "",
        robot_kg: "",
      });
    }
  }, [editingEntry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      date: editingEntry ? editingEntry.date : (initialData?.date || ""),
      horaire: editingEntry ? editingEntry.horaire : (initialData?.horaire || ""),
      groupe: editingEntry ? editingEntry.groupe : (initialData?.groupe || ""),
      chef_equipe: editingEntry ? editingEntry.chef_equipe : (initialData?.chef_equipe || ""),
      presse_casse_kg: Number(form.presse_casse_kg) || 0,
      presse_poudre_recyclee_kg: Number(form.presse_poudre_recyclee_kg) || 0,
      presse_elev_tamis_kg: Number(form.presse_elev_tamis_kg) || 0,
      sortie_sechoir_kg: Number(form.sortie_sechoir_kg) || 0,
      emaillage_kg: Number(form.emaillage_kg) || 0,
      projecta_kg: Number(form.projecta_kg) || 0,
      entree_four_kg: Number(form.entree_four_kg) || 0,
      sortie_four_kg: Number(form.sortie_four_kg) || 0,
      marteaux_kg: Number(form.marteaux_kg) || 0,
      empileur_kg: Number(form.empileur_kg) || 0,
      robot_kg: Number(form.robot_kg) || 0,
    };

    if (isEditMode && onUpdate && editingEntry) {
      onUpdate({ ...editingEntry, ...payload });
    } else {
      onSubmit(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {editingEntry ? (
        <div className="bg-muted p-3 rounded-md flex justify-between items-center text-sm">
          <span>
            Modifiant : <strong>{editingEntry.date}</strong> | Quart <strong>{editingEntry.horaire}</strong> | Groupe <strong>{editingEntry.groupe}</strong>
          </span>
          {onCancelEdit && (
            <Button variant="ghost" size="sm" type="button" onClick={onCancelEdit}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : initialData ? (
         <div className="bg-muted/50 p-3 rounded-md text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{initialData.date}</span></div>
            <div><span className="text-muted-foreground">Horaire:</span> <span className="font-medium">{initialData.horaire}</span></div>
            <div><span className="text-muted-foreground">Groupe:</span> <span className="font-medium">{initialData.groupe}</span></div>
            <div><span className="text-muted-foreground">Chef d'Equipe:</span> <span className="font-medium">{initialData.chef_equipe}</span></div>
         </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
        {[
          { id: "presse_casse_kg", label: "Presse Casse (kg)" },
          { id: "presse_poudre_recyclee_kg", label: "Presse Poudre Recyclée (kg)" },
          { id: "presse_elev_tamis_kg", label: "Presse Élév. Tamis (kg)" },
          { id: "sortie_sechoir_kg", label: "Sortie Séchoir (kg)" },
          { id: "emaillage_kg", label: "Emaillage (kg)" },
          { id: "projecta_kg", label: "Projecta (kg)" },
          { id: "entree_four_kg", label: "Entrée Four (kg)" },
          { id: "sortie_four_kg", label: "Sortie Four (kg)" },
          { id: "marteaux_kg", label: "Marteaux (kg)" },
          { id: "empileur_kg", label: "Empileur (kg)" },
          { id: "robot_kg", label: "Robot (kg)" },
        ].map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{field.label}</Label>
            <Input
              type="number"
              step="0.01"
              value={(form as any)[field.id]}
              onChange={(e) => setForm(prev => ({ ...prev, [field.id]: e.target.value }))}
              placeholder="0.00"
              className="font-mono"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end pt-4">
        {isEditMode && onCancelEdit && (
          <Button type="button" variant="outline" onClick={onCancelEdit}>Annuler</Button>
        )}
        <Button type="submit" disabled={!initialData && !editingEntry} className="gap-2">
          {isEditMode ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isEditMode ? "Mettre à jour" : "Enregistrer la casse"}
        </Button>
      </div>
    </form>
  );
}
