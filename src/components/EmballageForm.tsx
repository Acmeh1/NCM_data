import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import refProduit from "@/data/REF_PRODUIT.json";
import formatData from "@/data/Format.json";
import type { ProductionEntry } from "@/hooks/useProductionStore";
import type { EmballageEntry, EmballageChoix } from "@/hooks/useEmballageStore";

interface Props {
  journalierEntries: ProductionEntry[];
  onSubmit: (entry: Omit<EmballageEntry, "id">) => void;
  editingEntry?: EmballageEntry | null;
  onUpdate?: (entry: EmballageEntry) => void;
  onCancelEdit?: () => void;
}

const CHOICE_TYPES = ["A", "B", "C", "D", "Choix_Commercial", "Choix_Commercial_Decasse"];

// Get M2_PALETTE from REF_PRODUIT.json dynamically
const validProducts = (refProduit as any[]).filter(
  (p) =>
    p.Nom_Commercial && p.Nom_Commercial !== "�" &&
    p.Format_Nominal && p.Format_Nominal !== "�" &&
    p.M2_PALETTE && p.M2_PALETTE !== "#N/A" &&
    Number(p.M2_PALETTE) > 0
);

function getSurfaceParPalette(modele: string, couleur: string, format: string): number {
  // PRIORITY 1: Check Format.json for standard surface rules
  const fmtMatch = (formatData as any[]).find(f => f.Format_Nominal === format);
  if (fmtMatch && fmtMatch.M2_PALETTE && Number(fmtMatch.M2_PALETTE) > 0) {
    return Number(fmtMatch.M2_PALETTE);
  }

  // PRIORITY 2: Fallback to REF_PRODUIT.json specific product rules
  const match = validProducts.find(
    (p) =>
      p.Nom_Commercial === modele &&
      (!couleur || p.Couleur === couleur) &&
      p.Format_Nominal === format
  );
  return match ? Number(match.M2_PALETTE) : 0;
}

const emptyChoix = (): EmballageChoix => ({
  Choice_Type: "",
  Nb_Palette: 0,
  Surface_par_palette: 0,
  Surface_totale_m2: 0,
  Reste_m2: 0,
});

export default function EmballageForm({
  journalierEntries,
  onSubmit,
  editingEntry,
  onUpdate,
  onCancelEdit,
}: Props) {
  const isEditMode = !!editingEntry && !!onUpdate;

  const [linkedId, setLinkedId] = useState("");
  const [choixList, setChoixList] = useState<EmballageChoix[]>([emptyChoix()]);

  const linkedEntry = useMemo(
    () => journalierEntries.find((e) => e.id === linkedId),
    [linkedId, journalierEntries]
  );

  const surfaceParPalette = useMemo(() => {
    if (!linkedEntry) return 0;
    return getSurfaceParPalette(linkedEntry.Modele, linkedEntry.Couleur, linkedEntry.Format);
  }, [linkedEntry]);

  const updateChoix = (index: number, field: keyof EmballageChoix, value: any) => {
    setChoixList((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      // Recalculate surface
      if (field === "Nb_Palette" || field === "Choice_Type") {
        item.Surface_par_palette = surfaceParPalette;
        item.Surface_totale_m2 = (Number(item.Nb_Palette) || 0) * surfaceParPalette;
      }
      updated[index] = item;
      return updated;
    });
  };

  const addChoixRow = () => {
    setChoixList((prev) => [...prev, emptyChoix()]);
  };

  const removeChoixRow = (index: number) => {
    setChoixList((prev) => prev.filter((_, i) => i !== index));
  };

  const submitForm = () => {
    if (!linkedEntry) return;

    const finalChoix = choixList.map((c) => ({
      ...c,
      Surface_par_palette: surfaceParPalette,
      Surface_totale_m2: (Number(c.Nb_Palette) || 0) * surfaceParPalette,
    }));

    if (isEditMode && editingEntry && onUpdate) {
      onUpdate({
        ...editingEntry,
        Linked_Journalier_ID: linkedId,
        Date: linkedEntry.Date,
        Horaire: linkedEntry.Horaire,
        Heure_Debut: linkedEntry.Heure_Debut,
        Heure_Fin: linkedEntry.Heure_Fin,
        Groupe: linkedEntry.Groupe,
        Chef_Equipe: linkedEntry.Chef_Equipe,
        Modele: linkedEntry.Modele,
        Couleur: linkedEntry.Couleur,
        Format: linkedEntry.Format,
        choix: finalChoix,
      });
      return;
    }

    onSubmit({
      Linked_Journalier_ID: linkedId,
      Date: linkedEntry.Date,
      Horaire: linkedEntry.Horaire,
      Heure_Debut: linkedEntry.Heure_Debut,
      Heure_Fin: linkedEntry.Heure_Fin,
      Groupe: linkedEntry.Groupe,
      Chef_Equipe: linkedEntry.Chef_Equipe,
      Modele: linkedEntry.Modele,
      Couleur: linkedEntry.Couleur,
      Format: linkedEntry.Format,
      choix: finalChoix,
    });

    setLinkedId("");
    setChoixList([emptyChoix()]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  // Hydrate when editing an existing emballage entry
  useEffect(() => {
    if (!editingEntry) return;
    setLinkedId(editingEntry.Linked_Journalier_ID);
    setChoixList(editingEntry.choix);
  }, [editingEntry]);

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    const tagName = target.tagName;

    const isInputLike =
      tagName === "INPUT" ||
      tagName === "SELECT" ||
      tagName === "TEXTAREA" ||
      target.getAttribute("role") === "combobox";

    // Ctrl+S / Cmd+S => validation explicite
    if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitForm();
      return;
    }

    if (!isInputLike) return;

    // Entrée => se comporte comme Tab (focus suivant) et ne soumet jamais le formulaire
    if (e.key === "Enter") {
      e.preventDefault();

      // Check if we're on the last editable field of the last choix row → auto-add new row
      const rowAttr = target.getAttribute("data-row");
      const colAttr = target.getAttribute("data-col");
      if (rowAttr != null && colAttr != null) {
        const row = parseInt(rowAttr, 10);
        const col = parseInt(colAttr, 10);
        // col 2 = Reste_m2 (last editable field), check if last row
        if (col === 2 && row === choixList.length - 1) {
          addChoixRow();
          // Focus the first field of the new row after React renders
          setTimeout(() => {
            const selector = `[data-row="${row + 1}"][data-col="${0}"]`;
            const next = e.currentTarget.querySelector<HTMLElement>(selector);
            if (next) next.focus();
          }, 50);
          return;
        }
      }

      const form = e.currentTarget;
      const focusables = Array.from(
        form.querySelectorAll<HTMLElement>(
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

    // Navigation aux flèches dans la grille des lignes d'emballage
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
          nextRow = Math.min(choixList.length - 1, row + 1);
          break;
        case "ArrowLeft":
          nextCol = Math.max(0, col - 1);
          break;
        case "ArrowRight":
          nextCol = col + 1;
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
      {/* Link to Production Journalier */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Sélectionner Production Journalier
        </Label>
        <Select value={linkedId} onValueChange={setLinkedId}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir une entrée journalier..." />
          </SelectTrigger>
          <SelectContent>
            {journalierEntries.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.Date} — {e.Horaire} — {e.Modele} {e.Couleur} ({e.Format})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Auto-filled fields (read-only) */}
      {linkedEntry && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: "Date", value: linkedEntry.Date },
            { label: "Horaire", value: linkedEntry.Horaire },
            { label: "Groupe", value: linkedEntry.Groupe },
            { label: "Modèle", value: linkedEntry.Modele },
            { label: "Couleur", value: linkedEntry.Couleur },
            { label: "Format", value: linkedEntry.Format },
            { label: "Surface/Palette", value: surfaceParPalette > 0 ? surfaceParPalette.toFixed(2) : "—" },
          ].map((f) => (
            <div key={f.label} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input value={f.value} readOnly className="bg-muted text-xs" />
            </div>
          ))}
        </div>
      )}

      {/* Choix entries */}
      {linkedEntry && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Lignes d'emballage</Label>
          {choixList.map((choix, idx) => (
            <div key={idx} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end p-3 border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type Choix</Label>
                <Select value={choix.Choice_Type} onValueChange={(v) => updateChoix(idx, "Choice_Type", v)}>
                  <SelectTrigger
                    data-row={idx}
                    data-col={0}
                    className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <SelectValue placeholder="Type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CHOICE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nb Palette</Label>
                <Input
                  type="number"
                  value={choix.Nb_Palette || ""}
                  data-row={idx}
                  data-col={1}
                  onChange={(e) => updateChoix(idx, "Nb_Palette", Number(e.target.value) || 0)}
                  placeholder="0"
                  className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Surface/Palette</Label>
                <Input value={surfaceParPalette.toFixed(2)} readOnly className="bg-muted" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Surface Totale m²</Label>
                <Input
                  value={((Number(choix.Nb_Palette) || 0) * surfaceParPalette).toFixed(2)}
                  readOnly
                  className="bg-muted font-semibold text-primary"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Reste m²</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={choix.Reste_m2 || ""}
                  data-row={idx}
                  data-col={2}
                  onChange={(e) => updateChoix(idx, "Reste_m2", Number(e.target.value) || 0)}
                  placeholder="0"
                  className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
              </div>
              <div className="flex items-end">
                {choixList.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="text-destructive"
                    onClick={() => removeChoixRow(idx)}
                    data-row={idx}
                    data-col={3}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addChoixRow}>
            <Plus className="h-4 w-4" /> Ajouter un choix
          </Button>
        </div>
      )}

      <Button type="submit" className="gap-2" disabled={!linkedEntry}>
        <Plus className="h-4 w-4" />
        Enregistrer l'emballage
      </Button>
    </form>
  );
}
