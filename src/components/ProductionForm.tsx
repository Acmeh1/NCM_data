import { useState, useMemo, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import refProduit from "@/data/REF_PRODUIT.json";
import formatData from "@/data/Format.json";
import { useProductionStore, type ProductionEntry } from "@/hooks/useProductionStore";

interface Props {
  onSubmit: (entry: Omit<ProductionEntry, "id">) => void;
  editingEntry?: ProductionEntry | null;
  onUpdate?: (entry: ProductionEntry) => void;
  onCancelEdit?: () => void;
}

const HORAIRES = [
  { id: "H01", nom: "Matin", debut: "6:00", fin: "14:00" },
  { id: "H02", nom: "Soir", debut: "14:00", fin: "22:00" },
  { id: "H03", nom: "Nuit", debut: "22:00", fin: "6:00" },
];

// Filter valid products from REF_PRODUIT
const validProducts = (refProduit as any[]).filter(
  (p) =>
    p.Nom_Commercial &&
    p.Nom_Commercial !== "�" &&
    p.Format_Nominal &&
    p.Format_Nominal !== "�" &&
    p.Surface_CAR_m2 &&
    p.Surface_CAR_m2 !== "#N/A" &&
    Number(p.Surface_CAR_m2) > 0
);

const uniqueModels = [...new Set(validProducts.map((p) => p.Nom_Commercial))].sort();

export default function ProductionForm({
  onSubmit,
  editingEntry,
  onUpdate,
  onCancelEdit,
}: Props) {
  const isEditMode = !!editingEntry && !!onUpdate;

  // Suggestions historiques depuis la base (toutes les productions existantes)
  const { entries } = useProductionStore();
  const chefSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          (entries || [])
            .map((e) => e.Chef_Equipe)
            .filter((name) => typeof name === "string" && name.trim().length > 0)
        )
      ).sort(),
    [entries]
  );

  const [form, setForm] = useState({
    Date: new Date().toISOString().split("T")[0],
    Horaire: "",
    Heure_Debut: "",
    Heure_Fin: "",
    Groupe: "",
    Chef_Equipe: "",
    Modele: "",
    Couleur: "",
    Format: "",
    Choix_1_m2: "",
    Choix_2_m2: "",
    Choix_3_m2: "",
    Pressage_m2: "",
    Project_m2: "",
    Project_pcs: "",
    Emaillage_m2: "",
    Cycle_min: "",
    Nb_Pieces_Four: "",
    Four_Minutes_Vides: "",
    Four_Consommation_Kwh: "",
  });

  // Refs for ENTER key navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const fieldOrder = ["Date", "Groupe", "Chef_Equipe", "Choix_1_m2", "Choix_2_m2", "Choix_3_m2", "Pressage_m2", "Project_m2", "Emaillage_m2", "Cycle_min", "Nb_Pieces_Four"];

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, fieldIndex: number) => {
    if (e.key === "Enter") {
      if (e.ctrlKey) {
        // CTRL+ENTER = save
        handleSubmit(e as any);
        return;
      }
      e.preventDefault();
      const nextRef = inputRefs.current[fieldIndex + 1];
      if (nextRef) nextRef.focus();
    }
  };

  // Filter colors by selected model
  const availableColors = useMemo(() => {
    if (!form.Modele) return [];
    const colors = validProducts
      .filter((p) => p.Nom_Commercial === form.Modele && p.Couleur && p.Couleur !== "�")
      .map((p) => p.Couleur as string);
    return [...new Set(colors)].sort();
  }, [form.Modele]);

  // Filter formats by selected model + couleur (dynamic from REF_PRODUIT.json)
  const availableFormats = useMemo(() => {
    if (!form.Modele) return [];
    let filtered = validProducts.filter((p) => p.Nom_Commercial === form.Modele);
    if (form.Couleur) {
      filtered = filtered.filter((p) => p.Couleur === form.Couleur);
    }
    const formats = filtered.map((p) => p.Format_Nominal as string);
    return [...new Set(formats)].sort();
  }, [form.Modele, form.Couleur]);

  // Auto-select format when only one option is available
  useEffect(() => {
    if (availableFormats.length === 1 && form.Format !== availableFormats[0]) {
      setForm((prev) => ({ ...prev, Format: availableFormats[0] }));
    }
  }, [availableFormats]);

  // Get Surface_CAR_m2 dynamically from Format.json (Priority) or REF_PRODUIT.json
  const surfaceCAR = useMemo(() => {
    if (!form.Format) return 0;
    
    // PRIORITY 1: Format.json rules
    const fmtMatch = (formatData as any[]).find(f => f.Format_Nominal === form.Format);
    if (fmtMatch && fmtMatch.Surface_CAR_m2 && Number(fmtMatch.Surface_CAR_m2) > 0) {
      return Number(fmtMatch.Surface_CAR_m2);
    }

    // PRIORITY 2: REF_PRODUIT.json fallback
    if (!form.Modele) return 0;
    const match = validProducts.find(
      (p) =>
        p.Nom_Commercial === form.Modele &&
        (!form.Couleur || p.Couleur === form.Couleur) &&
        p.Format_Nominal === form.Format
    );
    return match ? Number(match.Surface_CAR_m2) : 0;
  }, [form.Modele, form.Couleur, form.Format]);

  // Recalculate Project_m2 when Project_pcs or surfaceCAR changes
  useEffect(() => {
    const pcs = Number(form.Project_pcs) || 0;
    const m2 = pcs * surfaceCAR;
    if (m2 > 0) {
      setForm((prev) => ({ ...prev, Project_m2: m2.toFixed(4) }));
    }
  }, [form.Project_pcs, surfaceCAR]);

  const choix1 = Number(form.Choix_1_m2) || 0;
  const choix2 = Number(form.Choix_2_m2) || 0;
  const choix3 = Number(form.Choix_3_m2) || 0;
  const totalM2 = choix1 + choix2 + choix3;
  const pressageM2 = Number(form.Pressage_m2) || 0;
  const projectaM2 = Number(form.Project_m2) || 0;
  const emaillageM2 = Number(form.Emaillage_m2) || 0;
  const cycleMin = Number(form.Cycle_min) || 0;
  const nbPieces = Number(form.Nb_Pieces_Four) || 0;
  const cuissonM2 = surfaceCAR * nbPieces;
  const fourMinutesVides = Number(form.Four_Minutes_Vides) || 0;
  const fourConsommationKwh = Number(form.Four_Consommation_Kwh) || 0;

  // Hydrate form when editing an existing entry
  useEffect(() => {
    if (!editingEntry) return;
    setForm({
      Date: editingEntry.Date,
      Horaire: editingEntry.Horaire,
      Heure_Debut: editingEntry.Heure_Debut,
      Heure_Fin: editingEntry.Heure_Fin,
      Groupe: editingEntry.Groupe,
      Chef_Equipe: editingEntry.Chef_Equipe,
      Modele: editingEntry.Modele,
      Couleur: editingEntry.Couleur,
      Format: editingEntry.Format,
      Choix_1_m2: String(editingEntry.Choix_1_m2),
      Choix_2_m2: String(editingEntry.Choix_2_m2),
      Choix_3_m2: String(editingEntry.Choix_3_m2),
      Pressage_m2: String(editingEntry.Pressage_m2),
      Project_m2: String(editingEntry.Project_m2),
      Project_pcs: editingEntry.Surface_CAR_m2 > 0 ? (editingEntry.Project_m2 / editingEntry.Surface_CAR_m2).toFixed(0) : "",
      Emaillage_m2: String(editingEntry.Emaillage_m2),
      Cycle_min: String(editingEntry.Cycle_min),
      Nb_Pieces_Four: String(editingEntry.Nb_Pieces_Four),
      Four_Minutes_Vides: String(editingEntry.Four_Minutes_Vides),
      Four_Consommation_Kwh: String(editingEntry.Four_Consommation_Kwh),
    });
  }, [editingEntry]);

  const handleHoraireChange = (value: string) => {
    const h = HORAIRES.find((h) => h.nom === value);
    setForm((prev) => ({
      ...prev,
      Horaire: value,
      Heure_Debut: h?.debut ?? "",
      Heure_Fin: h?.fin ?? "",
    }));
  };

  const handleModelChange = (value: string) => {
    setForm((prev) => ({ ...prev, Modele: value }));
  };

  const handleCouleurChange = (value: string) => {
    setForm((prev) => ({ ...prev, Couleur: value }));
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && editingEntry && onUpdate) {
      onUpdate({
        id: editingEntry.id,
        Date: form.Date,
        Horaire: form.Horaire,
        Heure_Debut: form.Heure_Debut,
        Heure_Fin: form.Heure_Fin,
        Groupe: form.Groupe,
        Chef_Equipe: form.Chef_Equipe,
        Modele: form.Modele,
        Couleur: form.Couleur,
        Format: form.Format,
        Choix_1_m2: choix1,
        Choix_2_m2: choix2,
        Choix_3_m2: choix3,
        Total_m2: totalM2,
        Pressage_m2: pressageM2,
        Project_m2: projectaM2,
        Emaillage_m2: emaillageM2,
        Cycle_min: cycleMin,
        Nb_Pieces_Four: nbPieces,
        Surface_CAR_m2: surfaceCAR,
        Cuisson_M2: cuissonM2,
        Four_Minutes_Vides: fourMinutesVides,
        Four_Consommation_Kwh: fourConsommationKwh,
      });
      return;
    }

    onSubmit({
      Date: form.Date,
      Horaire: form.Horaire,
      Heure_Debut: form.Heure_Debut,
      Heure_Fin: form.Heure_Fin,
      Groupe: form.Groupe,
      Chef_Equipe: form.Chef_Equipe,
      Modele: form.Modele,
      Couleur: form.Couleur,
      Format: form.Format,
      Choix_1_m2: choix1,
      Choix_2_m2: choix2,
      Choix_3_m2: choix3,
      Total_m2: totalM2,
      Pressage_m2: pressageM2,
      Project_m2: projectaM2,
      Emaillage_m2: emaillageM2,
      Cycle_min: cycleMin,
      Nb_Pieces_Four: nbPieces,
      Surface_CAR_m2: surfaceCAR,
      Cuisson_M2: cuissonM2,
      Four_Minutes_Vides: fourMinutesVides,
      Four_Consommation_Kwh: fourConsommationKwh,
    });
    setForm({
      Date: form.Date,
      Horaire: "",
      Heure_Debut: "",
      Heure_Fin: "",
      Groupe: "",
      Chef_Equipe: "",
      Modele: "",
      Couleur: "",
      Format: "",
      Choix_1_m2: "",
      Choix_2_m2: "",
      Choix_3_m2: "",
      Pressage_m2: "",
      Project_m2: "",
      Project_pcs: "",
      Emaillage_m2: "",
      Cycle_min: "",
      Nb_Pieces_Four: "",
      Four_Minutes_Vides: "",
      Four_Consommation_Kwh: "",
    });
  };

  const getFocusableFields = (formEl: HTMLElement) =>
    Array.from(
      formEl.querySelectorAll<HTMLElement>(
        'input, select, textarea, [role="combobox"], button[type="button"]'
      )
    ).filter(
      (el) =>
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-hidden") !== "true" &&
        el.offsetParent !== null
    );

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    const tagName = target.tagName;

    const isInputLike =
      tagName === "INPUT" ||
      tagName === "SELECT" ||
      tagName === "TEXTAREA" ||
      target.getAttribute("role") === "combobox";

    // Ctrl+S / Cmd+S => save
    if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e as any);
      return;
    }

    if (!isInputLike) return;

    const formEl = e.currentTarget;
    const focusables = getFocusableFields(formEl);
    const currentIndex = focusables.indexOf(target);

    // Arrow Left / Arrow Right navigation between fields
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      // Don't hijack arrows inside text inputs when cursor is in the middle
      if (tagName === "INPUT" && (target as HTMLInputElement).type !== "number") {
        const input = target as HTMLInputElement;
        if (e.key === "ArrowLeft" && (input.selectionStart ?? 0) > 0) return;
        if (e.key === "ArrowRight" && (input.selectionStart ?? 0) < (input.value?.length ?? 0)) return;
      }

      e.preventDefault();
      if (currentIndex !== -1) {
        const nextIndex = e.key === "ArrowRight" ? currentIndex + 1 : currentIndex - 1;
        const next = focusables[nextIndex];
        if (next) next.focus();
      }
      return;
    }

    if (e.key === "Enter") {
      if (e.ctrlKey) {
        handleSubmit(e as any);
        return;
      }
      e.preventDefault();
      if (currentIndex !== -1) {
        const next = focusables[currentIndex + 1];
        if (next) next.focus();
      }
      return;
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
      {/* Row 1: Date, Horaire, Heures */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Date</Label>
          <Input
            ref={(el) => { inputRefs.current[0] = el; }}
            type="date"
            value={form.Date}
            onChange={(e) => update("Date", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Horaire</Label>
          <Select value={form.Horaire} onValueChange={handleHoraireChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {HORAIRES.map((h) => (
                <SelectItem key={h.id} value={h.nom}>{h.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Heure Début</Label>
          <Input value={form.Heure_Debut} readOnly className="bg-muted" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Heure Fin</Label>
          <Input value={form.Heure_Fin} readOnly className="bg-muted" />
        </div>
      </div>

      {/* Row 2: Groupe, Chef */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Groupe</Label>
          <Input
            ref={(el) => { inputRefs.current[1] = el; }}
            value={form.Groupe}
            onChange={(e) => update("Groupe", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 1)}
            placeholder="Groupe..."
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Chef d'Équipe</Label>
          <Input
            ref={(el) => { inputRefs.current[2] = el; }}
            value={form.Chef_Equipe}
            onChange={(e) => update("Chef_Equipe", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 2)}
            placeholder="Chef d'équipe..."
            list="chef-equipe-options"
          />
          <datalist id="chef-equipe-options">
            {chefSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Row 3: Modèle, Couleur, Format */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Modèle</Label>
          <Select value={form.Modele} onValueChange={handleModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Modèle..." />
            </SelectTrigger>
            <SelectContent>
              {uniqueModels.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Couleur</Label>
          <Select
            value={form.Couleur}
            onValueChange={handleCouleurChange}
            disabled={!form.Modele}
          >
            <SelectTrigger>
              <SelectValue placeholder={form.Modele ? "Couleur..." : "Choisir modèle d'abord"} />
            </SelectTrigger>
            <SelectContent>
              {availableColors.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Format</Label>
          {availableFormats.length === 0 && form.Modele ? (
            <p className="text-xs text-destructive py-2">Aucun format disponible pour ce modèle/couleur.</p>
          ) : (
            <Select value={form.Format} onValueChange={(v) => update("Format", v)} disabled={!form.Modele}>
              <SelectTrigger>
                <SelectValue placeholder="Format..." />
              </SelectTrigger>
              <SelectContent>
                {availableFormats.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Row 4: Choix 1, 2, 3, Total */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">1ère Choix m²</Label>
          <Input
            ref={(el) => { inputRefs.current[3] = el; }}
            type="number"
            value={form.Choix_1_m2}
            onChange={(e) => update("Choix_1_m2", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 3)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">2ème Choix m²</Label>
          <Input
            ref={(el) => { inputRefs.current[4] = el; }}
            type="number"
            value={form.Choix_2_m2}
            onChange={(e) => update("Choix_2_m2", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 4)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">3ème Choix m²</Label>
          <Input
            ref={(el) => { inputRefs.current[5] = el; }}
            type="number"
            value={form.Choix_3_m2}
            onChange={(e) => update("Choix_3_m2", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 5)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Total m²</Label>
          <Input value={totalM2.toFixed(2)} readOnly className="bg-muted font-semibold" />
        </div>
      </div>

      {/* Row 5: Pressage, Emaillage, Cycle */}
      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Pressage m²</Label>
          <Input
            ref={(el) => { inputRefs.current[6] = el; }}
            type="number"
            value={form.Pressage_m2}
            onChange={(e) => update("Pressage_m2", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 6)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Projecta (pièces)</Label>
          <Input
            ref={(el) => { inputRefs.current[7] = el; }}
            type="number"
            value={form.Project_pcs}
            onChange={(e) => update("Project_pcs", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 7)}
            placeholder="0"
          />
          {surfaceCAR > 0 && form.Project_pcs && (
            <p className="text-[10px] text-primary font-medium">
              = {form.Project_m2} m²
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Emaillage m²</Label>
          <Input
            ref={(el) => { inputRefs.current[8] = el; }}
            type="number"
            value={form.Emaillage_m2}
            onChange={(e) => update("Emaillage_m2", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 8)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Cycle min</Label>
          <Input
            ref={(el) => { inputRefs.current[9] = el; }}
            type="number"
            value={form.Cycle_min}
            onChange={(e) => update("Cycle_min", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 9)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Section FOUR */}
      <div className="space-y-2 rounded-lg border p-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Four</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Nb Pièces Four</Label>
            <Input
              ref={(el) => { inputRefs.current[10] = el; }}
              type="number"
              value={form.Nb_Pieces_Four}
              onChange={(e) => update("Nb_Pieces_Four", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 10)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Surface CAR m²</Label>
            <Input value={surfaceCAR > 0 ? surfaceCAR.toFixed(4) : "—"} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Production Four m²</Label>
            <Input
              value={cuissonM2.toFixed(4)}
              readOnly
              className="bg-muted font-semibold text-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Minutes vides Four</Label>
            <Input
              type="number"
              value={form.Four_Minutes_Vides}
              onChange={(e) => update("Four_Minutes_Vides", e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Consommation Four kW/h</Label>
            <Input
              type="number"
              value={form.Four_Consommation_Kwh}
              onChange={(e) => update("Four_Consommation_Kwh", e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </div>


      <div className="flex items-center gap-3">
        {isEditMode && onCancelEdit && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancelEdit}
          >
            Annuler l'édition
          </Button>
        )}
        <Button type="submit" className="gap-2">
          <Plus className="h-4 w-4" />
          {isEditMode ? "Mettre à jour" : "Ajouter l'entrée"}
        </Button>
        {!isEditMode && (
          <span className="text-xs text-muted-foreground">ou CTRL+Entrée</span>
        )}
      </div>
    </form>
  );
}
