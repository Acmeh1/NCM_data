import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleDbError } from "@/lib/permissionError";
import { uuidv4 } from "@/lib/uuid";

export interface StatsLineaEntry {
  id: string;
  production_id: string;

  // Section 2
  choix1_pieces: number;
  choix1_surface_m2: number;
  choix1_pourcentage: number;
  choix2_pieces: number;
  choix2_surface_m2: number;
  choix2_pourcentage: number;
  choix3_pieces: number;
  choix3_surface_m2: number;
  choix3_pourcentage: number;
  total_pieces: number;
  total_surface_m2: number;

  // Section 3 – Qualité par choix
  choix1_operateur_pieces: number;
  choix1_operateur_pourcentage: number;
  choix1_planar_pieces: number;
  choix1_planar_pourcentage: number;
  choix1_calibre_pieces: number;
  choix1_calibre_pourcentage: number;

  choix2_operateur_pieces: number;
  choix2_operateur_pourcentage: number;
  choix2_planar_pieces: number;
  choix2_planar_pourcentage: number;
  choix2_calibre_pieces: number;
  choix2_calibre_pourcentage: number;

  choix3_operateur_pieces: number;
  choix3_operateur_pourcentage: number;
  choix3_planar_pieces: number;
  choix3_planar_pourcentage: number;
  choix3_calibre_pieces: number;
  choix3_calibre_pourcentage: number;

  // Section 4
  minutes_absence_alimentation: number;
  minutes_urgence_manuelle: number;
  minutes_machine_saturee: number;
  minutes_total_machine: number;

  // Section 5
  vitesse_moyenne_pieces_min: number;
  machine_allumee: number;
  machine_en_marche: number;
  production_reelle_m2: number;
  statut_donnees?: string;
  motif_incomplet?: string;
}

// Map DB row to frontend interface
function fromDb(row: any): StatsLineaEntry {
  return {
    ...row,
    choix1_pieces: Number(row.choix1_pieces),
    choix2_pieces: Number(row.choix2_pieces),
    choix3_pieces: Number(row.choix3_pieces),
    choix1_surface_m2: Number(row.choix1_surface_m2),
    choix2_surface_m2: Number(row.choix2_surface_m2),
    choix3_surface_m2: Number(row.choix3_surface_m2),
    total_pieces: Number(row.total_pieces),
    total_surface_m2: Number(row.total_surface_m2),
    vitesse_moyenne_pieces_min: Number(row.vitesse_moyenne_pieces_min),
    machine_allumee: Number(row.machine_allumee),
    machine_en_marche: Number(row.machine_en_marche),
    production_reelle_m2: Number(row.production_reelle_m2),
    statut_donnees: row.statut_donnees || "Complet",
    motif_incomplet: row.motif_incomplet || "",
  };
}

export function useStatsLineaStore() {
  const [entries, setEntries] = useState<StatsLineaEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("stats_linea")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Stats load error:", error);
        toast.error("Erreur de chargement des statistiques linea");
        setEntries([]);
      } else {
        setEntries((data || []).map(fromDb));
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  const addEntry = useCallback(async (entry: Omit<StatsLineaEntry, "id">) => {
    const { id, ...insertData } = { id: "", ...entry };

    const { data, error } = await supabase
      .from("stats_linea")
      .insert({ ...insertData, id: uuidv4() } as any)
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur d'enregistrement des statistiques"));
      return null;
    }

    setEntries((prev) => [...prev, data as StatsLineaEntry]);
    return data as StatsLineaEntry;
  }, []);

  const updateEntry = useCallback(async (entry: StatsLineaEntry) => {
    const { id, ...updateData } = entry;
    const { data, error } = await supabase
      .from("stats_linea")
      .update(updateData as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur de mise à jour des statistiques"));
      return null;
    }

    setEntries((prev) =>
      prev.map((e) => (e.id === id ? (data as StatsLineaEntry) : e))
    );
    return data as StatsLineaEntry;
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from("stats_linea").delete().eq("id", id);
    if (error) {
      toast.error(handleDbError(error, "Erreur de suppression des statistiques"));
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, isLoaded, addEntry, updateEntry, deleteEntry };
}

