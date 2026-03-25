import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { useSelectionStore, type SelectionEntry } from "@/hooks/useSelectionStore";

interface Props {
  journalierEntries: any[];
  onSubmit: (entry: Omit<SelectionEntry, "id">) => void;
  editingEntry?: SelectionEntry | null;
  onUpdate?: (entry: SelectionEntry) => void;
  onCancelEdit?: () => void;
}



export default function ProductionSelectionForm({
  journalierEntries,
  onSubmit,
  editingEntry,
  onUpdate,
  onCancelEdit,
}: Props) {
  const isEditMode = !!editingEntry && !!onUpdate;

  // Suggestions de zones depuis l'historique en base
  const { entries: selectionEntries } = useSelectionStore();

  const [form, setForm] = useState({
    journalier_id: "",
    date: new Date().toISOString().split("T")[0],
    horaire: "", heure_debut: "", heure_fin: "",
    groupe: "", chef_equipe: "",
    modele: "", couleur: "", format: "",
    zone_presse: "", zone_projecta: "", zone_four: "",
    surface_car_m2: 0,
    choix_1_m2: "", choix_2_m2: "", choix_3_m2: "",
    duree_vide_maintenance: "", intervention_maintenance: "",
    duree_vide_production: "", intervention_production: "",
  });

  // Hydrate form when an entry is selected for edition
  useEffect(() => {
    if (!editingEntry) return;
    setForm({
      journalier_id: "",
      date: editingEntry.date,
      horaire: editingEntry.horaire,
      heure_debut: editingEntry.heure_debut,
      heure_fin: editingEntry.heure_fin,
      groupe: editingEntry.groupe,
      chef_equipe: editingEntry.chef_equipe,
      modele: editingEntry.modele,
      couleur: editingEntry.couleur,
      format: editingEntry.format,
      zone_presse: String(editingEntry.zone_presse),
      zone_projecta: String(editingEntry.zone_projecta),
      zone_four: String(editingEntry.zone_four),
      choix_1_m2: String(editingEntry.choix_1_m2),
      choix_2_m2: String(editingEntry.choix_2_m2),
      choix_3_m2: String(editingEntry.choix_3_m2),
      duree_vide_maintenance: String(editingEntry.duree_vide_maintenance),
      intervention_maintenance: editingEntry.intervention_maintenance,
      duree_vide_production: String(editingEntry.duree_vide_production),
      intervention_production: editingEntry.intervention_production,
      surface_car_m2: 0,
    });

    // Try to find matching journalier to get surface
    const matchingJ = journalierEntries.find(j => 
      j.Date === editingEntry.date && 
      j.Groupe === editingEntry.groupe && 
      j.Horaire === editingEntry.horaire &&
      j.Modele === editingEntry.modele
    );
    if (matchingJ) {
      const surface = matchingJ.Surface_CAR_m2 || 0;
      setForm(p => ({
        ...p,
        surface_car_m2: surface,
      }));
    }
  }, [editingEntry, journalierEntries]);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleJournalierChange = (id: string) => {
    const selected = journalierEntries.find((j) => j.id === id);
    if (!selected) {
      setForm((p) => ({ ...p, journalier_id: id, surface_car_m2: 0 }));
      return;
    }
    setForm((p) => ({
      ...p,
      journalier_id: id,
      date: selected.Date,
      horaire: selected.Horaire,
      heure_debut: selected.Heure_Debut,
      heure_fin: selected.Heure_Fin,
      groupe: selected.Groupe,
      chef_equipe: selected.Chef_Equipe,
      modele: selected.Modele,
      couleur: selected.Couleur,
      format: selected.Format,
      surface_car_m2: Number(selected.Surface_CAR_m2) || 0,
    }));
  };


  // Calculations
  const zoneFour = Number(form.zone_four) || 0;
  const choix1 = Number(form.choix_1_m2) || 0;
  const choix2 = Number(form.choix_2_m2) || 0;
  const choix3 = Number(form.choix_3_m2) || 0;
  const totalChoix = choix1 + choix2 + choix3;
  const choix1Taux = totalChoix > 0 ? (choix1 / totalChoix) * 100 : 0;
  const choix2Taux = totalChoix > 0 ? (choix2 / totalChoix) * 100 : 0;
  const choix3Taux = totalChoix > 0 ? (choix3 / totalChoix) * 100 : 0;

  const submitForm = () => {
    // Validation: comments required if duration > 0
    const durMaint = Number(form.duree_vide_maintenance) || 0;
    const durProd = Number(form.duree_vide_production) || 0;
    if (durMaint > 0 && !form.intervention_maintenance.trim()) {
      toast.error("L'intervention maintenance est obligatoire si une durée est saisie");
      return;
    }
    if (durProd > 0 && !form.intervention_production.trim()) {
      toast.error("L'intervention production est obligatoire si une durée est saisie");
      return;
    }

    if (isEditMode && editingEntry && onUpdate) {
      onUpdate({
        id: editingEntry.id,
        date: form.date,
        groupe: form.groupe,
        horaire: form.horaire,
        heure_debut: form.heure_debut,
        heure_fin: form.heure_fin,
        chef_equipe: form.chef_equipe,
        modele: form.modele,
        couleur: form.couleur,
        format: form.format,
        zone_presse: Number(form.zone_presse) || 0,
        zone_projecta: Number(form.zone_projecta) || 0,
        zone_four: zoneFour,
        choix_1_m2: choix1,
        choix_1_taux: Math.round(choix1Taux * 100) / 100,
        choix_2_m2: choix2,
        choix_2_taux: Math.round(choix2Taux * 100) / 100,
        choix_3_m2: choix3,
        choix_3_taux: Math.round(choix3Taux * 100) / 100,
        duree_vide_maintenance: durMaint,
        intervention_maintenance: form.intervention_maintenance,
        duree_vide_production: durProd,
        intervention_production: form.intervention_production,
      });
      return;
    }

    onSubmit({
      date: form.date,
      groupe: form.groupe,
      horaire: form.horaire,
      heure_debut: form.heure_debut,
      heure_fin: form.heure_fin,
      chef_equipe: form.chef_equipe,
      modele: form.modele,
      couleur: form.couleur,
      format: form.format,
      zone_presse: Number(form.zone_presse) || 0,
      zone_projecta: Number(form.zone_projecta) || 0,
      zone_four: zoneFour,
      choix_1_m2: choix1,
      choix_1_taux: Math.round(choix1Taux * 100) / 100,
      choix_2_m2: choix2,
      choix_2_taux: Math.round(choix2Taux * 100) / 100,
      choix_3_m2: choix3,
      choix_3_taux: Math.round(choix3Taux * 100) / 100,
      duree_vide_maintenance: durMaint,
      intervention_maintenance: form.intervention_maintenance,
      duree_vide_production: durProd,
      intervention_production: form.intervention_production,
    });

    if (!isEditMode) {
      // Reset form (en gardant la date du jour)
      setForm((prev) => ({
        ...prev,
        journalier_id: "",
        date: form.date,
        horaire: "",
        heure_debut: "",
        heure_fin: "",
        groupe: "",
        chef_equipe: "",
        modele: "",
        couleur: "",
        format: "",
        zone_presse: "",
        zone_projecta: "",
        zone_four: "",
        choix_1_m2: "",
        choix_2_m2: "",
        choix_3_m2: "",
        duree_vide_maintenance: "",
        intervention_maintenance: "",
        duree_vide_production: "",
        intervention_production: "",
        surface_car_m2: 0,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    const tagName = target.tagName;

    const isInputLike =
      tagName === "INPUT" ||
      tagName === "SELECT" ||
      tagName === "TEXTAREA" ||
      target.getAttribute("role") === "combobox";

    // Ctrl+S / Cmd+S => validation explicite uniquement
    if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitForm();
      return;
    }

    if (!isInputLike) return;

    // Entrée => se comporte comme Tab (focus suivant) et ne soumet jamais le formulaire
    if (e.key === "Enter") {
      e.preventDefault();
      const formEl = e.currentTarget;
      const focusables = Array.from(
        formEl.querySelectorAll<HTMLElement>(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          el.getAttribute("aria-hidden") !== "true"
      );

      const currentIndex = focusables.indexOf(target);
      if (currentIndex !== -1) {
        const next = focusables[currentIndex + 1];
        if (next) {
          next.focus();
        }
      }
      return;
    }

    // Navigation aux flèches façon "grille" pour les champs annotés data-row / data-col
    if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight"
    ) {
      const rowAttr = target.getAttribute("data-row");
      const colAttr = target.getAttribute("data-col");

      if (rowAttr == null || colAttr == null) return;

      const row = parseInt(rowAttr, 10);
      const col = parseInt(colAttr, 10);
      let nextRow = row;
      let nextCol = col;

      switch (e.key) {
        case "ArrowUp":
          nextRow = Math.max(0, row - 1);
          break;
        case "ArrowDown":
          nextRow = row + 1;
          break;
        case "ArrowLeft":
          // Flèche gauche => aller à la colonne suivante
          nextCol = col + 1;
          break;
        case "ArrowRight":
          // Flèche droite => revenir à la colonne précédente
          nextCol = Math.max(0, col - 1);
          break;
      }

      const selector = `[data-row="${nextRow}"][data-col="${nextCol}"]`;
      const next = e.currentTarget.querySelector<HTMLElement>(selector);
      if (next) {
        e.preventDefault();
        next.focus();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
      {/* Card 1: Identification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Production Journalier</Label>
              <Select value={form.journalier_id || ""} onValueChange={handleJournalierChange}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {journalierEntries.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.Date} — {j.Groupe} — {j.Horaire}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.journalier_id && !isEditMode && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                <Input value={form.date} readOnly className="bg-muted text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Horaire</Label>
                <Input value={form.horaire} readOnly className="bg-muted text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Heure Début</Label>
                <Input value={form.heure_debut} readOnly className="bg-muted text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Heure Fin</Label>
                <Input value={form.heure_fin} readOnly className="bg-muted text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Groupe</Label>
                <Input value={form.groupe} readOnly className="bg-muted text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Chef d'Équipe</Label>
                <Input value={form.chef_equipe} readOnly className="bg-muted text-xs" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Production & Tri */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Production & Tri Final</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Zone Presse m²</Label>
              <Input type="number" value={form.zone_presse} onChange={(e) => update("zone_presse", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Zone Projecta m²</Label>
              <Input 
                type="number" 
                value={form.zone_projecta} 
                onChange={(e) => update("zone_projecta", e.target.value)} 
                placeholder="0" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Zone Four m²</Label>
              <Input type="number" value={form.zone_four} onChange={(e) => update("zone_four", e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">1er Choix m²</Label>
              <Input type="number" value={form.choix_1_m2} onChange={(e) => update("choix_1_m2", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">1er Choix %</Label>
              <Input value={choix1Taux.toFixed(2) + " %"} readOnly className="bg-muted font-semibold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">2ème Choix m²</Label>
              <Input type="number" value={form.choix_2_m2} onChange={(e) => update("choix_2_m2", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">2ème Choix %</Label>
              <Input value={choix2Taux.toFixed(2) + " %"} readOnly className="bg-muted font-semibold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">3ème Choix m²</Label>
              <Input type="number" value={form.choix_3_m2} onChange={(e) => update("choix_3_m2", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">3ème Choix %</Label>
              <Input value={choix3Taux.toFixed(2) + " %"} readOnly className="bg-muted font-semibold" />
            </div>
          </div>
        </CardContent>
      </Card>



      <div className="flex gap-2">
        {isEditMode && onCancelEdit && (
          <Button type="button" variant="outline" onClick={onCancelEdit}>
            Annuler l'édition
          </Button>
        )}
        <Button type="submit" className="gap-2">
          <Send className="h-4 w-4" />
          {isEditMode ? "Mettre à jour" : "Soumettre le rapport"}
        </Button>
      </div>
    </form>
  );
}
