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
import { Plus, Sparkles, Trash2 } from "lucide-react";
import refProduit from "@/data/REF_PRODUIT.json";
import formatData from "@/data/Format.json";
import { useProductionStore, type ProductionEntry } from "@/hooks/useProductionStore";
import OcrImportDialog from "@/components/OcrImportDialog";

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
    p.Nom_Commercial !== "" &&
    p.Format_Nominal &&
    p.Format_Nominal !== "" &&
    p.Surface_CAR_m2 &&
    p.Surface_CAR_m2 !== "#N/A" &&
    Number(p.Surface_CAR_m2) > 0
);

const uniqueModels = [...new Set(validProducts.map((p) => p.Nom_Commercial))].sort();

interface SubArret {
  id: string;
  duree: string;
  type_arret: string;
  cause_arret: string;
  impact_arret: string;
}

export default function ProductionForm({
  onSubmit,
  editingEntry,
  onUpdate,
  onCancelEdit,
}: Props) {
  const isEditMode = !!editingEntry && !!onUpdate;
  const { entries } = useProductionStore();

  // Suggestions historiques pour Chef d'équipe
  const chefSuggestions = useMemo(() => {
    const recentNames = new Set<string>();
    const entriesArray = entries || [];
    for (let i = entriesArray.length - 1; i >= 0; i--) {
      const e = entriesArray[i];
      if (typeof e.Chef_Equipe === "string" && e.Chef_Equipe.trim().length > 0) {
        recentNames.add(e.Chef_Equipe.trim());
        if (recentNames.size >= 5) break;
      }
    }
    const defaults = ["AHMED", "HAMID", "TAREK", "BOUALEME", "BILAL"];
    defaults.forEach(d => { if (!recentNames.has(d)) recentNames.add(d); });
    return Array.from(recentNames).slice(0, 10);
  }, [entries]);

  // Suggestions historiques pour Causes d'arrêt
  const causeSuggestions = useMemo(() => {
    const recent = new Set<string>();
    const entriesArray = entries || [];
    for (let i = entriesArray.length - 1; i >= 0; i--) {
      const e = entriesArray[i];
      if (typeof e.cause_arret === "string" && e.cause_arret.trim().length > 0) {
        try {
          const parsed = JSON.parse(e.cause_arret);
          if (Array.isArray(parsed)) {
            parsed.forEach((sub: any) => {
              if (typeof sub.cause_arret === "string" && sub.cause_arret.trim().length > 0) {
                recent.add(sub.cause_arret.trim());
              }
            });
          } else {
             recent.add(e.cause_arret.trim());
          }
        } catch {
          recent.add(e.cause_arret.trim());
        }
        if (recent.size >= 5) break;
      }
    }
    const defaults = ["Changement de format", "Panne mécanique", "Panne électrique", "Nettoyage", "Manque matière", "TEST"];
    defaults.forEach(d => { if (!recent.has(d)) recent.add(d); });
    return Array.from(recent).slice(0, 10);
  }, [entries]);

  const [form, setForm] = useState({
    Date: new Date().toISOString().split("T")[0],
    Ligne: "",
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
    VIDE_f_maintenance: "",
    VIDE_f_production: "",
  });

  const [subArrets, setSubArrets] = useState<SubArret[]>([]);

  // Auto add sub-arrêt when minutes > 0
  useEffect(() => {
    const mins = Number(form.Four_Minutes_Vides) || 0;
    if (mins > 0 && subArrets.length === 0) {
      setSubArrets([{ id: crypto.randomUUID(), duree: String(mins), type_arret: "", cause_arret: "", impact_arret: "" }]);
    } else if (mins === 0 && subArrets.length > 0) {
      setSubArrets([]);
    }
  }, [form.Four_Minutes_Vides]);

  // Refs for ENTER key navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, fieldIndex: number) => {
    if (e.key === "Enter") {
      if (e.ctrlKey) {
        handleSubmit(e as any);
        return;
      }
      e.preventDefault();
      const nextRef = inputRefs.current[fieldIndex + 1];
      if (nextRef) nextRef.focus();
    }
  };

  const availableColors = useMemo(() => {
    if (!form.Modele) return [];
    const colors = validProducts
      .filter((p) => p.Nom_Commercial === form.Modele && p.Couleur && p.Couleur !== "")
      .map((p) => p.Couleur as string);
    return [...new Set(colors)].sort();
  }, [form.Modele]);

  const availableFormats = useMemo(() => {
    if (!form.Modele) return [];
    let filtered = validProducts.filter((p) => p.Nom_Commercial === form.Modele);
    if (form.Couleur) {
      filtered = filtered.filter((p) => p.Couleur === form.Couleur);
    }
    const formats = filtered.map((p) => p.Format_Nominal as string);
    return [...new Set(formats)].sort();
  }, [form.Modele, form.Couleur]);

  useEffect(() => {
    if (availableFormats.length === 1 && form.Format !== availableFormats[0]) {
      setForm((prev) => ({ ...prev, Format: availableFormats[0] }));
    }
  }, [availableFormats]);

  const surfaceCAR = useMemo(() => {
    if (!form.Format) return 0;
    const fmtMatch = (formatData as any[]).find(f => f.Format_Nominal === form.Format);
    if (fmtMatch && fmtMatch.Surface_CAR_m2 && Number(fmtMatch.Surface_CAR_m2) > 0) {
      return Number(fmtMatch.Surface_CAR_m2);
    }
    if (!form.Modele) return 0;
    const match = validProducts.find(
      (p) =>
        p.Nom_Commercial === form.Modele &&
        (!form.Couleur || p.Couleur === form.Couleur) &&
        p.Format_Nominal === form.Format
    );
    return match ? Number(match.Surface_CAR_m2) : 0;
  }, [form.Modele, form.Couleur, form.Format]);

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

  useEffect(() => {
    if (!editingEntry) return;
    setForm({
      Date: editingEntry.Date,
      Ligne: editingEntry.Ligne || "",
      Horaire: editingEntry.Horaire,
      Heure_Debut: editingEntry.Heure_Debut,
      Heure_Fin: editingEntry.Heure_Fin,
      Groupe: editingEntry.Groupe,
      Chef_Equipe: editingEntry.Chef_Equipe,
      Modele: editingEntry.Modele,
      Couleur: editingEntry.Couleur,
      Format: editingEntry.Format,
      Choix_1_m2: String(editingEntry.Choix_1_m2 || ""),
      Choix_2_m2: String(editingEntry.Choix_2_m2 || ""),
      Choix_3_m2: String(editingEntry.Choix_3_m2 || ""),
      Pressage_m2: String(editingEntry.Pressage_m2),
      Project_m2: String(editingEntry.Project_m2),
      Project_pcs: editingEntry.Surface_CAR_m2 > 0 ? (editingEntry.Project_m2 / editingEntry.Surface_CAR_m2).toFixed(0) : "",
      Emaillage_m2: String(editingEntry.Emaillage_m2),
      Cycle_min: String(editingEntry.Cycle_min),
      Nb_Pieces_Four: String(editingEntry.Nb_Pieces_Four),
      Four_Minutes_Vides: String(editingEntry.Four_Minutes_Vides),
      Four_Consommation_Kwh: String(editingEntry.Four_Consommation_Kwh),
      VIDE_f_maintenance: "",
      VIDE_f_production: "",
    });

    let parsedArrets: SubArret[] = [];
    if (editingEntry.cause_arret) {
      try {
          const parsed = JSON.parse(editingEntry.cause_arret);
          if (Array.isArray(parsed)) parsedArrets = parsed;
      } catch {
          parsedArrets = [{ id: crypto.randomUUID(), duree: String(editingEntry.Four_Minutes_Vides || ""), type_arret: editingEntry.type_arret || "", cause_arret: editingEntry.cause_arret || "", impact_arret: editingEntry.impact_arret || "" }];
      }
    }
    setSubArrets(parsedArrets);
  }, [editingEntry]);

  const handleModelChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      Modele: value,
      Couleur: "",
      Format: "",
    }));
  };

  const handleCouleurChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      Couleur: value,
      Format: "",
    }));
  };

  const handleHoraireChange = (value: string) => {
    const h = HORAIRES.find((h) => h.nom === value);
    setForm((prev) => ({
      ...prev,
      Horaire: value,
      Heure_Debut: h?.debut ?? "",
      Heure_Fin: h?.fin ?? "",
    }));
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addSubArret = () => {
    setSubArrets([...subArrets, { id: crypto.randomUUID(), duree: "", type_arret: "", cause_arret: "", impact_arret: "" }]);
  };
  const removeSubArret = (id: string) => {
    setSubArrets(subArrets.filter(s => s.id !== id));
  };
  const updateSubArret = (id: string, field: keyof SubArret, value: string) => {
    setSubArrets(subArrets.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalType = "";
    let finalCause = "";
    let finalImpact = "";
    
    if (subArrets.length > 0) {
      finalCause = JSON.stringify(subArrets);
      finalType = subArrets.length > 1 ? "Multiples" : subArrets[0].type_arret;
      finalImpact = subArrets.length > 1 ? "Multiples" : subArrets[0].impact_arret;
    }

    const payload = {
      Date: form.Date,
      Ligne: form.Ligne,
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
      VIDE_f_maintenance: 0,
      VIDE_f_production: 0,
      type_arret: finalType,
      cause_arret: finalCause,
      impact_arret: finalImpact,
    };

    if (isEditMode && editingEntry && onUpdate) {
      onUpdate({ id: editingEntry.id, ...payload });
      return;
    }

    onSubmit(payload);
    setForm({
      Date: form.Date,
      Ligne: "",
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
      VIDE_f_maintenance: "",
      VIDE_f_production: "",
    });
    setSubArrets([]);
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
    const isInputLike = tagName === "INPUT" || tagName === "SELECT" || tagName === "TEXTAREA" || target.getAttribute("role") === "combobox";

    if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e as any);
      return;
    }

    if (!isInputLike) return;

    const formEl = e.currentTarget;
    const focusables = getFocusableFields(formEl);
    const currentIndex = focusables.indexOf(target);

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
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

  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const targetFields = [
    { key: "Date", label: "Date" },
    { key: "Horaire", label: "Horaire" },
    { key: "Groupe", label: "Groupe" },
    { key: "Chef_Equipe", label: "Chef d'Équipe" },
    { key: "Modele", label: "Modèle" },
    { key: "Couleur", label: "Couleur" },
    { key: "Format", label: "Format" },
    { key: "Choix_1_m2", label: "Choix 1 (m²)" },
    { key: "Choix_2_m2", label: "Choix 2 (m²)" },
    { key: "Choix_3_m2", label: "Choix 3 (m²)" },
    { key: "Pressage_m2", label: "Pressage (m²)" },
    { key: "Project_pcs", label: "Projecta (pcs)" },
    { key: "Emaillage_m2", label: "Émaillage (m²)" },
    { key: "Nb_Pieces_Four", label: "Nb Pièces Four" },
    { key: "Four_Minutes_Vides", label: "Min Vides Four" },
    { key: "Four_Consommation_Kwh", label: "Conso Four (kWh)" },
  ];

  const handleFieldAssign = (key: string, value: string) => {
    if (key === "Horaire") handleHoraireChange(value);
    else if (key === "Modele") update("Modele", value);
    else if (key === "Couleur") update("Couleur", value);
    else update(key, value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-500 shrink-0">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-indigo-950 dark:text-indigo-200">Saisie assistée par IA (OCR)</h4>
            <p className="text-xs text-muted-foreground">Numérisez une photo de fiche de production avec PaddleOCR pour pré-remplir les champs.</p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => setIsOcrOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium shadow-md shadow-indigo-600/15 shrink-0 self-stretch sm:self-auto"
        >
          <Sparkles className="h-4 w-4" /> Numériser la Fiche
        </Button>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Date</Label>
          <Input ref={(el) => { inputRefs.current[0] = el; }} type="date" value={form.Date} onChange={(e) => update("Date", e.target.value)} onKeyDown={(e) => handleKeyDown(e, 0)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Horaire</Label>
          <Select value={form.Horaire} onValueChange={handleHoraireChange}>
            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
            <SelectContent>
              {HORAIRES.map((h) => (<SelectItem key={h.id} value={h.nom}>{h.nom}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Heure Début</Label><Input value={form.Heure_Debut} readOnly className="bg-muted" /></div>
        <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Heure Fin</Label><Input value={form.Heure_Fin} readOnly className="bg-muted" /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Ligne</Label>
          <Select value={form.Ligne} onValueChange={(v) => update("Ligne", v)}>
            <SelectTrigger><SelectValue placeholder="Ligne..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="L1">L1</SelectItem>
              <SelectItem value="L2">L2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Groupe</Label>
          <Input ref={(el) => { inputRefs.current[1] = el; }} value={form.Groupe} onChange={(e) => update("Groupe", e.target.value)} onKeyDown={(e) => handleKeyDown(e, 1)} placeholder="Groupe..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Chef d'Équipe</Label>
          <Input ref={(el) => { inputRefs.current[2] = el; }} list="chef-list" value={form.Chef_Equipe} onChange={(e) => update("Chef_Equipe", e.target.value)} onKeyDown={(e) => handleKeyDown(e, 2)} placeholder="Chef d'équipe..." />
          <datalist id="chef-list">
            {chefSuggestions.map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {chefSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {chefSuggestions.map(name => (
                <span key={name} onClick={() => update("Chef_Equipe", name)} className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap transition-colors">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Modèle</Label>
          <Select value={form.Modele} onValueChange={handleModelChange}>
            <SelectTrigger><SelectValue placeholder="Modèle..." /></SelectTrigger>
            <SelectContent>{uniqueModels.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Couleur</Label>
          <Select value={form.Couleur} onValueChange={handleCouleurChange} disabled={!form.Modele}>
            <SelectTrigger><SelectValue placeholder={form.Modele ? "Couleur..." : "Choisir modèle"} /></SelectTrigger>
            <SelectContent>{availableColors.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Format</Label>
          {availableFormats.length === 0 && form.Modele ? (
            <p className="text-xs text-destructive py-2">Aucun format disponible.</p>
          ) : (
            <Select value={form.Format} onValueChange={(v) => update("Format", v)} disabled={!form.Modele}>
              <SelectTrigger><SelectValue placeholder="Format..." /></SelectTrigger>
              <SelectContent>{availableFormats.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}</SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">1er Choix (m²)</Label>
          <Input ref={(el) => { inputRefs.current[3] = el; }} type="number" step="0.01" value={form.Choix_1_m2} onChange={(e) => update("Choix_1_m2", e.target.value)} onKeyDown={(e) => handleKeyDown(e, 3)} placeholder="0" />
          {surfaceCAR > 0 && form.Choix_1_m2 && <p className="text-[10px] text-primary font-medium">= {Math.round((Number(form.Choix_1_m2) || 0) / surfaceCAR)} pièces</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">2ème Choix (m²)</Label>
          <Input ref={(el) => { inputRefs.current[4] = el; }} type="number" step="0.01" value={form.Choix_2_m2} onChange={(e) => update("Choix_2_m2", e.target.value)} onKeyDown={(e) => handleKeyDown(e, 4)} placeholder="0" />
          {surfaceCAR > 0 && form.Choix_2_m2 && <p className="text-[10px] text-primary font-medium">= {Math.round((Number(form.Choix_2_m2) || 0) / surfaceCAR)} pièces</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">3ème Choix (m²)</Label>
          <Input ref={(el) => { inputRefs.current[5] = el; }} type="number" step="0.01" value={form.Choix_3_m2} onChange={(e) => update("Choix_3_m2", e.target.value)} onKeyDown={(e) => handleKeyDown(e, 5)} placeholder="0" />
          {surfaceCAR > 0 && form.Choix_3_m2 && <p className="text-[10px] text-primary font-medium">= {Math.round((Number(form.Choix_3_m2) || 0) / surfaceCAR)} pièces</p>}
        </div>
        <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Total m²</Label><Input value={totalM2.toFixed(2)} readOnly className="bg-muted font-semibold" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Pressage m²</Label>
          <Input ref={(el) => { inputRefs.current[6] = el; }} type="number" value={form.Pressage_m2} onChange={(e) => update("Pressage_m2", e.target.value)} onKeyDown={(e) => handleKeyDown(e, 6)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Projecta (pièces)</Label>
          <Input ref={(el) => { inputRefs.current[7] = el; }} type="number" value={form.Project_pcs} onChange={(e) => update("Project_pcs", e.target.value)} onKeyDown={(e) => handleKeyDown(e, 7)} placeholder="0" />
          {surfaceCAR > 0 && form.Project_pcs && <p className="text-[10px] text-primary font-medium">= {form.Project_m2} m²</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Emaillage m²</Label>
          <Input ref={(el) => { inputRefs.current[8] = el; }} type="number" value={form.Emaillage_m2} onChange={(e) => update("Emaillage_m2", e.target.value)} onKeyDown={(e) => handleKeyDown(e, 8)} placeholder="0" />
        </div>
      </div>

      {/* Section FOUR */}
      <div className="space-y-4 rounded-lg border p-4 bg-card/50">
        <h4 className="text-sm font-bold text-primary uppercase tracking-wide">Section Four & Arrêts</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Nb Pièces Four</Label>
            <Input ref={(el) => { inputRefs.current[10] = el; }} type="number" value={form.Nb_Pieces_Four} onChange={(e) => update("Nb_Pieces_Four", e.target.value)} onKeyDown={(e) => handleKeyDown(e, 10)} placeholder="0" />
          </div>
          <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Surface CAR m²</Label><Input value={surfaceCAR > 0 ? surfaceCAR.toFixed(4) : "—"} readOnly className="bg-muted" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Production Four m²</Label><Input value={cuissonM2.toFixed(4)} readOnly className="bg-muted font-semibold text-primary" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Consommation Four kW/h</Label>
            <Input type="number" value={form.Four_Consommation_Kwh} onChange={(e) => update("Four_Consommation_Kwh", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Minutes vides (Total)</Label>
            <Input type="number" value={form.Four_Minutes_Vides} onChange={(e) => update("Four_Minutes_Vides", e.target.value)} placeholder="0" className="border-indigo-200 dark:border-indigo-900 focus-visible:ring-indigo-500 font-bold" />
          </div>
        </div>

        {subArrets.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dashed space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-primary flex items-center gap-2">
                Détail des Arrêts 
                <span className={`text-xs px-2 py-0.5 rounded-full ${subArrets.reduce((acc, s) => acc + (Number(s.duree) || 0), 0) === fourMinutesVides ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                  ({subArrets.reduce((acc, s) => acc + (Number(s.duree) || 0), 0)} / {fourMinutesVides} min)
                </span>
              </Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addSubArret}>
                <Plus className="h-3 w-3 mr-1"/> Ajouter un sous-arrêt
              </Button>
            </div>
            
            <div className="space-y-2">
              {subArrets.map((arr, index) => (
                <div key={arr.id} className="grid grid-cols-12 gap-3 items-start bg-background border p-3 rounded-md shadow-sm relative group">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Durée (m)</Label>
                    <Input type="number" value={arr.duree} onChange={(e) => updateSubArret(arr.id, "duree", e.target.value)} className="h-8 text-xs font-medium" placeholder="Ex: 2" />
                  </div>
                  <div className="col-span-3 space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Type</Label>
                    <Select value={arr.type_arret} onValueChange={(v) => updateSubArret(arr.id, "type_arret", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type..."/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Production">Production</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Cause / Observation</Label>
                    <Input list={`causes-list-${arr.id}`} value={arr.cause_arret} onChange={(e) => updateSubArret(arr.id, "cause_arret", e.target.value)} className="h-8 text-xs" placeholder="Raison de l'arrêt..." />
                    <datalist id={`causes-list-${arr.id}`}>
                      {causeSuggestions.map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    {causeSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {causeSuggestions.map(c => (
                          <span key={c} onClick={() => updateSubArret(arr.id, "cause_arret", c)} className="cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap transition-colors">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Impact</Label>
                    <Select value={arr.impact_arret} onValueChange={(v) => updateSubArret(arr.id, "impact_arret", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Impact..."/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Simple">Simple</SelectItem>
                        <SelectItem value="Moyen">Moyen</SelectItem>
                        <SelectItem value="Grave">Grave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 flex justify-end pt-5">
                     <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeSubArret(arr.id)}>
                       <Trash2 className="h-4 w-4"/>
                     </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isEditMode && onCancelEdit && (
          <Button type="button" variant="outline" onClick={onCancelEdit}>Annuler l'édition</Button>
        )}
        <Button type="submit" className="gap-2">
          <Plus className="h-4 w-4" />
          {isEditMode ? "Mettre à jour" : "Ajouter l'entrée"}
        </Button>
        {!isEditMode && <span className="text-xs text-muted-foreground">ou CTRL+Entrée</span>}
      </div>
    </form>

    <OcrImportDialog open={isOcrOpen} onClose={() => setIsOcrOpen(false)} targetFields={targetFields} onFieldAssign={handleFieldAssign} />
  </div>
  );
}
