import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleDbError } from "@/lib/permissionError";
import { uuidv4 } from "@/lib/uuid";

export interface SelectionEntry {
  id: string;
  date: string;
  groupe: string;
  horaire: string;
  heure_debut: string;
  heure_fin: string;
  chef_equipe: string;
  modele: string;
  couleur: string;
  format: string;
  zone_presse: number;
  zone_projecta: number;
  zone_four: number;
  choix_1_m2: number;
  choix_1_taux: number;
  choix_2_m2: number;
  choix_2_taux: number;
  choix_3_m2: number;
  choix_3_taux: number;
}

function fromDb(row: any, arrets: any[]): SelectionEntry {
  return {
    id: row.id,
    date: row.date,
    groupe: row.groupe,
    horaire: row.horaire,
    heure_debut: row.heure_debut,
    heure_fin: row.heure_fin,
    chef_equipe: row.chef_equipe,
    modele: row.modele,
    couleur: row.couleur,
    format: row.format,
    zone_presse: Number(row.zone_presse),
    zone_projecta: Number(row.zone_projecta),
    zone_four: Number(row.zone_four),
    choix_1_m2: Number(row.choix_1_m2),
    choix_1_taux: Number(row.choix_1_taux),
    choix_2_m2: Number(row.choix_2_m2),
    choix_2_taux: Number(row.choix_2_taux),
    choix_3_m2: Number(row.choix_3_m2),
    choix_3_taux: Number(row.choix_3_taux),
  };
}

export function useSelectionStore() {
  const [entries, setEntries] = useState<SelectionEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("production_selection")
        .select("*")
        .limit(999999)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Load error:", error);
        toast.error("Erreur de chargement des donnees selection");
        setEntries([]);
      } else {
        setEntries((data || []).map((r: any) => fromDb(r, [])));
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from("production_selection")
      .select("*")
      .limit(999999)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Reload error:", error);
    } else {
      setEntries((data || []).map((r: any) => fromDb(r, [])));
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => reload();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [reload]);

  const checkDuplicate = useCallback(async (date: string, groupe: string, horaire: string) => {
    const { data } = await supabase
      .from("production_selection")
      .select("id")
      .eq("date", date)
      .eq("groupe", groupe)
      .eq("horaire", horaire)
      .limit(1);
    return data && data.length > 0;
  }, []);

  const addEntry = useCallback(async (entry: Omit<SelectionEntry, "id">) => {
    const exists = await checkDuplicate(entry.date, entry.groupe, entry.horaire);
    if (exists) {
      toast.error("Un rapport existe deja pour cette combinaison Date + Groupe + Horaire");
      return null;
    }

    const selectionId = uuidv4();
    const { data, error } = await supabase
      .from("production_selection")
      .insert({ ...entry, id: selectionId } as any)
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur d enregistrement"));
      return null;
    }

    const newEntry = fromDb(data, []);
    setEntries((prev) => [...prev, newEntry]);
    return newEntry;
  }, [checkDuplicate]);

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from("production_selection").delete().eq("id", id);
    if (error) {
      toast.error(handleDbError(error, "Erreur de suppression"));
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const deleteByKey = useCallback(async (date: string, groupe: string, horaire: string) => {
    const { error } = await supabase
      .from("production_selection")
      .delete()
      .eq("date", date)
      .eq("groupe", groupe)
      .eq("horaire", horaire);
    if (error) {
      console.error("Error deleting selection by key:", error);
      return;
    }
    setEntries((prev) =>
      prev.filter((e) => !(e.date === date && e.groupe === groupe && e.horaire === horaire))
    );
  }, []);

  const updateEntry = useCallback(async (entry: SelectionEntry) => {
    const { id, ...selectionData } = entry;

    const { data, error } = await supabase
      .from("production_selection")
      .update(selectionData as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur de mise a jour"));
      return null;
    }

    const updated = fromDb(data, []);
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  return { entries, isLoaded, addEntry, deleteEntry, deleteByKey, updateEntry, checkDuplicate, reload };
}