import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleDbError } from "@/lib/permissionError";
import { uuidv4 } from "@/lib/uuid";

export interface CasseEntry {
  id: string;
  date: string;
  horaire: string;
  groupe: string;
  chef_equipe: string;
  press_kg: number;
  sortie_sechoir_kg: number;
  emaillage_kg: number;
  projecta_kg: number;
  entree_four_kg: number;
  casse_cuite_kg: number;
  created_at?: string;
}

function fromDb(row: any): CasseEntry {
  return {
    id: row.id,
    date: row.date,
    horaire: row.horaire,
    groupe: row.groupe,
    chef_equipe: row.chef_equipe,
    press_kg: Number(row.press_kg ?? 0),
    sortie_sechoir_kg: Number(row.sortie_sechoir_kg ?? 0),
    emaillage_kg: Number(row.emaillage_kg ?? 0),
    projecta_kg: Number(row.projecta_kg ?? 0),
    entree_four_kg: Number(row.entree_four_kg ?? 0),
    casse_cuite_kg: Number(row.casse_cuite_kg ?? 0),
    created_at: row.created_at,
  };
}

export function useCasseStore() {
  const [entries, setEntries] = useState<CasseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("casse_ceramique")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Casse load error:", error);
      toast.error("Erreur de chargement des casses");
    } else {
      setEntries((data || []).map(fromDb));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addEntry = useCallback(async (entry: Omit<CasseEntry, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("casse_ceramique")
      .insert({
        id: uuidv4(),
        ...entry
      })
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur d'ajout"));
      return null;
    }

    const newEntry = fromDb(data);
    setEntries((prev) => [newEntry, ...prev]);
    toast.success("Casse enregistrée");
    return newEntry;
  }, []);

  const updateEntry = useCallback(async (entry: CasseEntry) => {
    const { id, created_at, ...rest } = entry;
    const { data, error } = await supabase
      .from("casse_ceramique")
      .update(rest)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur de modification"));
      return null;
    }

    const updated = fromDb(data);
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    toast.success("Casse modifiée");
    return updated;
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("casse_ceramique")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(handleDbError(error, "Erreur de suppression"));
      return false;
    }

    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("Casse supprimée");
    return true;
  }, []);

  return { entries, loading, addEntry, updateEntry, deleteEntry, reload: load };
}
