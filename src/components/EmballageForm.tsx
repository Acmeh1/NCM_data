import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
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

const validProducts = (refProduit as any[]).filter(
  (p) =>
    p.Nom_Commercial && p.Nom_Commercial !== "" &&
    p.Format_Nominal && p.Format_Nominal !== ""
);

function getSurfacePerPiece(modele: string, couleur: string, format: string): number {
  const fmtMatch = (formatData as any[]).find(f => f.Format_Nominal === format);
  if (fmtMatch && fmtMatch.Surface_CAR_m2 && Number(fmtMatch.Surface_CAR_m2) > 0) {
    return Number(fmtMatch.Surface_CAR_m2);
  }
  const match = validProducts.find(
    (p) =>
      p.Nom_Commercial === modele &&
      (!couleur || p.Couleur === couleur) &&
      p.Format_Nominal === format
  );
  return match ? Number(match.Surface_CAR_m2) : 0;
}

function getM2PerPalette(modele: string, couleur: string, format: string): number {
  const match = validProducts.find(
    (p) =>
      p.Nom_Commercial === modele &&
      (!couleur || p.Couleur === couleur) &&
      p.Format_Nominal === format
  );
  return match ? Number(match.M2_PALETTE) || 0 : 0;
}

const defaultChoix = (): any[] => [
  { Choice_Type: "1er Choix", Nb_Palette: 0, Reste_m2: 0, Surface_totale_m2: 0 },
  { Choice_Type: "2ème Choix", Nb_Palette: 0, Reste_m2: 0, Surface_totale_m2: 0 },
  { Choice_Type: "3ème Choix", Nb_Palette: 0, Reste_m2: 0, Surface_totale_m2: 0 },
];

export default function EmballageForm({
  journalierEntries,
  onSubmit,
  editingEntry,
  onUpdate,
  onCancelEdit,
}: Props) {
  const isEditMode = !!editingEntry && !!onUpdate;

  const [linkedId, setLinkedId] = useState("");
  const [choixList, setChoixList] = useState<any[]>(defaultChoix());

  const linkedEntry = useMemo(
    () => journalierEntries.find((e) => e.id === linkedId),
    [linkedId, journalierEntries]
  );

  const m2PerPalette = useMemo(() => {
    if (!linkedEntry) return 0;
    return getM2PerPalette(linkedEntry.Modele, linkedEntry.Couleur, linkedEntry.Format);
  }, [linkedEntry]);

  const updateChoix = (index: number, field: string, value: number) => {
    setChoixList((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      
      if (item.Choice_Type === "1er Choix") {
        item.Surface_totale_m2 = (Number(item.Nb_Palette) || 0) * m2PerPalette + (Number(item.Reste_m2) || 0);
      }
      updated[index] = item;
      return updated;
    });
  };

  const submitForm = () => {
    if (!linkedEntry) return;

    const finalChoix = choixList.map((c) => ({
      ...c,
      Surface_totale_m2: c.Choice_Type === "1er Choix" 
        ? ((Number(c.Nb_Palette) || 0) * m2PerPalette + (Number(c.Reste_m2) || 0))
        : (Number(c.Surface_totale_m2) || 0),
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
    setChoixList(defaultChoix());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  useEffect(() => {
    if (!editingEntry) return;
    setLinkedId(editingEntry.Linked_Journalier_ID);
    const newChoix = defaultChoix();
    editingEntry.choix.forEach(c => {
      const isFirstChoice = c.Choice_Type === "A" || c.Choice_Type === "1er Choix";
      const isSecondChoice = c.Choice_Type === "B" || c.Choice_Type === "2ème Choix";
      const isThirdChoice = c.Choice_Type === "C" || c.Choice_Type === "3ème Choix";
      let targetIdx = -1;
      
      if (isFirstChoice) targetIdx = 0;
      else if (isSecondChoice) targetIdx = 1;
      else if (isThirdChoice) targetIdx = 2;
      else targetIdx = newChoix.findIndex(nc => nc.Choice_Type === c.Choice_Type);

      if (targetIdx !== -1) {
        newChoix[targetIdx].Nb_Palette = c.Nb_Palette || 0;
        newChoix[targetIdx].Surface_totale_m2 = c.Surface_totale_m2 || 0;
      }
    });
    setChoixList(newChoix);
  }, [editingEntry]);

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitForm();
      return;
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
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

      {linkedEntry && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Date", value: linkedEntry.Date },
            { label: "Horaire", value: linkedEntry.Horaire },
            { label: "Modèle", value: linkedEntry.Modele },
            { label: "Format", value: linkedEntry.Format },
          ].map((f) => (
            <div key={f.label} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input value={f.value} readOnly className="bg-muted text-xs" />
            </div>
          ))}
        </div>
      )}

      {linkedEntry && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Lignes d'emballage</Label>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Choix</th>
                  <th className="px-3 py-2 text-left font-medium">Nb Palettes</th>
                  <th className="px-3 py-2 text-left font-medium">Reste (m²)</th>
                  <th className="px-3 py-2 text-left font-medium">Surface (m²)</th>
                </tr>
              </thead>
              <tbody>
                {choixList.map((choix, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2 font-medium">{choix.Choice_Type}</td>
                    <td className="px-3 py-2">
                      {idx === 0 ? (
                        <Input
                          type="number"
                          value={choix.Nb_Palette || ""}
                          onChange={(e) => updateChoix(idx, "Nb_Palette", Number(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 max-w-[120px]"
                          step="0.01"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs italic">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {idx === 0 ? (
                        <Input
                          type="number"
                          value={choix.Reste_m2 || ""}
                          onChange={(e) => updateChoix(idx, "Reste_m2", Number(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 max-w-[120px]"
                          step="0.01"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs italic">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {idx === 0 ? (
                        <span className="font-semibold text-primary">
                          {((Number(choix.Nb_Palette) || 0) * m2PerPalette + (Number(choix.Reste_m2) || 0)).toFixed(2)}
                        </span>
                      ) : (
                        <Input
                          type="number"
                          value={choix.Surface_totale_m2 || ""}
                          onChange={(e) => updateChoix(idx, "Surface_totale_m2", Number(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 max-w-[120px] border-primary/50 focus-visible:ring-primary"
                          step="0.01"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Button type="submit" className="gap-2" disabled={!linkedEntry}>
        <Save className="h-4 w-4" />
        {isEditMode ? "Mettre à jour" : "Enregistrer l'emballage"}
      </Button>
    </form>
  );
}
