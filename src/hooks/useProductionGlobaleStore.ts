import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleDbError } from "@/lib/permissionError";
import { uuidv4 } from "@/lib/uuid";

export interface ProductionGlobaleEntry {
  id: string;
  created_at?: string;

  // Journalier
  date: string;
  horaire: string;
  heure_debut: string;
  heure_fin: string;
  groupe: string;
  chef_equipe: string;
  modele: string;
  couleur: string;
  format: string;
  surface_car_m2: number;
  total_m2: number;
  pressage_m2: number;
  project_m2: number;
  emaillage_m2: number;
  nb_pieces_four: number;
  cuisson_m2: number;
  four_minutes_vides: number;
  four_consommation_kwh: number;

  // Stat Linea
  choix1_pieces: number;
  choix1_surface_m2: number;
  choix2_pieces: number;
  choix2_surface_m2: number;
  choix3_pieces: number;
  choix3_surface_m2: number;

  // Casse
  casse_press_kg: number;
  casse_sortie_sechoir_kg: number;
  casse_emaillage_kg: number;
  casse_projecta_kg: number;
  casse_entree_four_kg: number;
  casse_cuite_kg: number;
}

export function useProductionGlobaleStore() {
  const [entries, setEntries] = useState<ProductionGlobaleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from("production_globale")
      .select("*")
      .gte("date", dateFilter)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("production_globale load error:", error);
      toast.error("Erreur de chargement des données globales");
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addEntry = useCallback(async (entry: Omit<ProductionGlobaleEntry, "id" | "created_at">) => {
    const payload = {
      id: uuidv4(),
      ...entry,
    };

    const { data, error } = await supabase
      .from("production_globale")
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur d'ajout global"));
      return null;
    }

    setEntries((prev) => [data as ProductionGlobaleEntry, ...prev]);
    return data as ProductionGlobaleEntry;
  }, []);

  const updateEntry = useCallback(async (entry: ProductionGlobaleEntry) => {
    const { id, created_at, ...updateData } = entry;
    const { data, error } = await supabase
      .from("production_globale")
      .update(updateData as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur de mise à jour"));
      return null;
    }

    setEntries((prev) => prev.map((e) => (e.id === id ? (data as ProductionGlobaleEntry) : e)));
    return data as ProductionGlobaleEntry;
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("production_globale")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(handleDbError(error, "Erreur de suppression"));
      return false;
    }

    setEntries((prev) => prev.filter((e) => e.id !== id));
    return true;
  }, []);

  return { entries, loading, addEntry, updateEntry, deleteEntry, reload: load };
}
