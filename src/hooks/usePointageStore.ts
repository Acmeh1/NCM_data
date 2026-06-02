import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
} from "date-fns";

// ── Types ──────────────────────────────────────────────────────────
export type PointageStatut = "PRESENT" | "ABS_AUTORISEE" | "ABS_NON_AUTORISEE" | "WEEKEND" | "FERIE" | "DEBUT_CONTRAT" | "FIN_CONTRAT" | "";

export interface PointageRow {
  id?: string;
  matricule: string;
  date: string; // YYYY-MM-DD
  statut: PointageStatut;
  etat?: string;
  heures_supp?: number;
  retard?: number;
  commentaire?: string;
}

export interface Employee {
  Matricule: string;
  Nom: string;
  Prénom?: string;
  Prenom?: string;
  Service?: string;
  Fonction?: string;
  Date_départ?: string;
  Date_depart?: string;
}

// ── Constants ──────────────────────────────────────────────────────
export const STATUT_OPTIONS: { value: PointageStatut; label: string; color: string; bgColor: string; icon: string }[] = [
  { value: "PRESENT",           label: "Présent",               color: "#10b981", bgColor: "bg-emerald-500", icon: "P" },
  { value: "ABS_AUTORISEE",     label: "Absence Autorisée",     color: "#3b82f6", bgColor: "bg-blue-500",    icon: "AA" },
  { value: "ABS_NON_AUTORISEE", label: "Absence Non Autorisée", color: "#ef4444", bgColor: "bg-red-500",     icon: "AN" },
  { value: "WEEKEND",           label: "Weekend",               color: "#94a3b8", bgColor: "bg-slate-400",   icon: "W" },
  { value: "FERIE",             label: "Férié",                 color: "#8b5cf6", bgColor: "bg-violet-500",  icon: "F" },
  { value: "DEBUT_CONTRAT",     label: "Début Contrat",         color: "#f59e0b", bgColor: "bg-amber-500",   icon: "DC" },
  { value: "FIN_CONTRAT",       label: "Fin Contrat",           color: "#ea580c", bgColor: "bg-orange-500",  icon: "FC" },
];

export const ETAT_OPTIONS: Record<string, string[]> = {
  ABS_AUTORISEE: [
    "CONGE_ANNUEL",
    "CONGE_MALADIE",
    "CONGE_DECES",
    "CONGE_MARIAGE",
    "FORMATION",
    "CONGE_SANS_SOLDE",
    "CONGE_CIRCONCISION",
    "RECUPERATION"
  ],
};

export const ETAT_LABELS: Record<string, string> = {
  CONGE_ANNUEL: "Congé Annuel",
  CONGE_MALADIE: "Congé Maladie",
  CONGE_DECES: "Congé Décès",
  CONGE_MARIAGE: "Congé Mariage",
  FORMATION: "Formation",
  CONGE_SANS_SOLDE: "Congé sans solde",
  CONGE_CIRCONCISION: "Congé Circoncision",
  RECUPERATION: "Récupération",
};

// ── Helper: get employee name ──────────────────────────────────────
export function getEmployeeName(emp: Employee): string {
  const prenom = emp["Prénom"] || emp["Prenom"] || "";
  return `${emp.Nom || ""} ${prenom}`.trim();
}

// ── Helper: get depart date ──────────────────────────────────────
function getDateDepart(emp: Employee): string | undefined {
  return emp["Date_départ"] || emp["Date_depart"];
}

// ── Hook ───────────────────────────────────────────────────────────
export function usePointageStore(selectedMonth: Date) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const monthKey = format(monthStart, "yyyy-MM");

  // Days of the month
  const daysOfMonth = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [monthStart.getTime(), monthEnd.getTime()]);

  // Track local edits: key = "matricule|YYYY-MM-DD"
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<PointageRow>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // ── Fetch active employees ──────────────────────────────────────
  const {
    data: employees = [],
    isLoading: loadingEmployees,
  } = useQuery({
    queryKey: ["pointage-employees"],
    queryFn: async () => {
      // Try fichRH first
      const { data, error } = await supabase
        .from("fichRH")
        .select("*");

      if (error) {
        // Fallback to lowercase
        const { data: d2, error: e2 } = await supabase
          .from("fichrh")
          .select("*");
        if (e2) throw e2;
        return (d2 || []) as Employee[];
      }
      return (data || []) as Employee[];
    },
  });

  // Active employees (no departure date)
  const activeEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const depart = getDateDepart(emp);
      return !depart || depart.toString().trim() === "";
    });
  }, [employees]);

  // Service list
  const services = useMemo(() => {
    const set = new Set<string>();
    activeEmployees.forEach((emp) => {
      if (emp.Service) set.add(emp.Service);
    });
    return Array.from(set).sort();
  }, [activeEmployees]);

  // ── Fetch existing pointage data for the month ──────────────────
  const {
    data: savedPointage = [],
    isLoading: loadingPointage,
  } = useQuery({
    queryKey: ["pointage-data", monthKey],
    queryFn: async () => {
      const sDate = format(monthStart, "yyyy-MM-dd");
      const eDate = format(monthEnd, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("pointage_rh")
        .select("*")
        .gte("date", sDate)
        .lte("date", eDate);

      if (error) {
        console.error("Error fetching pointage:", error);
        return [];
      }
      return (data || []) as PointageRow[];
    },
  });

  // Build a lookup map: "matricule|date" → PointageRow
  const savedMap = useMemo(() => {
    const map: Record<string, PointageRow> = {};
    savedPointage.forEach((row) => {
      const key = `${row.matricule}|${row.date}`;
      map[key] = row;
    });
    return map;
  }, [savedPointage]);

  // ── Get effective cell data (saved + local edits) ───────────────
  const getCellData = useCallback(
    (matricule: string, dateStr: string): PointageRow => {
      const key = `${matricule}|${dateStr}`;
      const saved = savedMap[key];
      const local = localEdits[key];

      // Default: check if weekend
      const dayOfWeek = getDay(new Date(dateStr));
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Vendredi + Samedi

      const base: PointageRow = {
        matricule,
        date: dateStr,
        statut: isWeekend ? "WEEKEND" : "",
        heures_supp: 0,
        retard: 0,
        ...saved,
        ...local,
      };

      return base;
    },
    [savedMap, localEdits]
  );

  // ── Update a cell locally ───────────────────────────────────────
  const updateCell = useCallback(
    (matricule: string, dateStr: string, updates: Partial<PointageRow>) => {
      const key = `${matricule}|${dateStr}`;
      setLocalEdits((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          ...updates,
        },
      }));
      setHasChanges(true);
    },
    []
  );

  // ── Quick cycle through statuts ─────────────────────────────────
  const cycleStatut = useCallback(
    (matricule: string, dateStr: string) => {
      const current = getCellData(matricule, dateStr);
      const cycle: PointageStatut[] = ["PRESENT", "ABS_AUTORISEE", "ABS_NON_AUTORISEE"];
      const idx = cycle.indexOf(current.statut);
      const next = cycle[(idx + 1) % cycle.length];
      updateCell(matricule, dateStr, { statut: next, etat: undefined });
    },
    [getCellData, updateCell]
  );

  // ── Initialize month with PRESENT for all workdays ──────────────
  const initializeMonth = useCallback(
    (employeeList: Employee[]) => {
      const edits: Record<string, Partial<PointageRow>> = {};
      employeeList.forEach((emp) => {
        daysOfMonth.forEach((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const key = `${emp.Matricule}|${dateStr}`;
          const dayOfWeek = getDay(day);
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Vendredi + Samedi

          // Only initialize if no saved data
          if (!savedMap[key]) {
            edits[key] = {
              statut: isWeekend ? "WEEKEND" : "PRESENT",
            };
          }
        });
      });
      setLocalEdits((prev) => ({ ...prev, ...edits }));
      setHasChanges(true);
    },
    [daysOfMonth, savedMap]
  );

  // ── Save all changes (batch upsert) ─────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const rows: PointageRow[] = [];

      Object.entries(localEdits).forEach(([key, edits]) => {
        const [matricule, dateStr] = key.split("|");
        const cell = getCellData(matricule, dateStr);

        // Only save if there's a statut
        if (cell.statut) {
          rows.push({
            matricule: cell.matricule,
            date: cell.date,
            statut: cell.statut,
            etat: cell.etat || null as any,
            heures_supp: cell.heures_supp || 0,
            retard: cell.retard || 0,
            commentaire: cell.commentaire || null as any,
          });
        }
      });

      if (rows.length === 0) {
        throw new Error("Aucune donnée à sauvegarder.");
      }

      // Batch upsert in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("pointage_rh")
          .upsert(chunk, { onConflict: "matricule,date" });

        if (error) throw error;
      }

      return rows.length;
    },
    onSuccess: (count) => {
      toast({
        title: "✅ Pointage sauvegardé",
        description: `${count} enregistrements sauvegardés avec succès.`,
      });
      setLocalEdits({});
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["pointage-data", monthKey] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erreur de sauvegarde",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    },
  });

  // ── Stats for the month ─────────────────────────────────────────
  const monthStats = useMemo(() => {
    let present = 0;
    let absAutorisee = 0;
    let absNonAutorisee = 0;
    let weekend = 0;
    let ferie = 0;
    let debutContrat = 0;
    let finContrat = 0;
    let total = 0;

    let congeAnnuel = 0;
    let congeMaladie = 0;
    let congeDeces = 0;
    let congeMariage = 0;
    let formation = 0;
    let congeSansSolde = 0;
    let congeCirconcision = 0;
    let recuperation = 0;

    activeEmployees.forEach((emp) => {
      daysOfMonth.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const cell = getCellData(emp.Matricule, dateStr);
        total++;
        switch (cell.statut) {
          case "PRESENT":           present++;           break;
          case "ABS_AUTORISEE":
            absAutorisee++;
            if (cell.etat === "CONGE_ANNUEL") congeAnnuel++;
            else if (cell.etat === "CONGE_MALADIE") congeMaladie++;
            else if (cell.etat === "CONGE_DECES") congeDeces++;
            else if (cell.etat === "CONGE_MARIAGE") congeMariage++;
            else if (cell.etat === "FORMATION") formation++;
            else if (cell.etat === "CONGE_SANS_SOLDE") congeSansSolde++;
            else if (cell.etat === "CONGE_CIRCONCISION") congeCirconcision++;
            else if (cell.etat === "RECUPERATION") recuperation++;
            break;
          case "ABS_NON_AUTORISEE": absNonAutorisee++;   break;
          case "WEEKEND":           weekend++;           break;
          case "FERIE":             ferie++;             break;
          case "DEBUT_CONTRAT":     debutContrat++;      break;
          case "FIN_CONTRAT":       finContrat++;        break;
        }
      });
    });

    const workdays = total - weekend - ferie - debutContrat - finContrat;
    const presenceRate = workdays > 0 ? ((present / workdays) * 100).toFixed(1) : "0";
    const absenceRate = workdays > 0 ? (((absAutorisee + absNonAutorisee) / workdays) * 100).toFixed(1) : "0";

    return {
      present,
      absAutorisee,
      absNonAutorisee,
      weekend,
      ferie,
      debutContrat,
      finContrat,
      total,
      workdays,
      presenceRate,
      absenceRate,
      congeAnnuel,
      congeMaladie,
      congeDeces,
      congeMariage,
      formation,
      congeSansSolde,
      congeCirconcision,
      recuperation,
    };
  }, [activeEmployees, daysOfMonth, getCellData]);

  return {
    // Data
    employees: activeEmployees,
    services,
    daysOfMonth,
    monthKey,
    monthStats,

    // Loading states
    isLoading: loadingEmployees || loadingPointage,
    isSaving: saveMutation.isPending,

    // Cell operations
    getCellData,
    updateCell,
    cycleStatut,

    // Bulk operations
    initializeMonth,
    hasChanges,
    save: () => saveMutation.mutate(),
  };
}
