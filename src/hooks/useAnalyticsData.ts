import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseISO, subDays, format as formatISO } from "date-fns";

export function useAnalyticsData(startDate: string, endDate: string) {
  // Previous period for comparison
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
  const prevStartDate = formatISO(subDays(start, duration), "yyyy-MM-dd");
  const prevEndDate = formatISO(subDays(start, 1), "yyyy-MM-dd");

  // Production data (Journalier)
  const journalierQuery = useQuery({
    queryKey: ["analytics-journalier-full", prevStartDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_globale")
        .select(`
          id, date, total_m2, choix1_surface_m2, choix2_surface_m2, choix3_surface_m2, cuisson_m2, 
          four_consommation_kwh, four_minutes_vides, pressage_m2, project_m2, emaillage_m2, 
          nb_pieces_four, surface_car_m2, groupe, format
        `)
        .gte("date", prevStartDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Quality data (Stats Linea)
  const statsQuery = useQuery({
    queryKey: ["analytics-stats-linea-full", prevStartDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stats_linea")
        .select("id, total_surface_m2, choix1_surface_m2, choix2_surface_m2, choix3_surface_m2, production_date")
        .gte("production_date", prevStartDate)
        .lte("production_date", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Maintenance data
  const maintenanceQuery = useQuery({
    queryKey: ["analytics-maintenance-full", prevStartDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select("id, date_intervention, duree_intervention_minutes, nature, type, equipement_code")
        .gte("date_intervention", prevStartDate)
        .lte("date_intervention", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  return {
    loading: journalierQuery.isLoading || statsQuery.isLoading || maintenanceQuery.isLoading,
    journalier: journalierQuery.data || [],
    stats: statsQuery.data || [],
    maintenance: maintenanceQuery.data || [],
    prevStartDate,
    prevEndDate,
    duration
  };
}
