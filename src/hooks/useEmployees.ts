import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EmployeeData {
  Matricule: string;
  Nom: string | null;
  Prénom: string | null;
  Date_de_Naissance: string | null;
  AGE: number | null;
  "Tranche_d'age": string | null;
  Situation_F: string | null;
  Niveau: string | null;
  Spécialité: string | null;
  Experience: string | null;
  Formation: string | null;
  Formation_NCM: string | null;
  Sexe: string | null;
  Fonction: string | null;
  Service: string | null;
  Contrat: string | null;
  Date_Embauche: string | null;
  Anciennete: number | null;
  "Tranche_Ancienneté": string | null;
  "Cause Recrutement": string | null;
  "Raison Création poste": string | null;
  "Cause Vacance Poste": string | null;
  Date_départ: string | null;
  "Cause_Départ": string | null;
  "Rémunération Total": string | null;
  Affectation: string | null;
  Photo_URL: string | null;
}

export function useEmployees(searchQuery: string = "", serviceFilter: string = "all") {
  return useQuery({
    queryKey: ["employees-list", searchQuery, serviceFilter],
    queryFn: async () => {
      let query = supabase.from("fichRH").select("*");
      
      if (searchQuery) {
        const q = `%${searchQuery}%`;
        query = query.or(`Matricule.ilike.${q},Nom.ilike.${q},Prénom.ilike.${q}`);
      }

      if (serviceFilter && serviceFilter !== "all") {
        query = query.eq("Service", serviceFilter);
      }

      let { data, error } = await query.order("Matricule", { ascending: true });

      if (error) {
        // Fallback to lowercase table name
        let lowerQuery = supabase.from("fichrh").select("*");
        if (searchQuery) {
          const q = `%${searchQuery}%`;
          lowerQuery = lowerQuery.or(`Matricule.ilike.${q},Nom.ilike.${q},Prénom.ilike.${q}`);
        }
        if (serviceFilter && serviceFilter !== "all") {
          lowerQuery = lowerQuery.eq("Service", serviceFilter);
        }
        const lowerRes = await lowerQuery.order("Matricule", { ascending: true });
        data = lowerRes.data;
        error = lowerRes.error;
      }

      if (error) throw error;
      return (data || []) as EmployeeData[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useServices() {
  return useQuery({
    queryKey: ["services-list"],
    queryFn: async () => {
      let { data, error } = await supabase
        .from("fichRH")
        .select("Service")
        .not("Service", "is", null);

      if (error) {
        const lowerRes = await supabase
          .from("fichrh")
          .select("Service")
          .not("Service", "is", null);
        data = lowerRes.data;
        error = lowerRes.error;
      }

      if (error) throw error;
      
      // Extraire les valeurs uniques
      const uniqueServices = Array.from(new Set(data.map(item => item.Service))).filter(Boolean);
      return uniqueServices.sort() as string[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour cache
  });
}

export function useEmployee(matricule: string | undefined) {
  return useQuery({
    queryKey: ["employee", matricule],
    queryFn: async () => {
      if (!matricule) return null;
      let { data, error } = await supabase
        .from("fichRH")
        .select("*")
        .eq("Matricule", matricule)
        .single();

      if (error) {
        const lowerRes = await supabase
          .from("fichrh")
          .select("*")
          .eq("Matricule", matricule)
          .single();
        data = lowerRes.data;
        error = lowerRes.error;
      }

      if (error) throw error;
      return data as EmployeeData;
    },
    enabled: !!matricule,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveEmployee() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EmployeeData) => {
      let { error } = await supabase
        .from("fichRH")
        .upsert(payload, { onConflict: "Matricule" });

      if (error) {
        const lowerRes = await supabase
          .from("fichrh")
          .upsert(payload, { onConflict: "Matricule" });
        error = lowerRes.error;
      }

      if (error) throw error;
      return payload;
    },
    onSuccess: (data) => {
      toast({
        title: "Succès",
        description: "Fiche employé enregistrée avec succès.",
      });
      // Invalidate list and specific employee
      queryClient.invalidateQueries({ queryKey: ["employees-list"] });
      queryClient.invalidateQueries({ queryKey: ["employee", data.Matricule] });
      queryClient.invalidateQueries({ queryKey: ["pointage-employees"] }); // Invalidate other dependent queries if any
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'enregistrement.",
        variant: "destructive",
      });
    },
  });
}
