import { useState, useEffect, useCallback } from "react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleDbError } from "@/lib/permissionError";
import { uuidv4 } from "@/lib/uuid";

export interface ProductionEntry {
  id: string;
  Date: string;
  Horaire: string;
  Heure_Debut: string;
  Heure_Fin: string;
  Groupe: string;
  Chef_Equipe: string;
  Modele: string;
  Couleur: string;
  Format: string;
  Choix_1_m2: number;
  Choix_2_m2: number;
  Choix_3_m2: number;
  Total_m2: number;
  Pressage_m2: number;
  Project_m2: number;
  Emaillage_m2: number;
  Cycle_min: number;
  Nb_Pieces_Four: number;
  Surface_CAR_m2: number;
  Cuisson_M2: number;
  Four_Minutes_Vides: number;
  Four_Consommation_Kwh: number;
}

// Map DB row to frontend interface
function fromDb(row: any): ProductionEntry {
  return {
    id: row.id,
    Date: row.date,
    Horaire: row.horaire,
    Heure_Debut: row.heure_debut,
    Heure_Fin: row.heure_fin,
    Groupe: row.groupe,
    Chef_Equipe: row.chef_equipe,
    Modele: row.modele,
    Couleur: row.couleur,
    Format: row.format,
    Choix_1_m2: Number(row.choix_1_m2),
    Choix_2_m2: Number(row.choix_2_m2),
    Choix_3_m2: Number(row.choix_3_m2),
    Total_m2: Number(row.total_m2),
    Pressage_m2: Number(row.pressage_m2),
    Project_m2: Number(row.Project_m2 ?? row.project_m2 ?? 0),
    Emaillage_m2: Number(row.emaillage_m2),
    Cycle_min: Number(row.cycle_min),
    Nb_Pieces_Four: Number(row.nb_pieces_four),
    Surface_CAR_m2: Number(row.surface_car_m2),
    Cuisson_M2: Number(row.cuisson_m2),
    Four_Minutes_Vides: Number(row.four_minutes_vides ?? 0),
    Four_Consommation_Kwh: Number(row.four_consommation_kwh ?? 0),
  };
}

async function triggerBackup() {
  try {
    const { invokeCloudFunction } = await import("@/lib/cloudFunctions");
    const { error } = await invokeCloudFunction("sqlite-mirror");
    if (error) console.warn("Backup warning:", error.message);
  } catch (e) {
    console.warn("Backup trigger failed:", e);
  }
}

export function useProductionStore() {
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from cloud DB
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("production_journalier")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Load error:", error);
        toast.error("Erreur de chargement des données");
        setEntries([]);
      } else {
        setEntries((data || []).map(fromDb));
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from("production_journalier")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Reload error:", error);
    } else {
      setEntries((data || []).map(fromDb));
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => reload();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [reload]);

  const addEntry = useCallback(async (entry: Omit<ProductionEntry, "id">) => {
    const { data, error } = await supabase
      .from("production_journalier" as any)
      .insert({
        id: uuidv4(),
        date: entry.Date,
        horaire: entry.Horaire,
        heure_debut: entry.Heure_Debut,
        heure_fin: entry.Heure_Fin,
        groupe: entry.Groupe,
        chef_equipe: entry.Chef_Equipe,
        modele: entry.Modele,
        couleur: entry.Couleur,
        format: entry.Format,
        choix_1_m2: entry.Choix_1_m2,
        choix_2_m2: entry.Choix_2_m2,
        choix_3_m2: entry.Choix_3_m2,
        total_m2: entry.Total_m2,
        pressage_m2: entry.Pressage_m2,
        Project_m2: entry.Project_m2,
        emaillage_m2: entry.Emaillage_m2,
        cycle_min: entry.Cycle_min,
        nb_pieces_four: entry.Nb_Pieces_Four,
        surface_car_m2: entry.Surface_CAR_m2,
        cuisson_m2: entry.Cuisson_M2,
        four_minutes_vides: entry.Four_Minutes_Vides,
        four_consommation_kwh: entry.Four_Consommation_Kwh,
      })
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur d'enregistrement"));
      return null;
    }

    const newEntry = fromDb(data);
    setEntries((prev) => [...prev, newEntry]);
    triggerBackup();
    return newEntry;
  }, []);

  const updateEntry = useCallback(async (entry: ProductionEntry) => {
    const { id, ...rest } = entry;
    const { error, data } = await supabase
      .from("production_journalier")
      .update({
        date: rest.Date,
        horaire: rest.Horaire,
        heure_debut: rest.Heure_Debut,
        heure_fin: rest.Heure_Fin,
        groupe: rest.Groupe,
        chef_equipe: rest.Chef_Equipe,
        modele: rest.Modele,
        couleur: rest.Couleur,
        format: rest.Format,
        choix_1_m2: rest.Choix_1_m2,
        choix_2_m2: rest.Choix_2_m2,
        choix_3_m2: rest.Choix_3_m2,
        total_m2: rest.Total_m2,
        pressage_m2: rest.Pressage_m2,
        Project_m2: rest.Project_m2,
        emaillage_m2: rest.Emaillage_m2,
        cycle_min: rest.Cycle_min,
        nb_pieces_four: rest.Nb_Pieces_Four,
        surface_car_m2: rest.Surface_CAR_m2,
        cuisson_m2: rest.Cuisson_M2,
        four_minutes_vides: rest.Four_Minutes_Vides,
        four_consommation_kwh: rest.Four_Consommation_Kwh,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur de mise à jour"));
      return null;
    }

    const updated = fromDb(data);
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    triggerBackup();
    return updated;
  }, []);

  const deleteEntry = useCallback(async (entry: ProductionEntry) => {
    const { error } = await supabase
      .from("production_journalier")
      .delete()
      .eq("id", entry.id);

    if (error) {
      toast.error(handleDbError(error, "Erreur de suppression"));
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    triggerBackup();
  }, []);

  const clearAll = useCallback(async () => {
    const { error } = await supabase
      .from("production_journalier")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      toast.error(handleDbError(error, "Erreur"));
      return;
    }
    setEntries([]);
  }, []);

  return { entries, isLoaded, addEntry, updateEntry, deleteEntry, clearAll, reload };
}
