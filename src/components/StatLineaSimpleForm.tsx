import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import refProduit from "@/data/REF_PRODUIT.json";
import formatData from "@/data/Format.json";
import type { ProductionEntry } from "@/hooks/useProductionStore";
import type { StatsLineaEntry } from "@/hooks/useStatsLineaStore";

interface Props {
  journalierEntries: ProductionEntry[];
  onSubmit: (entry: Omit<StatsLineaEntry, "id">) => void;
  editingEntry?: StatsLineaEntry | null;
}

function getSurfacePerPiece(modele: string, couleur: string, format: string): number {
  const fmtMatch = (formatData as any[]).find(f => f.Format_Nominal === format);
  if (fmtMatch && fmtMatch.Surface_CAR_m2 && Number(fmtMatch.Surface_CAR_m2) > 0) {
    return Number(fmtMatch.Surface_CAR_m2);
  }
  const match = (refProduit as any[]).find(
    (p) =>
      p.Nom_Commercial === modele &&
      (!couleur || p.Couleur === couleur) &&
      p.Format_Nominal === format
  );
  return match ? Number(match.Surface_CAR_m2) : 0;
}

export default function StatLineaSimpleForm({
  journalierEntries,
  onSubmit,
  editingEntry,
}: Props) {
  const linkedEntry = journalierEntries[0]; // Auto-select since it's used in Stepper

  const surfacePerPiece = useMemo(() => {
    if (!linkedEntry) return 0;
    return Number((linkedEntry as any).Surface_CAR_m2) || getSurfacePerPiece(linkedEntry.Modele, linkedEntry.Couleur, linkedEntry.Format);
  }, [linkedEntry]);

  const [c1, setC1] = useState(0);
  const [c2, setC2] = useState(0);
  const [c3, setC3] = useState(0);

  useEffect(() => {
    if (editingEntry) {
      setC1(editingEntry.choix1_pieces || 0);
      setC2(editingEntry.choix2_pieces || 0);
      setC3(editingEntry.choix3_pieces || 0);
    }
  }, [editingEntry]);

  const submitForm = () => {
    if (!linkedEntry) return;

    const totalPieces = c1 + c2 + c3;
    const s1 = c1 * surfacePerPiece;
    const s2 = c2 * surfacePerPiece;
    const s3 = c3 * surfacePerPiece;
    const totalSurface = s1 + s2 + s3;

    const pct = (val: number) => totalPieces > 0 ? (val / totalPieces) * 100 : 0;

    const payload: Omit<StatsLineaEntry, "id"> = {
      production_id: linkedEntry.id,
      production_date: linkedEntry.Date,
      choix1_pieces: c1,
      choix1_surface_m2: s1,
      choix1_pourcentage: pct(c1),
      choix2_pieces: c2,
      choix2_surface_m2: s2,
      choix2_pourcentage: pct(c2),
      choix3_pieces: c3,
      choix3_surface_m2: s3,
      choix3_pourcentage: pct(c3),
      total_pieces: totalPieces,
      total_surface_m2: totalSurface,

      // Default all other required fields to 0 or empty string
      choix1_operateur_pieces: 0,
      choix1_operateur_pourcentage: 0,
      choix1_planar_pieces: 0,
      choix1_planar_pourcentage: 0,
      choix1_calibre_pieces: 0,
      choix1_calibre_pourcentage: 0,
      choix2_operateur_pieces: 0,
      choix2_operateur_pourcentage: 0,
      choix2_planar_pieces: 0,
      choix2_planar_pourcentage: 0,
      choix2_calibre_pieces: 0,
      choix2_calibre_pourcentage: 0,
      choix3_operateur_pieces: 0,
      choix3_operateur_pourcentage: 0,
      choix3_planar_pieces: 0,
      choix3_planar_pourcentage: 0,
      choix3_calibre_pieces: 0,
      choix3_calibre_pourcentage: 0,

      minutes_absence_alimentation: 0,
      minutes_urgence_manuelle: 0,
      minutes_machine_saturee: 0,
      minutes_total_machine: 0,

      vitesse_moyenne_pieces_min: 0,
      machine_allumee: 0,
      machine_en_marche: 0,
      production_reelle_m2: 0,
      statut_donnees: "Complet",
      motif_incomplet: "",
    };

    onSubmit(payload);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitForm();
      return;
    }
  };

  if (!linkedEntry) return null;

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
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

      <div className="space-y-3">
        <Label className="text-sm font-medium">Répartition par choix</Label>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Choix</th>
                <th className="px-3 py-2 text-left font-medium">Total Pièces</th>
                <th className="px-3 py-2 text-left font-medium">Surface (m²)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "1er Choix", val: c1, set: setC1 },
                { label: "2ème Choix", val: c2, set: setC2 },
                { label: "3ème Choix", val: c3, set: setC3 },
              ].map((row, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={row.val || ""}
                      onChange={(e) => row.set(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 max-w-[150px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-semibold text-primary">
                      {((row.val || 0) * surfacePerPiece).toFixed(4)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Button type="submit" className="gap-2">
        <Save className="h-4 w-4" />
        Enregistrer Stat Linea
      </Button>
    </form>
  );
}
