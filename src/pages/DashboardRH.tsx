import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import DateRangeFilter from "@/components/DateRangeFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, LineChart, Line, ComposedChart
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, Briefcase, UserCheck, ShieldCheck, ClipboardList, UserMinus, 
  Activity, TrendingUp, LayoutDashboard, GraduationCap, Calendar, 
  UserPlus, UserMinus as UserMinusIcon, MapPin, Smile, UserPlus2, UserMinus2, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Target, Edit3
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKpiSettings } from "@/hooks/useKpiSettings";
import { cn } from "@/lib/utils";
import Dashboard from "./hr/Dashboard";
import WorkforceDetail from "./hr/WorkforceDetail";
import { Button } from "@/components/ui/button";
import { 
  parseISO, 
  format as formatDate, 
  eachDayOfInterval, 
  eachMonthOfInterval, 
  isSameDay, 
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  isAfter,
  isBefore
} from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = [
  "hsl(150, 60%, 45%)", // CDI - Green (Stability)
  "hsl(210, 70%, 55%)", // CDD - Blue
  "hsl(45, 80%, 55%)",  // IntÃ©rim - Orange/Yellow
  "hsl(340, 65%, 50%)", // Others
];

export default function DashboardRH() {
  const getProp = (obj: any, key: string) => {
    if (!obj) return undefined;
    if (obj[key] !== undefined) return obj[key];
    // try lowercase / normalize
    const normKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const foundKey = Object.keys(obj).find(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normKey);
    return foundKey ? obj[foundKey] : undefined;
  };

  const hasDepartureDate = (emp: any) => {
    const d = getProp(emp, PROP_DEPART);
    if (!d) return false;
    const s = String(d).trim().toUpperCase();
    if (s === "" || s === "-" || s === "N/A" || s === "NA" || s === "NULL" || s === "0") return false;
    return true; // Has some sort of departure string
  };

  const parseDate = (dateStr: any) => {
    if (!dateStr) return null;
    let s = String(dateStr).trim();
    if (!s || s === "-" || s === "N/A" || s === "NA" || s === "NULL" || s === "0") return null;
    
    // Excel serial number (e.g., 45000)
    if (/^\d{5}$/.test(s)) {
      const serial = parseInt(s, 10);
      return new Date((serial - 25569) * 86400 * 1000);
    }
    
    // Standardize slashes to dashes for parseISO
    s = s.replace(/\//g, "-");

    try {
      // Try YYYY-MM-DD
      const d = parseISO(s);
      if (!isNaN(d.getTime())) return d;
      
      // Handle DD-MM-YYYY or other formats
      const parts = s.split(/[-\s]/).filter(Boolean);
      if (parts.length === 3) {
        let p0 = parseInt(parts[0], 10);
        let p1 = parseInt(parts[1], 10);
        let p2 = parseInt(parts[2], 10);
        
        // Handle 2-digit years
        if (p2 < 100) p2 += 2000;
        if (p0 < 100 && p0 > 31) p0 += 2000;
        
        if (p0 > 1900) return new Date(p0, p1 - 1, p2); // YYYY-MM-DD
        if (p2 > 1900) return new Date(p2, p1 - 1, p0); // DD-MM-YYYY
      }
    } catch (e) {
      console.error("Date parsing error:", s, e);
    }
    return null;
  };

  const PROP_CONTRAT = "Contrat";
  const PROP_DEPART = "Date_dÃ©part";
  const PROP_EMBAUCHE = "Date_Embauche";
  const PROP_SEXE = "Sexe";
  const PROP_SERVICE = "Service";
  const PROP_AGE_TRANCHE = "Tranche_d'age";
  const PROP_ANCIENNETE_TRANCHE = "Tranche_AnciennetÃ©";
  const PROP_NIVEAU = "Niveau";
  const PROP_FONCTION = "Fonction";
  const PROP_CAUSE_DEPART = "Cause_DÃ©part";
  const PROP_SITUATION_F = "Situation_F";
  const PROP_MATRICULE = "Matricule";
  const PROP_NAISSANCE = "Date_de_Naissance";

  const { 
    startDate, endDate, currentRange, period, activePreset,
    setRange, setPeriod 
  } = useDashboardFilters();
  const { getObjective } = useKpiSettings();
  const turnoverObjective = getObjective("turnover") || 9;

  // Fetch ALL RH data
  const { data: rhData = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ["rh-data-global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichRH")
        .select("*");
      
      if (error) {
        const { data: dataLower, error: errorLower } = await supabase
          .from("fichrh")
          .select("*");
        if (errorLower) throw errorLower;
        return dataLower || [];
      }
      return data || [];
    },
  });
  
  const [selectedService, setSelectedService] = useState<string | null>("Approvisionnement");
  const [turnoverFilter, setTurnoverFilter] = useState<string>("Tous");

  // Fetch Absenteeism data (Pointage)
  const { data: pointageData = [], isLoading: loadingPointage } = useQuery({
    queryKey: ["pointage-data", new Date(startDate).toISOString(), new Date(endDate).toISOString()],
    queryFn: async () => {
      const sDate = formatDate(new Date(startDate), "yyyy-MM-dd");
      const eDate = formatDate(new Date(endDate), "yyyy-MM-dd");

      console.log(`ðŸ“¡ RequÃªte Pointage pour la pÃ©riode : ${sDate} au ${eDate}`);

      const { data, error } = await supabase
        .from("pointage_rh")
        .select("*")
        .gte("date", sDate)
        .lte("date", eDate);
      
      if (error) {
        return [];
      }

      return data || [];
    }
  });

  // 13. Absenteeism Calculations
  const absenteeismStats = useMemo(() => {
    if (!pointageData.length) return null;

    let totalPlannedHours = 0;
    let totalAbsentHours = 0;
    const byService: Record<string, { planned: number; absent: number }> = {};
    const byDate: Record<string, { planned: number; absent: number }> = {};
    const byReason: Record<string, number> = {};

    const employeesByMatricule = new Map();
    rhData.forEach(emp => {
      const mat = getProp(emp, PROP_MATRICULE);
      if (mat) employeesByMatricule.set(String(mat).trim().toUpperCase(), emp);
    });

    pointageData.forEach(row => {
      const matricule = String(row.matricule || "").trim().toUpperCase();
      const emp = employeesByMatricule.get(matricule);
      const service = emp ? (getProp(emp, PROP_SERVICE) || "Inconnu") : "Inconnu";
      const date = row.date || "Inconnu";
      const statut = row.statut || "";
      
      const isWorkday = statut !== "WEEKEND" && statut !== "FERIE" && statut !== "" && statut !== "DEBUT_CONTRAT" && statut !== "FIN_CONTRAT";

      if (isWorkday) {
        totalPlannedHours += 8;
        if (!byService[service]) byService[service] = { planned: 0, absent: 0 };
        if (!byDate[date]) byDate[date] = { planned: 0, absent: 0 };

        byService[service].planned += 8;
        byDate[date].planned += 8;

        let dayAbsentHours = 0;
        let reason = "";

        if (statut === "ABS_AUTORISEE") {
          dayAbsentHours = 8;
          reason = "Absence AutorisÃ©e";
        } else if (statut === "ABS_NON_AUTORISEE" || statut === "MISE_A_PIED") {
          dayAbsentHours = 8;
          reason = statut === "MISE_A_PIED" ? "Mise Ã  Pied" : "Absence Non AutorisÃ©e";
        } else if (statut === "PRESENT") {
          if (row.retard && row.retard > 0) {
            dayAbsentHours = row.retard;
            reason = "Retard/Partiel";
          }
        }

        if (dayAbsentHours > 0) {
          totalAbsentHours += dayAbsentHours;
          byService[service].absent += dayAbsentHours;
          byDate[date].absent += dayAbsentHours;
          
          if (reason) {
            byReason[reason] = (byReason[reason] || 0) + dayAbsentHours;
          }
        }
      }
    });

    const rate = totalPlannedHours > 0 ? ((totalAbsentHours / totalPlannedHours) * 100).toFixed(2) : "0";
    
    const serviceData = Object.entries(byService)
      .map(([name, stats]) => ({
        name,
        rate: stats.planned > 0 ? ((stats.absent / stats.planned) * 100).toFixed(1) : 0,
        absent: stats.absent
      }))
      .sort((a, b) => (b.absent as number) - (a.absent as number));

    const trendData = Object.entries(byDate)
      .map(([date, stats]) => ({
        date,
        name: formatDate(new Date(date), "dd/MM", { locale: fr }),
        rate: stats.planned > 0 ? ((stats.absent / stats.planned) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const reasonData = Object.entries(byReason)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { rate, totalPlannedHours, totalAbsentHours, serviceData, trendData, reasonData };
  }, [pointageData]);

  console.log("DashboardRH: rhData length =", rhData.length);
  if (rhData.length > 0) console.log("Sample row:", rhData[0]);

  // --- TREND & FILTRATION LOGIC ---
  
  const rangeStart = useMemo(() => parseISO(startDate), [startDate]);
  const rangeEnd = useMemo(() => parseISO(endDate), [endDate]);

  // 1. Trend Data for Headcount Evolution
  const evolutionData = useMemo(() => {
    if (rhData.length === 0) return [];

    // Decide granularity based on range duration
    const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 3600 * 24));
    let intervals: Date[];
    
    if (diffDays <= 62) {
      intervals = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    } else {
      intervals = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
    }

      return intervals.map(date => {
        const count = rhData.filter(emp => {
          const hireDateStr = getProp(emp, PROP_EMBAUCHE);
          const departDateStr = getProp(emp, PROP_DEPART);
          
          const hireDate = parseDate(hireDateStr);
          const departDate = parseDate(departDateStr);

          // If hireDate is missing, we assume they were hired before this 'date'
          const isHiredByDate = !hireDate || hireDate <= date;
          // Still active if no depart date OR departed after this 'date'
          const hasDepart = hasDepartureDate(emp);
          const isStillActive = !hasDepart || (departDate && isAfter(departDate, date));
          
          return isHiredByDate && isStillActive;
        }).length;

      return {
        date: formatDate(date, diffDays <= 62 ? "dd MMM" : "MMM yyyy", { locale: fr }),
        headcount: count
      };
    });
  }, [rhData, rangeStart, rangeEnd]);

  // 2. New Hires in period
  const newHires = useMemo(() => {
    return rhData.filter(emp => {
      const hireDate = getProp(emp, PROP_EMBAUCHE);
      if (!hireDate) return false;
      const date = parseDate(hireDate);
      return date && isWithinInterval(date, { start: rangeStart, end: rangeEnd });
    });
  }, [rhData, rangeStart, rangeEnd]);

  // 3. Departures in period
  const departuresList = useMemo(() => {
    return rhData.filter(emp => {
      const departDateStr = getProp(emp, PROP_DEPART);
      if (!departDateStr) return false;
      const date = parseDate(departDateStr);
      return date && isWithinInterval(date, { start: rangeStart, end: rangeEnd });
    });
  }, [rhData, rangeStart, rangeEnd]);

  // 4. Final Headcount at end of period
  const countAtEnd = evolutionData.length > 0 ? evolutionData[evolutionData.length - 1].headcount : 0;
  const countAtStart = evolutionData.length > 0 ? evolutionData[0].headcount : 0;
  
  const avgHeadcount = (countAtStart + countAtEnd) / 2;
  const turnoverRate = avgHeadcount > 0 ? ((departuresList.length / avgHeadcount) * 100).toFixed(1) : "0";

  // 5. Global Active Headcount (regardless of period - those who never left)
  const effectifActifGlobal = useMemo(() => {
    return rhData.filter(emp => {
        const departDateStr = getProp(emp, PROP_DEPART);
        const departDate = parseDate(departDateStr);
        const hasDepart = hasDepartureDate(emp);
        return !hasDepart || (departDate && isAfter(departDate, new Date()));
    }).length;
  }, [rhData]);

  // 6. Contract Breakdown at end of period
  const contractStats = useMemo(() => {
    const counts: Record<string, number> = {
      "CDI": 0,
      "CDD": 0,
      "IntÃ©rim": 0,
      "Autre": 0
    };

    // Calculate specifically for people active at the end of the period
      rhData.forEach((item: any) => {
        const hireDateStr = getProp(item, PROP_EMBAUCHE);
        const departDateStr = getProp(item, PROP_DEPART);
        
        const hireDate = parseDate(hireDateStr);
        const departDate = parseDate(departDateStr);

        const isHiredByDate = !hireDate || hireDate <= rangeEnd;
        const hasDepart = hasDepartureDate(item);
        const isStillActive = !hasDepart || (departDate && isAfter(departDate, rangeEnd));
        const isActiveAtEnd = isHiredByDate && isStillActive;
        
        if (isActiveAtEnd) {
        const contractValue = getProp(item, PROP_CONTRAT) || "";
        const type = String(contractValue).toUpperCase().trim();
        if (type.includes("CDI")) counts["CDI"]++;
        else if (type.includes("CDD")) counts["CDD"]++;
        else if (type.includes("INTÃ‰RIM") || type.includes("INTERIM")) counts["IntÃ©rim"]++;
        else if (type) counts["Autre"]++;
      }
    });

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [rhData, rangeEnd]);

  const cdiCount = contractStats.find(s => s.name === "CDI")?.value || 0;
  const stabilityRate = countAtEnd > 0 ? ((cdiCount / countAtEnd) * 100).toFixed(1) : "0";

  // 7. Gender & Service Breakdown
  const genderStats = useMemo(() => {
    let homme = 0;
    let femme = 0;
    const byService: Record<string, { F: number; H: number; total: number }> = {};

    rhData.forEach((item: any) => {
      const hireDateStr = getProp(item, PROP_EMBAUCHE);
      const departDateStr = getProp(item, PROP_DEPART);
      
      const hireDate = parseDate(hireDateStr);
      const departDate = parseDate(departDateStr);
      
      const isHiredByDate = !hireDate || hireDate <= rangeEnd;
      const hasDepart = hasDepartureDate(item);
      const isStillActive = !hasDepart || (departDate && isAfter(departDate, rangeEnd));
      const isActiveAtEnd = isHiredByDate && isStillActive;
      
      if (isActiveAtEnd) {
        const sexeRaw = String(getProp(item, PROP_SEXE) || "").toUpperCase().trim();
        const service = String(getProp(item, PROP_SERVICE) || "Autre").trim() || "Autre";
        
        let isF = sexeRaw.startsWith('F') || sexeRaw.includes('FEMME');
        if (isF) femme++;
        else homme++;

        if (!byService[service]) byService[service] = { F: 0, H: 0, total: 0 };
        byService[service].total++;
        if (isF) byService[service].F++;
        else byService[service].H++;
      }
    });

    const total = homme + femme;
    const pctF = total > 0 ? (femme / total) * 100 : 0;
    const pctH = total > 0 ? (homme / total) * 100 : 0;

    const serviceArray = Object.entries(byService)
      .map(([name, data]) => ({
        name,
        pctF: data.total > 0 ? (data.F / data.total) * 100 : 0,
        total: data.total
      }))
      .sort((a, b) => b.total - a.total);

    return { homme, femme, total, pctH, pctF, byService: serviceArray };
  }, [rhData, rangeEnd]);

  // 8. Age Distribution Stats (Dynamic based on selected date)
  const ageStats = useMemo(() => {
    const counts: Record<string, number> = {
      "18-25": 0,
      "26-35": 0,
      "36-45": 0,
      "46-55": 0,
      "55+": 0
    };

    rhData.forEach(emp => {
      const hireDateStr = getProp(emp, PROP_EMBAUCHE);
      const departDateStr = getProp(emp, PROP_DEPART);
      const birthDateStr = getProp(emp, PROP_NAISSANCE);
      
      const hireDate = parseDate(hireDateStr);
      const departDate = parseDate(departDateStr);
      const birthDate = parseDate(birthDateStr);

      const isHiredByDate = !hireDate || hireDate <= rangeEnd;
      const hasDepart = hasDepartureDate(emp);
      const isStillActive = !hasDepart || (departDate && isAfter(departDate, rangeEnd));
      const isActiveAtEnd = isHiredByDate && isStillActive;

      if (isActiveAtEnd && birthDate) {
        const age = Math.floor((rangeEnd.getTime() - birthDate.getTime()) / (1000 * 3600 * 24 * 365.25));
        
        let tranche = "";
        if (age < 26) tranche = "18-25";
        else if (age < 36) tranche = "26-35";
        else if (age < 46) tranche = "36-45";
        else if (age < 56) tranche = "46-55";
        else tranche = "55+";

        counts[tranche]++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rhData, rangeEnd]);

  // 9. Seniority Distribution Stats (Dynamic based on selected date)
  const seniorityStats = useMemo(() => {
    const counts: Record<string, number> = {
      "< 1 an": 0,
      "1-3 ans": 0,
      "3-5 ans": 0,
      "5-10 ans": 0,
      "10-20 ans": 0,
      "> 20 ans": 0
    };

    rhData.forEach(emp => {
      const hireDateStr = getProp(emp, PROP_EMBAUCHE);
      const departDateStr = getProp(emp, PROP_DEPART);
      const hireDate = parseDate(hireDateStr);
      const departDate = parseDate(departDateStr);

      const isHiredByDate = !hireDate || hireDate <= rangeEnd;
      const hasDepart = hasDepartureDate(emp);
      const isStillActive = !hasDepart || (departDate && isAfter(departDate, rangeEnd));
      const isActiveAtEnd = isHiredByDate && isStillActive;

      if (isActiveAtEnd && hireDate) {
        // Calculate seniority in years relative to rangeEnd
        const diffYears = Math.floor((rangeEnd.getTime() - hireDate.getTime()) / (1000 * 3600 * 24 * 365.25));
        
        let tranche = "";
        if (diffYears < 1) tranche = "< 1 an";
        else if (diffYears < 3) tranche = "1-3 ans";
        else if (diffYears < 5) tranche = "3-5 ans";
        else if (diffYears < 10) tranche = "5-10 ans";
        else if (diffYears < 20) tranche = "10-20 ans";
        else tranche = "> 20 ans";

        counts[tranche]++;
      }
    });
    
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rhData, rangeEnd]);

  // 10. Education Level Stats
  const educationStats = useMemo(() => {
    const counts: Record<string, number> = {};
    rhData.forEach(emp => {
      const hireDateStr = getProp(emp, PROP_EMBAUCHE);
      const departDateStr = getProp(emp, PROP_DEPART);
      if (!hireDateStr) return;

      const hireDate = parseDate(hireDateStr);
      const departDate = parseDate(departDateStr);
      
      const isHiredByDate = !hireDate || hireDate <= rangeEnd;
      const hasDepart = hasDepartureDate(emp);
      const isStillActive = !hasDepart || (departDate && isAfter(departDate, rangeEnd));
      const isActiveAtEnd = isHiredByDate && isStillActive;

      if (isActiveAtEnd) {
        const niveau = getProp(emp, PROP_NIVEAU) || "Inconnu";
        counts[niveau] = (counts[niveau] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rhData, rangeEnd]);

  // 11. Cause of Departure Stats
  const departureCauses = useMemo(() => {
    const counts: Record<string, number> = {};
    departuresList.forEach(emp => {
      const cause = getProp(emp, PROP_CAUSE_DEPART) || "Non spÃ©cifiÃ©";
      counts[cause] = (counts[cause] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [departuresList]);

  // 12. Monthly Flux (Hires vs Departures) - last 12 months
  const fluxData = useMemo(() => {
    if (rhData.length === 0) return [];
    
    // We analyze the last 12 full months + current month
    const end = new Date();
    const start = startOfMonth(subMonths(end, 11));
    const months = eachMonthOfInterval({ start, end });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const hires = rhData.filter(emp => {
        const d = parseDate(getProp(emp, PROP_EMBAUCHE));
        return d && isWithinInterval(d, { start: monthStart, end: monthEnd });
      }).length;

      const departures = rhData.filter(emp => {
        const d = parseDate(getProp(emp, PROP_DEPART));
        return d && isWithinInterval(d, { start: monthStart, end: monthEnd });
      }).length;

      return {
        name: formatDate(month, "MMM yy", { locale: fr }),
        hires,
        departures,
        net: hires - departures
      };
    });
  }, [rhData]);

  const turnoverServices = useMemo(() => {
    const services = new Set([
      ...newHires.map((e: any) => getProp(e, PROP_SERVICE)),
      ...departuresList.map((e: any) => getProp(e, PROP_SERVICE))
    ]);
    return Array.from(services).filter(Boolean).sort() as string[];
  }, [newHires, departuresList]);

  const filteredNewHires = useMemo(() => {
    return turnoverFilter === "Tous" ? newHires : newHires.filter((e: any) => getProp(e, PROP_SERVICE) === turnoverFilter);
  }, [newHires, turnoverFilter]);

  const filteredDepartures = useMemo(() => {
    return turnoverFilter === "Tous" ? departuresList : departuresList.filter((e: any) => getProp(e, PROP_SERVICE) === turnoverFilter);
  }, [departuresList, turnoverFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tableau de Bord RH</h1>
            <p className="text-sm text-muted-foreground font-medium">Analyse stratÃ©gique du capital humain</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 transition-all hover:bg-primary hover:text-white">
          <Activity className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Diagnostics */}
      {(queryError || (rhData.length === 0 && !isLoading)) && (
        <Card className="bg-destructive/5 border-destructive/20 border-dashed mb-6">
          <CardContent className="p-4 text-sm text-destructive/80 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            {queryError ? (
              <p>Erreur de base de donnÃ©es : {(queryError as any).message}</p>
            ) : (
              <p>La table <strong>fichRH</strong> semble vide ou inaccessible. VÃ©rifiez l'importation des donnÃ©es et les politiques RLS dans Supabase.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <DateRangeFilter
          range={currentRange}
          onRangeChange={setRange}
          granularity={period}
          onGranularityChange={setPeriod}
          activePreset={activePreset}
        />
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs font-medium text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-primary" />
          {rhData.length} Collaborateurs dans la base
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full lg:w-[600px] h-11 p-1 bg-muted/50 border">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <LayoutDashboard className="h-4 w-4" /> Vue Globale
          </TabsTrigger>
          <TabsTrigger value="absenteeism" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Activity className="h-4 w-4" /> AbsentÃ©isme
          </TabsTrigger>
          <TabsTrigger value="workforce_detail" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" /> DÃ©tail Effectif
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <GraduationCap className="h-4 w-4" /> CompÃ©tences
          </TabsTrigger>
          <TabsTrigger value="turnover" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <TrendingUp className="h-4 w-4" /> Mouvements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="border-none shadow-md bg-slate-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-600 rounded-lg text-white shadow-lg">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-nowrap">Effectif Global</p>
                    <div className="text-xl font-bold">{rhData.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg text-white shadow-lg">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-nowrap">Effectif Actif (Total)</p>
                    <div className="text-xl font-bold text-blue-600">{effectifActifGlobal}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg text-white shadow-lg">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-nowrap">Effectif Actif (PÃ©riode)</p>
                    <div className="text-xl font-bold text-blue-600">{countAtEnd}</div>
                  </div>
                </div>
              </CardContent>
            </Card>


            <Card className="border-none shadow-md bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-lg text-white shadow-lg">
                    <UserPlus2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-nowrap">Recrutements</p>
                    <div className="text-xl font-bold text-emerald-600">+{newHires.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-gradient-to-br from-rose-500/10 to-rose-600/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500 rounded-lg text-white shadow-lg">
                    <UserMinus2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-nowrap">DÃ©parts</p>
                    <div className="text-xl font-bold text-rose-600">-{departuresList.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-gradient-to-br from-amber-500/10 to-amber-600/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg text-white shadow-lg",
                    parseFloat(turnoverRate) <= turnoverObjective ? "bg-emerald-500" : "bg-rose-500"
                  )}>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-nowrap">Taux Turnover</p>
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-amber-200 text-amber-700">Obj: {turnoverObjective}%</Badge>
                    </div>
                    <div className={cn(
                      "text-xl font-bold",
                      parseFloat(turnoverRate) <= turnoverObjective ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {turnoverRate}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-gradient-to-br from-indigo-500/10 to-indigo-600/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-lg text-white shadow-lg">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-nowrap">Taux de CDI</p>
                    <div className="text-xl font-bold text-indigo-600">{stabilityRate}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm border border-slate-200/60 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Ã‰volution de l'Effectif
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="headcount" name="Effectif" stroke="hsl(210, 70%, 55%)" fillOpacity={1} fill="url(#colorHeadcount)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card className="flex-1 shadow-sm border border-slate-200/60 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5" />
                    RÃ©partition des Contrats
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={contractStats} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                          {contractStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {contractStats.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          {item.name}
                        </div>
                        <span className="font-bold text-slate-700">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1 shadow-sm border border-slate-200/60 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    MixitÃ© Homme / Femme
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2 space-y-4">
                  <div className="flex justify-around items-end">
                    <div className="flex flex-col items-center">
                      <span className="text-rose-500 text-lg font-black leading-none">{genderStats.pctF.toFixed(0)}%</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Femmes</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-blue-500 text-lg font-black leading-none">{genderStats.pctH.toFixed(0)}%</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Hommes</span>
                    </div>
                  </div>
                  
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    <div className="bg-rose-500 h-full transition-all" style={{ width: `${genderStats.pctF}%` }} />
                    <div className="bg-blue-500 h-full transition-all" style={{ width: `${genderStats.pctH}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-400 text-center italic">Total : {genderStats.total} employÃ©s</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="shadow-sm border border-slate-200/60 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Dynamique de Recrutement vs DÃ©parts (12 mois)
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={fluxData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="net" name="Solde Net" fill="#94a3b8" opacity={0.2} barSize={30} />
                    <Line type="monotone" dataKey="hires" name="Embauches" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="departures" name="DÃ©parts" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card className="shadow-sm border border-slate-200/60 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  RÃ©partition par AnciennetÃ© (Actifs)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seniorityStats} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }} contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="value" name="EmployÃ©s" fill="hsl(250, 60%, 65%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-slate-200/60 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  RÃ©partition par Tranche d'Ã‚ge (Actifs)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageStats} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }} contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="value" name="EmployÃ©s" fill="hsl(210, 70%, 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <Card className="lg:col-span-2 shadow-sm border border-slate-200/60 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserMinus2 className="h-4 w-4 text-rose-500" />
                  Motifs de DÃ©part (Analyse sur la pÃ©riode)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col md:flex-row items-center gap-8">
                <div className="h-[250px] w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={departureCauses} 
                        cx="50%" cy="50%" 
                        innerRadius={60} outerRadius={90} 
                        paddingAngle={5} 
                        dataKey="value"
                      >
                        {departureCauses.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-4">
                  {departureCauses.map((item, idx) => {
                    const total = departureCauses.reduce((acc, curr) => acc + curr.value, 0);
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
                    return (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-slate-700">{item.name}</span>
                          <span className="font-bold text-primary">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-1000" 
                            style={{ width: `${pct}%`, backgroundColor: COLORS[idx % COLORS.length] }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                  {departureCauses.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground italic text-sm">
                      Aucun dÃ©part enregistrÃ© sur cette pÃ©riode.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 mt-6">
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                DÃ©tails des Mouvements par Service
              </h3>
              <Select value={turnoverFilter} onValueChange={setTurnoverFilter}>
                <SelectTrigger className="w-[250px] h-8 text-xs">
                  <SelectValue placeholder="Filtrer par service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous">Tous les services</SelectItem>
                  {turnoverServices.map(srv => (
                    <SelectItem key={srv} value={srv}>{srv}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* New Hires Table */}
            <Card className="shadow-sm border border-slate-200/60 bg-white overflow-hidden">
              <CardHeader className="bg-blue-50/50 border-b border-slate-100 py-3">
                <CardTitle className="text-sm font-bold text-blue-800 flex items-center gap-2">
                  <UserPlus2 className="h-4 w-4" />
                  Qui a rejoint l'organisation sur cette pÃ©riode ? ({filteredNewHires.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                        <th className="px-4 py-3">Matricule</th>
                        <th className="px-4 py-3">Nom Complet</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Fonction</th>
                        <th className="px-4 py-3">Grade</th>
                        <th className="px-4 py-3 text-right">Ã‚ge (Ans)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredNewHires.length > 0 ? filteredNewHires.map((emp: any, i: number) => {
                        const birthDate = parseDate(getProp(emp, PROP_NAISSANCE));
                        const age = birthDate ? Math.floor((new Date().getTime() - birthDate.getTime()) / (1000 * 3600 * 24 * 365.25)) : "â€”";
                        return (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-500">{getProp(emp, PROP_MATRICULE)}</td>
                            <td className="px-4 py-3 font-bold text-slate-700">{getProp(emp, "Nom")} {getProp(emp, "PrÃ©nom")}</td>
                            <td className="px-4 py-3 text-slate-600">{getProp(emp, PROP_SERVICE)}</td>
                            <td className="px-4 py-3 text-slate-600">{getProp(emp, PROP_FONCTION)}</td>
                            <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] py-0">{getProp(emp, PROP_NIVEAU)}</Badge></td>
                            <td className="px-4 py-3 text-right text-slate-500 font-medium">{age} ans</td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">Aucun recrutement sur cette pÃ©riode</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Departures Table */}
            <Card className="shadow-sm border border-slate-200/60 bg-white overflow-hidden">
              <CardHeader className="bg-rose-50/50 border-b border-slate-100 py-3">
                <CardTitle className="text-sm font-bold text-rose-800 flex items-center gap-2">
                  <UserMinus2 className="h-4 w-4" />
                  Qui a quittÃ© l'organisation sur cette pÃ©riode ? ({filteredDepartures.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                        <th className="px-4 py-3">Matricule</th>
                        <th className="px-4 py-3">Nom Complet</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Motif</th>
                        <th className="px-4 py-3">Grade</th>
                        <th className="px-4 py-3 text-right">AnciennetÃ© (Ans)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredDepartures.length > 0 ? filteredDepartures.map((emp: any, i: number) => {
                        const hireDate = parseDate(getProp(emp, PROP_EMBAUCHE));
                        const departDate = parseDate(getProp(emp, PROP_DEPART));
                        let seniority = "â€”";
                        if (hireDate && departDate) {
                          seniority = ((departDate.getTime() - hireDate.getTime()) / (1000 * 3600 * 24 * 365.25)).toFixed(1);
                        }
                        return (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-500">{getProp(emp, PROP_MATRICULE)}</td>
                            <td className="px-4 py-3 font-bold text-slate-700">{getProp(emp, "Nom")} {getProp(emp, "PrÃ©nom")}</td>
                            <td className="px-4 py-3 text-slate-600">{getProp(emp, PROP_SERVICE)}</td>
                            <td className="px-4 py-3 text-rose-600 font-medium">{getProp(emp, PROP_CAUSE_DEPART)}</td>
                            <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] py-0">{getProp(emp, PROP_NIVEAU)}</Badge></td>
                            <td className="px-4 py-3 text-right text-slate-500 font-medium">{seniority} ans</td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">Aucun dÃ©part sur cette pÃ©riode</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="absenteeism" className="space-y-6">
          <Dashboard startDate={startDate} endDate={endDate} rhData={rhData} />
        </TabsContent>

        <TabsContent value="workforce_detail" className="space-y-6">
          <WorkforceDetail rhData={rhData} />
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border border-slate-200/60 bg-white">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Niveau d'Ã‰tudes / Formation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={educationStats} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value">
                        {educationStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-slate-200/60 bg-white">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  RÃ©partition par AnciennetÃ©
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seniorityStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="hsl(150, 60%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border border-slate-200/60 bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Effectifs par DÃ©partement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {genderStats.byService.map((srv) => (
                  <div 
                    key={srv.name} 
                    onClick={() => setSelectedService(srv.name)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer group",
                      selectedService === srv.name 
                        ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" 
                        : "bg-slate-50/50 border-slate-100 hover:border-primary/30 hover:bg-white"
                    )}
                  >
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{srv.name}</p>
                    <div className="text-xl font-black">{srv.total}</div>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-rose-500 font-bold">{srv.pctF.toFixed(0)}% F</span>
                      <span className="text-blue-500 font-bold">{100 - Math.round(srv.pctF)}% H</span>
                    </div>
                    <div className="h-1 w-full bg-blue-100 rounded-full mt-1.5 overflow-hidden flex">
                      <div className="bg-rose-500 h-full" style={{ width: `${srv.pctF}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="turnover" className="space-y-6">
          <Card className="shadow-sm border border-slate-200/60 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Flux Mensuel : Recrutements vs DÃ©parts (12 derniers mois)
                </div>
                <div className="flex items-center gap-4 text-[10px] font-normal">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> Embauches</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-500 rounded-full" /> DÃ©parts</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-400 rounded-full" /> Solde Net</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={fluxData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="net" name="Solde (Flux Net)" fill="#94a3b8" opacity={0.2} barSize={40} />
                    <Line type="monotone" dataKey="hires" name="Recrutements" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="departures" name="DÃ©parts" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border border-slate-200/60 bg-white">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserMinus2 className="h-4 w-4 text-rose-500" />
                  Causes des DÃ©parts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {departureCauses.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={departureCauses} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {departureCauses.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                      Aucun dÃ©part enregistrÃ© sur cette pÃ©riode
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Analyse des Mouvements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg"><UserPlus2 className="h-4 w-4 text-emerald-600" /></div>
                    <span className="text-sm font-medium">Taux d'Embauche</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">
                    {countAtEnd > 0 ? ((newHires.length / countAtEnd) * 100).toFixed(1) : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 rounded-lg"><UserMinus2 className="h-4 w-4 text-rose-600" /></div>
                    <span className="text-sm font-medium">Taux de DÃ©part (Rotation)</span>
                  </div>
                  <span className="text-lg font-bold text-rose-600">
                    {countAtEnd > 0 ? ((departuresList.length / countAtEnd) * 100).toFixed(1) : 0}%
                  </span>
                </div>

                <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                  <h5 className="text-xs font-black uppercase tracking-widest text-primary mb-2">Note de SynthÃ¨se</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    Un taux de rotation infÃ©rieur Ã  5% est gÃ©nÃ©ralement considÃ©rÃ© comme un signe de bonne rÃ©tention. 
                    Actuellement, la tendance est {departuresList.length > newHires.length ? "Ã  la baisse d'effectif" : "Ã  la croissance"}.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-[10px] text-muted-foreground text-center font-medium uppercase tracking-widest opacity-50">
        NCM CÃ©ramique Â· SystÃ¨me de Reporting RH Â· DerniÃ¨re mise Ã  jour: {formatDate(new Date(), "dd/MM/yyyy HH:mm")}
      </p>


    </div>
  );
}

