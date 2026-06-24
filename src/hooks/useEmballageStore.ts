import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleDbError } from "@/lib/permissionError";
import { uuidv4 } from "@/lib/uuid";

export interface EmballageChoix {
  Choice_Type: string;
  Nb_Palette?: number;
  Surface_par_palette?: number;
  Surface_totale_m2: number;
  Reste_m2?: number;
  Total_Pieces?: number;
}

export interface EmballageEntry {
  id: string;
  Linked_Journalier_ID: string;
  // Auto-filled from linked journalier
  Date: string;
  Horaire: string;
  Heure_Debut: string;
  Heure_Fin: string;
  Groupe: string;
  Chef_Equipe: string;
  Modele: string;
  Couleur: string;
  Format: string;
  // Emballage-specific
  choix: EmballageChoix[];
}

// Group DB rows by journalier_id into EmballageEntry objects
function groupRows(rows: any[], journalierEntries: any[]): EmballageEntry[] {
  const grouped = new Map<string, any[]>();
  rows.forEach((r) => {
    const jId = r.journalier_id;
    if (!grouped.has(jId)) grouped.set(jId, []);
    grouped.get(jId)!.push(r);
  });

  const entries: EmballageEntry[] = [];
  grouped.forEach((choixRows, jId) => {
    // Find the parent journalier for metadata
    const j = journalierEntries.find((e: any) => e.id === jId);
    entries.push({
      id: jId, // Use journalier_id as the group id
      Linked_Journalier_ID: jId,
      Date: j?.date ?? "",
      Horaire: j?.horaire ?? "",
      Heure_Debut: j?.heure_debut ?? "",
      Heure_Fin: j?.heure_fin ?? "",
      Groupe: j?.groupe ?? "",
      Chef_Equipe: j?.chef_equipe ?? "",
      Modele: j?.modele ?? "",
      Couleur: j?.couleur ?? "",
      Format: j?.format ?? "",
      choix: choixRows.map((c: any) => ({
        Choice_Type: c.choice_type,
        Nb_Palette: Number(c.nb_palette) || 0,
        Surface_par_palette: Number(c.surface_par_palette) || 0,
        Surface_totale_m2: Number(c.surface_totale_m2) || 0,
        Reste_m2: Number(c.reste_m2) || 0,
        Total_Pieces: Number(c.total_pieces) || 0,
      })),
    });
  });

  entries.sort((a, b) => String(b.Date || "").localeCompare(String(a.Date || "")));
  return entries;
}


export function useEmballageStore() {
  const [entries, setEntries] = useState<EmballageEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadEntries = useCallback(async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];

    const [embRes, jourRes] = await Promise.all([
      supabase.from("production_emballage").select("*").gte("created_at", dateFilter).order("created_at", { ascending: true }),
      supabase.from("production_globale").select(`*`).gte("date", dateFilter),
    ]);

    if (embRes.error) {
      console.error("Emballage load error:", embRes.error);
      toast.error("Erreur chargement emballage");
      setEntries([]);
    } else {
      setEntries(groupRows(embRes.data || [], jourRes.data || []));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const addEntry = useCallback(async (entry: Omit<EmballageEntry, "id">) => {
    // Insert all choix rows for this journalier
    const rows = entry.choix.map((c) => ({
      id: uuidv4(),
      journalier_id: entry.Linked_Journalier_ID,
      choice_type: c.Choice_Type,
      nb_palette: c.Nb_Palette || 0,
      surface_par_palette: c.Surface_par_palette || 0,
      surface_totale_m2: c.Surface_totale_m2 || 0,
      reste_m2: c.Reste_m2 || 0,
      total_pieces: c.Total_Pieces || 0,
    }));

    const { error } = await supabase
      .from("production_emballage")
      .insert(rows);

    if (error) {
      toast.error(handleDbError(error, "Erreur d'enregistrement"));
      return null;
    }

    // Reload to get fresh grouping
    await loadEntries();
    return entry;
  }, [loadEntries]);

  const updateEntry = useCallback(async (entry: EmballageEntry) => {
    // Remplacer tous les choix existants pour ce journalier_id
    const { Linked_Journalier_ID, choix } = entry;

    const { error: delError } = await supabase
      .from("production_emballage")
      .delete()
      .eq("journalier_id", Linked_Journalier_ID);

    if (delError) {
      toast.error(handleDbError(delError, "Erreur de mise à jour"));
      return null;
    }

    const rows = choix.map((c) => ({
      id: uuidv4(),
      journalier_id: Linked_Journalier_ID,
      choice_type: c.Choice_Type,
      nb_palette: c.Nb_Palette || 0,
      surface_par_palette: c.Surface_par_palette || 0,
      surface_totale_m2: c.Surface_totale_m2 || 0,
      reste_m2: c.Reste_m2 || 0,
      total_pieces: c.Total_Pieces || 0,
    }));

    const { error: insError } = await supabase
      .from("production_emballage")
      .insert(rows as any);

    if (insError) {
      toast.error(handleDbError(insError, "Erreur de mise à jour"));
      return null;
    }

    await loadEntries();
    return entry;
  }, [loadEntries]);

  const deleteEntry = useCallback(async (id: string) => {
    // id here is the journalier_id group — delete all emballage rows for this journalier
    const { error } = await supabase
      .from("production_emballage")
      .delete()
      .eq("journalier_id", id);

    if (error) {
      toast.error(handleDbError(error, "Erreur de suppression"));
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, isLoaded, addEntry, updateEntry, deleteEntry };
}
