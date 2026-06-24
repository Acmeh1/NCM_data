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
  VIDE_f_maintenance: number;
  VIDE_f_production: number;
  Scanner_Choix1_m2?: number;
  Scanner_Choix2_m2?: number;
  Scanner_Choix3_m2?: number;
  Choix1_Pieces?: number;
  Choix2_Pieces?: number;
  Choix3_Pieces?: number;
  Casse_Presse_Casse_kg?: number;
  Casse_Sortie_Sechoir_kg?: number;
  Casse_Emaillage_kg?: number;
  Casse_Projecta_kg?: number;
  Casse_Entree_Four_kg?: number;
  Casse_Cuite_kg?: number;
  Emballage_C1_Palettes?: number;
  Emballage_C1_Reste_m2?: number;
  Emballage_C1_Surface_m2?: number;
  Emballage_C2_Palettes?: number;
  Emballage_C2_Reste_m2?: number;
  Emballage_C2_Surface_m2?: number;
  Emballage_C3_Palettes?: number;
  Emballage_C3_Reste_m2?: number;
  Emballage_C3_Surface_m2?: number;
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
    Choix_1_m2: Number(row.choix_1_m2 ?? 0),
    Choix_2_m2: Number(row.choix_2_m2 ?? 0),
    Choix_3_m2: Number(row.choix_3_m2 ?? 0),
    Total_m2: Number(row.total_m2 ?? 0),
    Pressage_m2: Number(row.pressage_m2 ?? 0),
    Project_m2: Number(row.Project_m2 ?? row.project_m2 ?? 0),
    Emaillage_m2: Number(row.emaillage_m2 ?? 0),
    Cycle_min: Number(row.cycle_min ?? 0),
    Nb_Pieces_Four: Number(row.nb_pieces_four ?? 0),
    Surface_CAR_m2: Number(row.surface_car_m2 ?? 0),
    Cuisson_M2: Number(row.cuisson_m2 ?? 0),
    Four_Minutes_Vides: Number(row.four_minutes_vides ?? 0),
    Four_Consommation_Kwh: Number(row.four_consommation_kwh ?? 0),
    VIDE_f_maintenance: Number(row.VIDE_f_maintenance ?? 0),
    VIDE_f_production: Number(row.VIDE_f_production ?? 0),
    Scanner_Choix1_m2: Number(row.choix1_surface_m2 ?? 0),
    Scanner_Choix2_m2: Number(row.choix2_surface_m2 ?? 0),
    Scanner_Choix3_m2: Number(row.choix3_surface_m2 ?? 0),
    Choix1_Pieces: Number(row.choix1_pieces ?? 0),
    Choix2_Pieces: Number(row.choix2_pieces ?? 0),
    Choix3_Pieces: Number(row.choix3_pieces ?? 0),
    Casse_Presse_Casse_kg: Number(row.casse_presse_casse_kg ?? 0),
    Casse_Sortie_Sechoir_kg: Number(row.casse_sortie_sechoir_kg ?? 0),
    Casse_Emaillage_kg: Number(row.casse_emaillage_kg ?? 0),
    Casse_Projecta_kg: Number(row.casse_projecta_kg ?? 0),
    Casse_Entree_Four_kg: Number(row.casse_entree_four_kg ?? 0),
    Casse_Cuite_kg: Number(row.casse_cuite_kg ?? 0),
    Emballage_C1_Palettes: Number(row.emballage_c1_palettes ?? 0),
    Emballage_C1_Reste_m2: Number(row.emballage_c1_reste_m2 ?? 0),
    Emballage_C1_Surface_m2: Number(row.emballage_c1_surface_m2 ?? 0),
    Emballage_C2_Palettes: Number(row.emballage_c2_palettes ?? 0),
    Emballage_C2_Reste_m2: Number(row.emballage_c2_reste_m2 ?? 0),
    Emballage_C2_Surface_m2: Number(row.emballage_c2_surface_m2 ?? 0),
    Emballage_C3_Palettes: Number(row.emballage_c3_palettes ?? 0),
    Emballage_C3_Reste_m2: Number(row.emballage_c3_reste_m2 ?? 0),
    Emballage_C3_Surface_m2: Number(row.emballage_c3_surface_m2 ?? 0),
  };
}


export function useProductionStore() {
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from cloud DB
  useEffect(() => {
    async function load() {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("production_globale")
        .select(`*`)
        .gte("date", dateFilter)
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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from("production_globale")
      .select(`*`)
      .gte("date", dateFilter)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Reload error:", error);
    } else {
      setEntries((data || []).map(fromDb));
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoaded(false);
    const { data, error } = await supabase
      .from("production_globale")
      .select(`*`)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("LoadAll error:", error);
      toast.error("Erreur de chargement complet");
    } else {
      setEntries((data || []).map(fromDb));
      toast.success("Historique complet chargé");
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const handleFocus = () => reload();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [reload]);

  const addEntry = useCallback(async (entry: Omit<ProductionEntry, "id">) => {
    const { data, error } = await supabase
      .from("production_globale" as any)
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
        choix1_surface_m2: Number(entry.Choix_1_m2) || 0,
        choix2_surface_m2: Number(entry.Choix_2_m2) || 0,
        choix3_surface_m2: Number(entry.Choix_3_m2) || 0,
        total_m2: Number(entry.Total_m2) || 0,
        pressage_m2: Number(entry.Pressage_m2) || 0,
        project_m2: Number(entry.Project_m2) || 0,
        emaillage_m2: Number(entry.Emaillage_m2) || 0,
        nb_pieces_four: Number(entry.Nb_Pieces_Four) || 0,
        surface_car_m2: Number(entry.Surface_CAR_m2) || 0,
        cuisson_m2: Number(entry.Cuisson_M2) || 0,
        four_minutes_vides: Number(entry.Four_Minutes_Vides) || 0,
        four_consommation_kwh: Number(entry.Four_Consommation_Kwh) || 0,
        choix1_surface_m2: entry.Scanner_Choix1_m2 !== undefined ? Number(entry.Scanner_Choix1_m2) || 0 : undefined,
        choix2_surface_m2: entry.Scanner_Choix2_m2 !== undefined ? Number(entry.Scanner_Choix2_m2) || 0 : undefined,
        choix3_surface_m2: entry.Scanner_Choix3_m2 !== undefined ? Number(entry.Scanner_Choix3_m2) || 0 : undefined,
        choix1_pieces: entry.Choix1_Pieces !== undefined ? Number(entry.Choix1_Pieces) || 0 : undefined,
        choix2_pieces: entry.Choix2_Pieces !== undefined ? Number(entry.Choix2_Pieces) || 0 : undefined,
        choix3_pieces: entry.Choix3_Pieces !== undefined ? Number(entry.Choix3_Pieces) || 0 : undefined,
        casse_presse_casse_kg: entry.Casse_Presse_Casse_kg !== undefined ? Number(entry.Casse_Presse_Casse_kg) || 0 : undefined,
        casse_sortie_sechoir_kg: entry.Casse_Sortie_Sechoir_kg !== undefined ? Number(entry.Casse_Sortie_Sechoir_kg) || 0 : undefined,
        casse_emaillage_kg: entry.Casse_Emaillage_kg !== undefined ? Number(entry.Casse_Emaillage_kg) || 0 : undefined,
        casse_projecta_kg: entry.Casse_Projecta_kg !== undefined ? Number(entry.Casse_Projecta_kg) || 0 : undefined,
        casse_entree_four_kg: entry.Casse_Entree_Four_kg !== undefined ? Number(entry.Casse_Entree_Four_kg) || 0 : undefined,
        casse_cuite_kg: entry.Casse_Cuite_kg !== undefined ? Number(entry.Casse_Cuite_kg) || 0 : undefined,
        emballage_c1_palettes: entry.Emballage_C1_Palettes !== undefined ? Number(entry.Emballage_C1_Palettes) || 0 : undefined,
        emballage_c1_reste_m2: entry.Emballage_C1_Reste_m2 !== undefined ? Number(entry.Emballage_C1_Reste_m2) || 0 : undefined,
        emballage_c1_surface_m2: entry.Emballage_C1_Surface_m2 !== undefined ? Number(entry.Emballage_C1_Surface_m2) || 0 : undefined,
        emballage_c2_palettes: entry.Emballage_C2_Palettes !== undefined ? Number(entry.Emballage_C2_Palettes) || 0 : undefined,
        emballage_c2_reste_m2: entry.Emballage_C2_Reste_m2 !== undefined ? Number(entry.Emballage_C2_Reste_m2) || 0 : undefined,
        emballage_c2_surface_m2: entry.Emballage_C2_Surface_m2 !== undefined ? Number(entry.Emballage_C2_Surface_m2) || 0 : undefined,
        emballage_c3_palettes: entry.Emballage_C3_Palettes !== undefined ? Number(entry.Emballage_C3_Palettes) || 0 : undefined,
        emballage_c3_reste_m2: entry.Emballage_C3_Reste_m2 !== undefined ? Number(entry.Emballage_C3_Reste_m2) || 0 : undefined,
        emballage_c3_surface_m2: entry.Emballage_C3_Surface_m2 !== undefined ? Number(entry.Emballage_C3_Surface_m2) || 0 : undefined,
      })
      .select(`*`)
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: existingData } = await supabase
          .from("production_globale")
          .select("*")
          .eq("date", entry.Date)
          .eq("horaire", entry.Horaire)
          .eq("modele", entry.Modele)
          .eq("couleur", entry.Couleur)
          .eq("format", entry.Format)
          .single();
        if (existingData) {
          return { duplicateEntry: fromDb(existingData) } as any;
        }
      }
      toast.error(handleDbError(error, "Erreur d'enregistrement"));
      return null;
    }

    const surfaceCAR = Number(entry.Surface_CAR_m2) || 0;
    const m2PerPalette = 0; // Or whatever calculation if needed
    const emballageInserts = [
      {
        journalier_id: data.id,
        choice_type: "1er Choix",
        nb_palette: 0,
        surface_par_palette: 0,
        surface_totale_m2: Number(entry.Choix_1_m2) || 0,
        reste_m2: Number(entry.Choix_1_m2) || 0,
      },
      {
        journalier_id: data.id,
        choice_type: "2ème Choix",
        nb_palette: 0,
        surface_par_palette: 0,
        surface_totale_m2: Number(entry.Choix_2_m2) || 0,
        reste_m2: Number(entry.Choix_2_m2) || 0,
      },
      {
        journalier_id: data.id,
        choice_type: "3ème Choix",
        nb_palette: 0,
        surface_par_palette: 0,
        surface_totale_m2: Number(entry.Choix_3_m2) || 0,
        reste_m2: Number(entry.Choix_3_m2) || 0,
      }
    ];
    await supabase.from("production_emballage").insert(emballageInserts);

    const newEntry = fromDb(data);
    setEntries((prev) => [...prev, newEntry]);
    return newEntry;
  }, []);

  const updateEntry = useCallback(async (entry: ProductionEntry) => {
    const { id, ...rest } = entry;
    const { error, data } = await supabase
      .from("production_globale")
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
        choix1_surface_m2: Number(rest.Choix_1_m2) || 0,
        choix2_surface_m2: Number(rest.Choix_2_m2) || 0,
        choix3_surface_m2: Number(rest.Choix_3_m2) || 0,
        total_m2: Number(rest.Total_m2) || 0,
        pressage_m2: Number(rest.Pressage_m2) || 0,
        project_m2: Number(rest.Project_m2) || 0,
        emaillage_m2: Number(rest.Emaillage_m2) || 0,
        nb_pieces_four: Number(rest.Nb_Pieces_Four) || 0,
        surface_car_m2: Number(rest.Surface_CAR_m2) || 0,
        cuisson_m2: Number(rest.Cuisson_M2) || 0,
        four_minutes_vides: Number(rest.Four_Minutes_Vides) || 0,
        four_consommation_kwh: Number(rest.Four_Consommation_Kwh) || 0,
        choix1_surface_m2: rest.Scanner_Choix1_m2 !== undefined ? Number(rest.Scanner_Choix1_m2) || 0 : undefined,
        choix2_surface_m2: rest.Scanner_Choix2_m2 !== undefined ? Number(rest.Scanner_Choix2_m2) || 0 : undefined,
        choix3_surface_m2: rest.Scanner_Choix3_m2 !== undefined ? Number(rest.Scanner_Choix3_m2) || 0 : undefined,
        choix1_pieces: rest.Choix1_Pieces !== undefined ? Number(rest.Choix1_Pieces) || 0 : undefined,
        choix2_pieces: rest.Choix2_Pieces !== undefined ? Number(rest.Choix2_Pieces) || 0 : undefined,
        choix3_pieces: rest.Choix3_Pieces !== undefined ? Number(rest.Choix3_Pieces) || 0 : undefined,
        casse_presse_casse_kg: rest.Casse_Presse_Casse_kg !== undefined ? Number(rest.Casse_Presse_Casse_kg) || 0 : undefined,
        casse_sortie_sechoir_kg: rest.Casse_Sortie_Sechoir_kg !== undefined ? Number(rest.Casse_Sortie_Sechoir_kg) || 0 : undefined,
        casse_emaillage_kg: rest.Casse_Emaillage_kg !== undefined ? Number(rest.Casse_Emaillage_kg) || 0 : undefined,
        casse_projecta_kg: rest.Casse_Projecta_kg !== undefined ? Number(rest.Casse_Projecta_kg) || 0 : undefined,
        casse_entree_four_kg: rest.Casse_Entree_Four_kg !== undefined ? Number(rest.Casse_Entree_Four_kg) || 0 : undefined,
        casse_cuite_kg: rest.Casse_Cuite_kg !== undefined ? Number(rest.Casse_Cuite_kg) || 0 : undefined,
        emballage_c1_palettes: rest.Emballage_C1_Palettes !== undefined ? Number(rest.Emballage_C1_Palettes) || 0 : undefined,
        emballage_c1_reste_m2: rest.Emballage_C1_Reste_m2 !== undefined ? Number(rest.Emballage_C1_Reste_m2) || 0 : undefined,
        emballage_c1_surface_m2: rest.Emballage_C1_Surface_m2 !== undefined ? Number(rest.Emballage_C1_Surface_m2) || 0 : undefined,
        emballage_c2_palettes: rest.Emballage_C2_Palettes !== undefined ? Number(rest.Emballage_C2_Palettes) || 0 : undefined,
        emballage_c2_reste_m2: rest.Emballage_C2_Reste_m2 !== undefined ? Number(rest.Emballage_C2_Reste_m2) || 0 : undefined,
        emballage_c2_surface_m2: rest.Emballage_C2_Surface_m2 !== undefined ? Number(rest.Emballage_C2_Surface_m2) || 0 : undefined,
        emballage_c3_palettes: rest.Emballage_C3_Palettes !== undefined ? Number(rest.Emballage_C3_Palettes) || 0 : undefined,
        emballage_c3_reste_m2: rest.Emballage_C3_Reste_m2 !== undefined ? Number(rest.Emballage_C3_Reste_m2) || 0 : undefined,
        emballage_c3_surface_m2: rest.Emballage_C3_Surface_m2 !== undefined ? Number(rest.Emballage_C3_Surface_m2) || 0 : undefined,
      })
      .eq("id", id)
      .select(`*`)
      .single();

    if (error) {
      toast.error(handleDbError(error, "Erreur de mise à jour"));
      return null;
    }

    // Auto-update emballage by re-creating it
    // If we want to reset emballage when updating journalier, we can do it:
    await supabase.from("production_emballage").delete().eq("journalier_id", id);
    
    const surfaceCAR = Number(entry.Surface_CAR_m2) || 0;
    const emballageInserts = [
      {
        journalier_id: id,
        choice_type: "1er Choix",
        nb_palette: 0,
        surface_par_palette: 0,
        surface_totale_m2: Number(entry.Choix_1_m2) || 0,
        reste_m2: Number(entry.Choix_1_m2) || 0,
      },
      {
        journalier_id: id,
        choice_type: "2ème Choix",
        nb_palette: 0,
        surface_par_palette: 0,
        surface_totale_m2: Number(entry.Choix_2_m2) || 0,
        reste_m2: Number(entry.Choix_2_m2) || 0,
      },
      {
        journalier_id: id,
        choice_type: "3ème Choix",
        nb_palette: 0,
        surface_par_palette: 0,
        surface_totale_m2: Number(entry.Choix_3_m2) || 0,
        reste_m2: Number(entry.Choix_3_m2) || 0,
      }
    ];
    await supabase.from("production_emballage").insert(emballageInserts);

    const updated = fromDb(data);
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const deleteEntry = useCallback(async (entry: ProductionEntry) => {
    await supabase.from("production_emballage").delete().eq("journalier_id", entry.id);

    const { error } = await supabase
      .from("production_globale")
      .delete()
      .eq("id", entry.id);

    if (error) {
      toast.error(handleDbError(error, "Erreur de suppression"));
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
  }, []);

  const deleteMultipleEntries = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    
    // Delete linked emballages first
    await supabase.from("production_emballage").delete().in("journalier_id", ids);

    // Delete global entries
    const { error } = await supabase
      .from("production_globale")
      .delete()
      .in("id", ids);

    if (error) {
      toast.error(handleDbError(error, "Erreur lors de la suppression multiple"));
      return false;
    }
    
    setEntries((prev) => prev.filter((e) => !ids.includes(e.id)));
    return true;
  }, []);

  const clearAll = useCallback(async () => {
    const { error } = await supabase
      .from("production_globale")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      toast.error(handleDbError(error, "Erreur"));
      return;
    }
    setEntries([]);
  }, []);

  return { entries, isLoaded, addEntry, updateEntry, deleteEntry, deleteMultipleEntries, clearAll, reload, loadAll };
}
