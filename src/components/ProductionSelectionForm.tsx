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
import { useSelectionStore, type SelectionEntry, type ArretZone } from "@/hooks/useSelectionStore";

interface Props {
  journalierEntries: any[];
  onSubmit: (entry: Omit<SelectionEntry, "id">) => void;
  editingEntry?: SelectionEntry | null;
  onUpdate?: (entry: SelectionEntry) => void;
  onCancelEdit?: () => void;
}

const emptyArret = (): ArretZone => ({ zone: "", intervention_cause: "", duree_min: 0, vide_four: false });

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
  const zoneSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          (selectionEntries || [])
            .flatMap((e) => e.arrets || [])
            .map((a) => a.zone)
            .filter((z) => typeof z === "string" && z.trim().length > 0)
        )
      ).sort(),
    [selectionEntries]
  );

  const [form, setForm] = useState({
    journalier_id: "",
    date: new Date().toISOString().split("T")[0],
    horaire: "", heure_debut: "", heure_fin: "",
    groupe: "", chef_equipe: "",
    modele: "", couleur: "", format: "",
    zone_presse: "", zone_projecta: "", zone_four: "",
    surface_car_m2: 0,
    choix_1_m2: "", choix_2_m2: "", choix_3_m2: "",
    calibre_taux: "", calibre_cause: "",
    planeite_taux: "", planeite_cause: "",
    operateur_aspect_taux: "", operateur_aspect_cause: "",
    tonalite_taux: "", tonalite_cause: "",
    duree_vide_maintenance: "", intervention_maintenance: "",
    duree_vide_production: "", intervention_production: "",
  });

  const [arrets, setArrets] = useState<ArretZone[]>([]);

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
      calibre_taux: String(editingEntry.calibre_taux),
      calibre_cause: editingEntry.calibre_cause,
      planeite_taux: String(editingEntry.planeite_taux),
      planeite_cause: editingEntry.planeite_cause,
      operateur_aspect_taux: String(editingEntry.operateur_aspect_taux),
      operateur_aspect_cause: editingEntry.operateur_aspect_cause,
      tonalite_taux: String(editingEntry.tonalite_taux),
      tonalite_cause: editingEntry.tonalite_cause,
      duree_vide_maintenance: String(editingEntry.duree_vide_maintenance),
      intervention_maintenance: editingEntry.intervention_maintenance,
      duree_vide_production: String(editingEntry.duree_vide_production),
      intervention_production: editingEntry.intervention_production,
      surface_car_m2: 0,
    });
    setArrets(
      editingEntry.arrets.map((a) => ({
        id: a.id,
        zone: a.zone,
        intervention_cause: a.intervention_cause,
        duree_min: a.duree_min,
        vide_four: a.vide_four,
      }))
    );

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
      surface_car_m2: selected.Surface_CAR_m2 || 0,
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

  // Arrêts management
  const addArret = () => setArrets((p) => [...p, emptyArret()]);
  const removeArret = (i: number) => setArrets((p) => p.filter((_, idx) => idx !== i));
  const updateArret = (i: number, field: keyof ArretZone, value: any) => {
    setArrets((p) => p.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  };

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
        calibre_taux: Number(form.calibre_taux) || 0,
        calibre_cause: form.calibre_cause,
        planeite_taux: Number(form.planeite_taux) || 0,
        planeite_cause: form.planeite_cause,
        operateur_aspect_taux: Number(form.operateur_aspect_taux) || 0,
        operateur_aspect_cause: form.operateur_aspect_cause,
        tonalite_taux: Number(form.tonalite_taux) || 0,
        tonalite_cause: form.tonalite_cause,
        duree_vide_maintenance: durMaint,
        intervention_maintenance: form.intervention_maintenance,
        duree_vide_production: durProd,
        intervention_production: form.intervention_production,
        arrets,
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
      calibre_taux: Number(form.calibre_taux) || 0,
      calibre_cause: form.calibre_cause,
      planeite_taux: Number(form.planeite_taux) || 0,
      planeite_cause: form.planeite_cause,
      operateur_aspect_taux: Number(form.operateur_aspect_taux) || 0,
      operateur_aspect_cause: form.operateur_aspect_cause,
      tonalite_taux: Number(form.tonalite_taux) || 0,
      tonalite_cause: form.tonalite_cause,
      duree_vide_maintenance: durMaint,
      intervention_maintenance: form.intervention_maintenance,
      duree_vide_production: durProd,
      intervention_production: form.intervention_production,
      arrets,
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
        calibre_taux: "",
        calibre_cause: "",
        planeite_taux: "",
        planeite_cause: "",
        operateur_aspect_taux: "",
        operateur_aspect_cause: "",
        tonalite_taux: "",
        tonalite_cause: "",
        duree_vide_maintenance: "",
        intervention_maintenance: "",
        duree_vide_production: "",
        intervention_production: "",
        surface_car_m2: 0,
      }));
      setArrets([]);
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
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Modèle</Label>
                <Input value={form.modele} readOnly className="bg-muted text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Couleur</Label>
                <Input value={form.couleur} readOnly className="bg-muted text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Format</Label>
                <Input value={form.format} readOnly className="bg-muted text-xs" />
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

      {/* Card 4: Arrêts de Zone */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Arrêts de Zone</CardTitle>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addArret}>
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          {arrets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun arrêt enregistré. Cliquez sur "Ajouter" pour ajouter une ligne.</p>
          ) : (
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Zone</TableHead>
                    <TableHead className="text-xs">Intervention / Cause</TableHead>
                    <TableHead className="text-xs w-[100px]">Durée (min)</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrets.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          value={a.zone}
                          onChange={(e) => updateArret(i, "zone", e.target.value)}
                          placeholder="Zone..."
                          className="h-8 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          data-row={i}
                          data-col={0}
                          list="zone-suggestions"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={a.intervention_cause}
                          onChange={(e) => updateArret(i, "intervention_cause", e.target.value)}
                          placeholder="Cause..."
                          className="h-8 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          data-row={i}
                          data-col={1}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={a.duree_min || ""}
                          onChange={(e) => updateArret(i, "duree_min", Number(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          data-row={i}
                          data-col={2}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeArret(i)}
                          data-row={i}
                          data-col={4}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions datalist pour les zones d'arrêt */}
      {zoneSuggestions.length > 0 && (
        <datalist id="zone-suggestions">
          {zoneSuggestions.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
      )}

      {/* Card 6: Contrôle Qualité */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contrôle Qualité – Défauts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: "Calibre", tauxField: "calibre_taux", causeField: "calibre_cause" },
              { label: "Planéité / Planar", tauxField: "planeite_taux", causeField: "planeite_cause" },
              { label: "Opérateur Aspect", tauxField: "operateur_aspect_taux", causeField: "operateur_aspect_cause" },
              { label: "Tonalité", tauxField: "tonalite_taux", causeField: "tonalite_cause" },
            ].map((defaut) => (
              <div key={defaut.label} className="space-y-2 p-3 rounded-lg border bg-muted/20">
                <h5 className="text-sm font-semibold">{defaut.label}</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Taux %</Label>
                    <Input type="number" value={(form as any)[defaut.tauxField]} onChange={(e) => update(defaut.tauxField, e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cause</Label>
                    <Input value={(form as any)[defaut.causeField]} onChange={(e) => update(defaut.causeField, e.target.value)} placeholder="Cause..." />
                  </div>
                </div>
              </div>
            ))}
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
