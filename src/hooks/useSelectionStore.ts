import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleDbError } from "@/lib/permissionError";
import { uuidv4 } from "@/lib/uuid";

export interface ArretZone {
  id?: string;
  zone: string;
  intervention_cause: string;
  duree_min: number;
  vide_four: boolean;
}

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
  calibre_taux: number;
  calibre_cause: string;
  planeite_taux: number;
  planeite_cause: string;
  operateur_aspect_taux: number;
  operateur_aspect_cause: string;
  tonalite_taux: number;
  tonalite_cause: string;
  duree_vide_maintenance: number;
  intervention_maintenance: string;
  duree_vide_production: number;
  intervention_production: string;
  arrets: ArretZone[];
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
    calibre_taux: Number(row.calibre_taux),
    calibre_cause: row.calibre_cause || "",
    planeite_taux: Number(row.planeite_taux),
    planeite_cause: row.planeite_cause || "",
    operateur_aspect_taux: Number(row.operateur_aspect_taux),
    operateur_aspect_cause: row.operateur_aspect_cause || "",
    tonalite_taux: Number(row.tonalite_taux),
    tonalite_cause: row.tonalite_cause || "",
    duree_vide_maintenance: Number(row.duree_vide_maintenance),
    intervention_maintenance: row.intervention_maintenance || "",
    duree_vide_production: Number(row.duree_vide_production),
    intervention_production: row.intervention_production || "",
    arrets: arrets
      .filter((a: any) => a.selection_id === row.id)
      .map((a: any) => ({
        id: a.id,
        zone: a.zone,
        intervention_cause: a.intervention_cause || "",
        duree_min: Number(a.duree_min),
        vide_four: a.vide_four,
      })),
  };
}

export function useSelectionStore() {
  const [entries, setEntries] = useState<SelectionEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const [selRes, arrRes] = await Promise.all([
        supabase.from("production_selection").select("*").order("created_at", { ascending: true }),
        supabase.from("production_arrets_zone").select("*"),
      ]);
      if (selRes.error) {
        console.error("Load error:", selRes.error);
        toast.error("Erreur de chargement des données sélection");
        setEntries([]);
      } else {
        const arrets = arrRes.data || [];
        setEntries((selRes.data || []).map((r: any) => fromDb(r, arrets)));
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  const reload = useCallback(async () => {
    const [selRes, arrRes] = await Promise.all([
      supabase.from("production_selection").select("*").order("created_at", { ascending: true }),
      supabase.from("production_arrets_zone").select("*"),
    ]);
    if (selRes.error) {
      console.error("Reload error:", selRes.error);
    } else {
      const arrets = arrRes.data || [];
      setEntries((selRes.data || []).map((r: any) => fromDb(r, arrets)));
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => reload();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [reload]);

  const checkDuplicate = useCallback(async (date: string, groupe: string, horaire: string) => {
    const { data } = await supabase
      .from("production_selection")
      .select("id")
      .eq("date", date)
      .eq("groupe", groupe)
      .eq("horaire", horaire)
      .limit(1);
    return (data && data.length > 0);
  }, []);

  const addEntry = useCallback(async (entry: Omit<SelectionEntry, "id">) => {
    // Anti-doublon
    const exists = await checkDuplicate(entry.date, entry.groupe, entry.horaire);
    if (exists) {
      toast.error("Un rapport existe déjà pour cette combinaison Date + Groupe + Horaire");
      return null;
    }

    const { arrets, ...selectionData } = entry;
    const selectionId = uuidv4();
    const { data, error } = await supabase
      .from("production_selection")
      .insert({ ...selectionData, id: selectionId } as any)
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur d'enregistrement"));
      return null;
    }

    // Insert arrets
    let savedArrets: ArretZone[] = [];
    if (arrets.length > 0) {
      const arretRows = arrets.map((a) => ({
        id: uuidv4(),
        selection_id: data.id,
        zone: a.zone,
        intervention_cause: a.intervention_cause,
        duree_min: a.duree_min,
        vide_four: a.vide_four,
      }));
      const { data: arrData, error: arrErr } = await supabase
        .from("production_arrets_zone")
        .insert(arretRows as any)
        .select();
      if (arrErr) console.warn("Arrets insert warning:", arrErr.message);
      savedArrets = (arrData || []).map((a: any) => ({
        id: a.id,
        zone: a.zone,
        intervention_cause: a.intervention_cause || "",
        duree_min: Number(a.duree_min),
        vide_four: a.vide_four,
      }));
    }

    const newEntry = fromDb(data, savedArrets.map((a) => ({ ...a, selection_id: data.id })));
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
    setEntries((prev) => prev.filter((e) => !(e.date === date && e.groupe === groupe && e.horaire === horaire)));
  }, []);

  const updateEntry = useCallback(async (entry: SelectionEntry) => {
    const { id, arrets, ...selectionData } = entry;

    const { data, error } = await supabase
      .from("production_selection")
      .update(selectionData as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur de mise à jour"));
      return null;
    }

    // Remplacer les arrêts existants par les nouveaux
    await supabase.from("production_arrets_zone").delete().eq("selection_id", id);

    let savedArrets: ArretZone[] = [];
    if (arrets.length > 0) {
      const arretRows = arrets.map((a) => ({
        id: uuidv4(),
        selection_id: id,
        zone: a.zone,
        intervention_cause: a.intervention_cause,
        duree_min: a.duree_min,
        vide_four: a.vide_four,
      }));
      const { data: arrData, error: arrErr } = await supabase
        .from("production_arrets_zone")
        .insert(arretRows as any)
        .select();
      if (arrErr) console.warn("Arrets update warning:", arrErr.message);
      savedArrets = (arrData || []).map((a: any) => ({
        id: a.id,
        zone: a.zone,
        intervention_cause: a.intervention_cause || "",
        duree_min: Number(a.duree_min),
        vide_four: a.vide_four,
      }));
    }

    const updated = fromDb(data, savedArrets.map((a) => ({ ...a, selection_id: id })));
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  return { entries, isLoaded, addEntry, deleteEntry, deleteByKey, updateEntry, checkDuplicate, reload };
}
