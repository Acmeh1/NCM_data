import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface KpiObjective {
  id: string;
  label: string;
  description: string;
  formula: string;
  formulaLatex?: string;
  unit: string;
  objective: number;
  objectiveLabel: string;
  lowerIsBetter: boolean;
  color: string;
}

// Default KPI definitions with formulas and default objectives
export const DEFAULT_KPI_OBJECTIVES: KpiObjective[] = [
  {
    id: "volume",
    label: "Volume Produit",
    description: "Surface totale produite (Total Linéa A) sur la période analysée.",
    formula: "Σ total_surface_m2 (Linéa)",
    formulaLatex: "Volume = \\sum total\\_surface\\_m2",
    unit: "m²",
    objective: 8000,
    objectiveLabel: "m²/jour",
    lowerIsBetter: false,
    color: "orange",
  },
  {
    id: "rendement",
    label: "Rendement (1er Choix)",
    description: "Part de la production de qualité 1er Choix sur la production totale linéa.",
    formula: "C1 ÷ Total × 100",
    formulaLatex: "Rendement = \\frac{\\sum choix1\\_surface\\_m2}{\\sum total\\_surface\\_m2} \\times 100",
    unit: "%",
    objective: 85,
    objectiveLabel: "% minimum",
    lowerIsBetter: false,
    color: "sky",
  },
  {
    id: "scrap",
    label: "Taux de Rebut",
    description: "Part de la production déclassée (2ème et 3ème choix) sur la production totale linéa.",
    formula: "(C2 + C3) ÷ Total × 100",
    formulaLatex: "Rebut = \\frac{\\sum (choix2 + choix3)\\_surface\\_m2}{\\sum total\\_surface\\_m2} \\times 100",
    unit: "%",
    objective: 8,
    objectiveLabel: "% maximum",
    lowerIsBetter: true,
    color: "amber",
  },
  {
    id: "utilization",
    label: "Disponibilité Four",
    description: "Taux de disponibilité : mesure le temps réel de production par rapport au temps total disponible.",
    formula: "(Total - Vide) ÷ Total × 100",
    formulaLatex: "Taux = \\frac{Heures\\_Dispo - Heures\\_Vides}{Heures\\_Dispo} \\times 100",
    unit: "%",
    objective: 95,
    objectiveLabel: "% minimum",
    lowerIsBetter: false,
    color: "indigo",
  },
];

const STORAGE_KEY = "ncm_kpi_objectives";

function loadFromLocalStorage(): KpiObjective[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_KPI_OBJECTIVES;
    const saved: { id: string; objective: number }[] = JSON.parse(raw);
    return DEFAULT_KPI_OBJECTIVES.map((def) => {
      const override = saved.find((s) => s.id === def.id);
      return override ? { ...def, objective: override.objective } : def;
    });
  } catch {
    return DEFAULT_KPI_OBJECTIVES;
  }
}

function saveToLocalStorage(kpis: KpiObjective[]) {
  const slim = kpis.map(({ id, objective }) => ({ id, objective }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
}

export function useKpiSettings() {
  const [kpiObjectives, setKpiObjectives] = useState<KpiObjective[]>(loadFromLocalStorage);
  const [saving, setSaving] = useState(false);

  // Try to load from Supabase app_settings table
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("app_settings")
          .select("key, value")
          .eq("key", "kpi_objectives")
          .maybeSingle();

        if (error || !data) return; // table might not exist, use localStorage
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) {
          setKpiObjectives(
            DEFAULT_KPI_OBJECTIVES.map((def) => {
              const override = parsed.find((s: any) => s.id === def.id);
              return override ? { ...def, objective: override.objective } : def;
            })
          );
        }
      } catch {
        // silently fallback to localStorage
      }
    };
    load();
  }, []);

  const updateObjective = useCallback((id: string, newObjective: number) => {
    setKpiObjectives((prev) =>
      prev.map((k) => (k.id === id ? { ...k, objective: newObjective } : k))
    );
  }, []);

  const saveObjectives = useCallback(
    async (kpis: KpiObjective[]) => {
      setSaving(true);
      const slim = kpis.map(({ id, objective }) => ({ id, objective }));

      // Always save to localStorage as fallback
      saveToLocalStorage(kpis);

      // Try to save to Supabase
      try {
        const { error } = await (supabase as any)
          .from("app_settings")
          .upsert(
            { key: "kpi_objectives", value: JSON.stringify(slim) },
            { onConflict: "key" }
          );
        if (!error) {
          setKpiObjectives(kpis);
          setSaving(false);
          return { success: true };
        }
      } catch {
        // fall through: saved only to localStorage
      }

      setKpiObjectives(kpis);
      setSaving(false);
      return { success: true, localOnly: true };
    },
    []
  );

  const getObjective = useCallback(
    (id: string) => {
      return kpiObjectives.find((k) => k.id === id)?.objective ?? null;
    },
    [kpiObjectives]
  );

  return { kpiObjectives, updateObjective, saveObjectives, saving, getObjective };
}
