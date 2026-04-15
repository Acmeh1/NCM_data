import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { parseISO, format as formatISO, startOfDay, endOfDay, subDays, differenceInDays } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import formatData from "@/data/Format.json";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line,
} from "recharts";
import {
  Factory, TrendingUp, Package, BarChart3,
  Activity, Layers, Target, Settings2, CalendarDays
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MonthlyComparisonView from "@/components/MonthlyComparisonView";
import MonthlyGroupDashboard from "@/components/MonthlyGroupDashboard";
import AnalyticsFilterBar, { type AggregationType, type DisplayType } from "@/components/AnalyticsFilterBar";
import DateRangeFilter, { type DateRange } from "@/components/DateRangeFilter";
import ScrapRateKpiCard from "@/components/ScrapRateKpiCard";
import RendementKpiCard from "@/components/RendementKpiCard";
import VolumeProduitsKpiCard from "@/components/VolumeProduitsKpiCard";
import MachineUtilizationKpiCard from "@/components/MachineUtilizationKpiCard";
import FormatQualitePanel from "@/components/FormatQualitePanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useKpiSettings } from "@/hooks/useKpiSettings";

const COLORS = [
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(45, 80%, 55%)",
  "hsl(340, 65%, 50%)",
  "hsl(270, 55%, 55%)",
  "hsl(20, 75%, 55%)",
];

type AggPeriod = "day" | "week" | "month";

const WIDGET_OPTIONS = [
  { id: "kpis", label: "KPIs (Production, Pressage, Cuisson...)" },
  { id: "trend", label: "Nb Pièces Four vs Total Pièces" },
  { id: "groupe", label: "Production par Groupe" },
  { id: "choix", label: "Qualité Choix 1/2/3" },
] as const;

type WidgetId = (typeof WIDGET_OPTIONS)[number]["id"];


const DAILY_M2_OBJECTIVE = 8000;
// FIX 2: Objectif mensuel fixe à 240 000 m² (au lieu de 8000 * jours du mois)
const MONTHLY_M2_OBJECTIVE = 240000;

function getWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-S${String(week).padStart(2, "0")}`;
}

function getMonth(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

function aggregateKey(dateStr: string, period: AggPeriod): string {
  if (period === "week") return getWeek(dateStr);
  if (period === "month") return getMonth(dateStr);
  return dateStr;
}

function periodLabel(period: AggPeriod): string {
  if (period === "week") return "Semaine";
  if (period === "month") return "Mois";
  return "Jour";
}

function objectiveForPeriodKey(period: AggPeriod, key: string): number {
  if (period === "day") return DAILY_M2_OBJECTIVE;
  if (period === "week") return DAILY_M2_OBJECTIVE * 7;
  // FIX 2: objectif mensuel fixe 240 000 m²
  return MONTHLY_M2_OBJECTIVE;
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function AnalyticsDashboard() {
  const queryClient = useQueryClient();
  const { dashboard, isAdmin, loading: permLoading } = usePermissions();
  const { kpiObjectives } = useKpiSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL synced state
  const startDateParam = searchParams.get("startDate") || formatISO(subDays(new Date(), 29), "yyyy-MM-dd");
  const endDateParam = searchParams.get("endDate") || formatISO(new Date(), "yyyy-MM-dd");
  const period = (searchParams.get("period") || "day") as AggPeriod;
  const activePreset = searchParams.get("preset") || "30d";
  const selectedGroups = searchParams.get("groups")?.split(",").filter(Boolean) || [];
  const displayType = (searchParams.get("display") || "Graphiques") as DisplayType;

  const currentRange: DateRange = {
    from: parseISO(startDateParam),
    to: parseISO(endDateParam)
  };

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  
  const updateUrlParams = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  // Previous period for variation analysis
  const duration = differenceInDays(currentRange.to, currentRange.from) + 1;
  const prevStartDate = formatISO(subDays(currentRange.from, duration), "yyyy-MM-dd");
  const prevEndDate = formatISO(subDays(currentRange.from, 1), "yyyy-MM-dd");

  const [visibleWidgets, setVisibleWidgets] = useState<Set<WidgetId>>(
    new Set(["kpis", "trend", "groupe", "choix"])
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusedKpi, setFocusedKpi] = useState<string | null>(null);

  // Realtime: auto-refresh when production data changes
  useEffect(() => {
    const channel = supabase
      .channel("analytics-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_journalier" }, () => {
        queryClient.invalidateQueries({ queryKey: ["analytics-journalier"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "production_emballage" }, () => {
        queryClient.invalidateQueries({ queryKey: ["analytics-emballage"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const toggleWidget = (id: WidgetId) => {
    setVisibleWidgets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fetch data
  const { data: journalierFull = [] } = useQuery({
    queryKey: ["analytics-journalier-full", prevStartDate, endDateParam],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_journalier")
        .select(`
          id, date, horaire, heure_debut, heure_fin, groupe, chef_equipe, 
          modele, couleur, format, choix_1_m2, choix_2_m2, choix_3_m2, 
          total_m2, pressage_m2, Project_m2, emaillage_m2, 
          cycle_min, nb_pieces_four, surface_car_m2, cuisson_m2, 
          four_minutes_vides, four_consommation_kwh, created_at
        `)
        .gte("date", prevStartDate)
        .lte("date", endDateParam)
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const journalier = useMemo(() => {
    return journalierFull.filter(r => r.date >= startDateParam && r.date <= endDateParam);
  }, [journalierFull, startDateParam, endDateParam]);

  const { data: emballage = [] } = useQuery({
    queryKey: ["analytics-emballage", startDateParam, endDateParam],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_emballage")
        .select("id, date, choice_type, surface_totale_m2, reste_m2, nb_palette")
        .gte("date", startDateParam)
        .lte("date", endDateParam)
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: statsLinea = [] } = useQuery({
    queryKey: ["analytics-stats-linea", startDateParam, endDateParam],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stats_linea")
        .select(`
          id, production_id, total_surface_m2, choix1_surface_m2, choix2_surface_m2, choix3_surface_m2,
          production_date
        `)
        .gte("production_date", startDateParam)
        .lte("production_date", endDateParam)
        .order("production_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch previous period scrap data for variation
  const { data: statsLineaPrev = [] } = useQuery({
    queryKey: ["analytics-stats-linea-prev", prevStartDate, prevEndDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stats_linea")
        .select(`
          id, total_surface_m2, choix2_surface_m2, choix3_surface_m2,
          production_date
        `)
        .gte("production_date", prevStartDate)
        .lte("production_date", prevEndDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Build calendar slicers from data
  const calendarSlicers = useMemo(() => {
    const allDates = [
      ...journalier.map((r) => r.date),
      ...emballage.map((r: any) => r.date).filter(Boolean),
    ].filter(Boolean) as string[];

    const years = [...new Set(allDates.map((d) => d.slice(0, 4)))].sort();
    const months = [...new Set(allDates.map((d) => {
      const m = parseInt(d.slice(5, 7), 10);
      return String(m);
    }))].sort((a, b) => parseInt(a) - parseInt(b));
    const weeks = [...new Set(allDates.map((d) => getWeek(d)))].sort();
    const days = [...new Set(allDates)].sort();

    return { years, months, weeks, days };
  }, [journalier, emballage]);

  // Filters
  const filteredJournalier = useMemo(() => {
    return journalier.filter((r) => {
      if (selectedGroups.length > 0 && !selectedGroups.includes(r.groupe)) return false;
      return true;
    });
  }, [journalier, selectedGroups]);

  const filteredEmballage = useMemo(() => {
    return emballage;
  }, [emballage]);

  // KPIs
  const totalProductionM2 = filteredJournalier.reduce((s, r) => s + (r.total_m2 || 0), 0);
  const totalPressageM2 = filteredJournalier.reduce((s, r) => s + (r.choix_1_m2 || 0), 0);
  const totalDeuxiemeChoixM2 = filteredJournalier.reduce((s, r) => s + (r.choix_2_m2 || 0), 0);
  const totalTroisiemeChoixM2 = filteredJournalier.reduce((s, r) => s + (r.choix_3_m2 || 0), 0);
  const totalPalettes = filteredEmballage.reduce((s, r) => s + (Number(r.nb_palette) || 0), 0);
  const avgCycleMin = filteredJournalier.length
    ? filteredJournalier.reduce((s, r) => s + (r.cycle_min || 0), 0) / filteredJournalier.length
    : 0;



  const totalChoix1 = filteredJournalier.reduce((s, r) => s + (r.choix_1_m2 || 0), 0);
  const totalChoix2 = filteredJournalier.reduce((s, r) => s + (r.choix_2_m2 || 0), 0);
  const totalChoix3 = filteredJournalier.reduce((s, r) => s + (r.choix_3_m2 || 0), 0);
  const choixTotal = totalChoix1 + totalChoix2 + totalChoix3;
  const choixPieData = [
    { name: "Choix 1", value: totalChoix1, pct: choixTotal ? ((totalChoix1 / choixTotal) * 100).toFixed(1) : "0" },
    { name: "Choix 2", value: totalChoix2, pct: choixTotal ? ((totalChoix2 / choixTotal) * 100).toFixed(1) : "0" },
    { name: "Choix 3", value: totalChoix3, pct: choixTotal ? ((totalChoix3 / choixTotal) * 100).toFixed(1) : "0" },
  ];

  const choixByPeriod = useMemo(() => {
    const map: Record<string, { period: string; choix1: number; choix2: number; choix3: number }> = {};
    filteredJournalier.forEach((r) => {
      const key = aggregateKey(r.date, period);
      if (!map[key]) map[key] = { period: key, choix1: 0, choix2: 0, choix3: 0 };
      map[key].choix1 += r.choix_1_m2 || 0;
      map[key].choix2 += r.choix_2_m2 || 0;
      map[key].choix3 += r.choix_3_m2 || 0;
    });
    return Object.values(map).sort((a, b) => (a.period || "").localeCompare(b.period || ""));
  }, [filteredJournalier, period]);

  const formatSurfaceMap = useMemo(() => {
    const map: Record<string, number> = {};
    (formatData as any[]).forEach((f) => {
      if (f.Format_Nominal && f.Surface_CAR_m2) {
        map[f.Format_Nominal] = parseFloat(f.Surface_CAR_m2) || 0;
      }
    });
    return map;
  }, []);

  const trendData = useMemo(() => {
    const map: Record<string, { period: string; total_m2: number; sumDailyObj: number; shiftCount: number }> = {};
    
    filteredJournalier.forEach((r) => {
      const key = aggregateKey(r.date, period);
      if (!map[key]) {
        map[key] = { period: key, total_m2: 0, sumDailyObj: 0, shiftCount: 0 };
      }
      map[key].total_m2 += Number(r.total_m2) || 0;
      
      const format = String(r.format || r.modele || "").trim();
      let dailyObj = 8000;
      if (format.includes("45*45")) dailyObj = 8500;
      else if (format.includes("60*30") || format.includes("30*60")) dailyObj = 9100;
      
      map[key].sumDailyObj += dailyObj;
      map[key].shiftCount += 1;
    });
    
    return Object.values(map).map(entry => {
      const avgDailyObj = entry.shiftCount > 0 ? entry.sumDailyObj / entry.shiftCount : 8000;
      let finalObj = avgDailyObj;
      if (period === "week") finalObj = avgDailyObj * 7;
      else if (period === "month") finalObj = avgDailyObj * 30;
      
      if (selectedGroups.length > 0 && selectedGroups.length < 3) {
        finalObj = finalObj * (selectedGroups.length / 3);
      }
      
      return {
        period: entry.period,
        total_m2: entry.total_m2,
        objectif: finalObj
      };
    }).sort((a, b) => (a.period || "").localeCompare(b.period || ""));
  }, [filteredJournalier, period, selectedGroups]);

  const groupeData = useMemo(() => {
    const map: Record<string, { groupe: string; total_m2: number; choix1: number; choix2: number; choix3: number }> = {};
    filteredJournalier.forEach((r) => {
      if (!map[r.groupe]) map[r.groupe] = { groupe: r.groupe, total_m2: 0, choix1: 0, choix2: 0, choix3: 0 };
      map[r.groupe].total_m2 += r.total_m2 || 0;
      map[r.groupe].choix1 += r.choix_1_m2 || 0;
      map[r.groupe].choix2 += r.choix_2_m2 || 0;
      map[r.groupe].choix3 += r.choix_3_m2 || 0;
    });
    return Object.values(map).sort((a, b) => (a.groupe || "").localeCompare(b.groupe || ""));
  }, [filteredJournalier]);



  const groupes = [...new Set(journalier.map((r) => r.groupe))].filter(Boolean).sort();

  // Scrap Rate Calculations
  // Data source: stats_linea table, filtered by production_date (new column you added)
  // Formula: (choix2_surface_m2 + choix3_surface_m2) / total_surface_m2 * 100
  const scrapMetrics = useMemo(() => {
    const calcRate = (entries: any[]) => {
      const total = entries.reduce((s, r) => s + (Number(r.total_surface_m2) || 0), 0);
      const c2 = entries.reduce((s, r) => s + (Number(r.choix2_surface_m2) || 0), 0);
      const c3 = entries.reduce((s, r) => s + (Number(r.choix3_surface_m2) || 0), 0);
      const scrap = c2 + c3;
      return { 
        rate: total > 0 ? (scrap / total) * 100 : 0, 
        total, 
        c2Pct: total > 0 ? (c2 / total) * 100 : 0, 
        c3Pct: total > 0 ? (c3 / total) * 100 : 0 
      };
    };

    const current = calcRate(statsLinea);
    const prev = calcRate(statsLineaPrev);
    const variation = prev.rate > 0 ? ((current.rate - prev.rate) / prev.rate) * 100 : 0;

    // Daily trend from current period
    const trendMap: Record<string, { total: number; scrap: number }> = {};
    statsLinea.forEach(r => {
      const d = r.production_date;
      if (!d) return;
      if (!trendMap[d]) trendMap[d] = { total: 0, scrap: 0 };
      trendMap[d].total += Number(r.total_surface_m2) || 0;
      trendMap[d].scrap += (Number(r.choix2_surface_m2) || 0) + (Number(r.choix3_surface_m2) || 0);
    });

    const trendData = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        rate: vals.total > 0 ? (vals.scrap / vals.total) * 100 : 0
      }));

    return { ...current, variation, trendData };
  }, [statsLinea, statsLineaPrev]);

  // ── Volume Produit Calculations ──────────────────────────────────────────
  // Formula: Somme cuisson_m2 de production_journalier sur la période
  const volumeMetrics = useMemo(() => {
    // Current period total
    const totalVolume = filteredJournalier.reduce((s, r) => s + (Number(r.cuisson_m2) || 0), 0);

    // Previous period: rows in journalierFull that fall in [prevStartDate, prevEndDate]
    const prevRows = journalierFull.filter(
      (r) => r.date >= prevStartDate && r.date <= prevEndDate
    );
    const prevVolume = prevRows.reduce((s, r) => s + (Number(r.cuisson_m2) || 0), 0);

    // Daily trend
    const trendMap: Record<string, number> = {};
    filteredJournalier.forEach((r) => {
      const d = r.date;
      if (!d) return;
      trendMap[d] = (trendMap[d] || 0) + (Number(r.cuisson_m2) || 0);
    });
    const trendData = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));

    // Group breakdown
    const groupMap: Record<string, number> = {};
    filteredJournalier.forEach((r) => {
      const g = r.groupe || "N/A";
      groupMap[g] = (groupMap[g] || 0) + (Number(r.cuisson_m2) || 0);
    });
    const groupBreakdown = Object.entries(groupMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({
        label,
        value,
        pct: totalVolume > 0 ? (value / totalVolume) * 100 : 0,
      }));

    const periodDays = duration;

    return { totalVolume, prevVolume, trendData, groupBreakdown, periodDays };
  }, [filteredJournalier, journalierFull, prevStartDate, prevEndDate, duration]);

  // Rendement Calculations
  // Formula: choix1_surface_m2 / total_surface_m2 * 100
  const rendementMetrics = useMemo(() => {
    const calcR = (entries: any[]) => {
      const total = entries.reduce((s, r) => s + (Number(r.total_surface_m2) || 0), 0);
      const c1 = entries.reduce((s, r) => s + (Number(r.choix1_surface_m2) || 0), 0);
      return {
        rate: total > 0 ? (c1 / total) * 100 : 0,
        choix1Pct: total > 0 ? (c1 / total) * 100 : 0,
        nonChoix1Pct: total > 0 ? ((total - c1) / total) * 100 : 0,
      };
    };

    const current = calcR(statsLinea);
    const prev = calcR(statsLineaPrev);
    const variation = prev.rate > 0 ? ((current.rate - prev.rate) / prev.rate) * 100 : 0;

    const trendMap: Record<string, { total: number; c1: number }> = {};
    statsLinea.forEach(r => {
      const d = r.production_date;
      if (!d) return;
      if (!trendMap[d]) trendMap[d] = { total: 0, c1: 0 };
      trendMap[d].total += Number(r.total_surface_m2) || 0;
      trendMap[d].c1 += Number(r.choix1_surface_m2) || 0;
    });

    const trendData = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        rate: vals.total > 0 ? (vals.c1 / vals.total) * 100 : 0
      }));

    return { ...current, variation, trendData };
  }, [statsLinea, statsLineaPrev]);


  // ── Machine Utilization Calculations ────────────────────────────────────
  const utilizationMetrics = useMemo(() => {
    const calcRate = (entries: any[], days: number) => {
      const totalAvailableHours = days * 24;
      const totalEmptyMinutes = entries.reduce((s, r) => s + (Number(r.four_minutes_vides) || 0), 0);
      const totalEmptyHours = totalEmptyMinutes / 60;
      const totalProductionHours = Math.max(0, totalAvailableHours - totalEmptyHours);
      
      return { 
        rate: totalAvailableHours > 0 ? (totalProductionHours / totalAvailableHours) * 100 : 0, 
        totalAvailableHours, 
        totalProductionHours 
      };
    };

    const current = calcRate(filteredJournalier, duration);
    
    const prevRows = journalierFull.filter(
      (r) => r.date >= prevStartDate && r.date <= prevEndDate
    );
    const prev = calcRate(prevRows, duration);

    // Daily trend
    const trendMap: Record<string, number> = {};
    filteredJournalier.forEach(r => {
      const d = r.date;
      if (!d) return;
      const dayEmptyMins = (Number(r.four_minutes_vides) || 0);
      const dayProdHours = Math.max(0, 24 - (dayEmptyMins / 60));
      const dayRate = (dayProdHours / 24) * 100;
      
      // If multiple records for same day, we should technically average them or sum them correctly.
      // Logic: (24 - sum_vides/60) / 24 * 100
      if (!trendMap[d]) trendMap[d] = 0;
      trendMap[d] += dayEmptyMins;
    });

    const trendData = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, totalEmptyMinsForDay]) => {
        const rate = Math.max(0, (24 - (totalEmptyMinsForDay / 60)) / 24) * 100;
        return { date, rate };
      });

    return { 
      rate: current.rate, 
      prevRate: prev.rate, 
      trendData,
      totalAvailableHours: current.totalAvailableHours,
      totalProductionHours: current.totalProductionHours
    };
  }, [filteredJournalier, journalierFull, prevStartDate, prevEndDate, duration]);


  const kpis = [
    { label: "Production totale", value: `${totalProductionM2.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`, icon: Factory, color: "text-blue-600" },
    { label: "1er Choix", value: `${totalPressageM2.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`, icon: Layers, color: "text-emerald-600" },
    { label: "2ème Choix", value: `${totalDeuxiemeChoixM2.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`, icon: Activity, color: "text-orange-600" },
    { label: "3ème Choix", value: `${totalTroisiemeChoixM2.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`, icon: Package, color: "text-purple-600" },
  ];

  if (permLoading) return <p className="text-muted-foreground p-8">Chargement…</p>;
  if (!dashboard && !isAdmin) return <p className="text-destructive p-8">Vous n'avez pas accès au tableau de bord.</p>;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="realtime" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Analytics</h1>
              <p className="text-sm text-muted-foreground">Vue d'ensemble de la production</p>
            </div>
          </div>
          <TabsList>
            <TabsTrigger value="realtime" className="gap-2">
              <Activity className="h-4 w-4" /> Vue Temps Réel
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <CalendarDays className="h-4 w-4" /> Comparaison Mensuelle
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="realtime" className="space-y-6 mt-0">
          <div className="bg-card p-4 rounded-xl border shadow-sm">
            <DateRangeFilter
              range={currentRange}
              onRangeChange={(newRange, presetId) => {
                updateUrlParams({
                  startDate: formatISO(newRange.from, "yyyy-MM-dd"),
                  endDate: formatISO(newRange.to, "yyyy-MM-dd"),
                  preset: presetId || "custom"
                });
              }}
              granularity={period}
              onGranularityChange={(g) => updateUrlParams({ period: g })}
              activePreset={activePreset}
            />
          </div>

          <AnalyticsFilterBar
            selectedGroups={selectedGroups}
            onGroupsChange={(groups) => updateUrlParams({ groups: groups.join(",") })}
            displayType={displayType}
            onDisplayTypeChange={(d) => updateUrlParams({ display: d })}
          />

          {/* KPIs */}
          {(displayType === "KPIs" || displayType === "Graphiques") && visibleWidgets.has("kpis") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6 pt-2">
              {[
                { 
                  id: "volume", 
                  component: VolumeProduitsKpiCard, 
                  props: {
                    totalVolume: volumeMetrics.totalVolume,
                    prevVolume: volumeMetrics.prevVolume,
                    trendData: volumeMetrics.trendData,
                    groupBreakdown: volumeMetrics.groupBreakdown,
                    periodDays: volumeMetrics.periodDays,
                  } 
                },
                { 
                  id: "rendement", 
                  component: RendementKpiCard, 
                  props: {
                    currentRate: rendementMetrics.rate,
                    variation: rendementMetrics.variation,
                    trendData: rendementMetrics.trendData,
                    choix1Pct: rendementMetrics.choix1Pct,
                    nonChoix1Pct: rendementMetrics.nonChoix1Pct,
                    recordCount: statsLinea.length,
                  } 
                },
                { 
                  id: "scrap", 
                  component: ScrapRateKpiCard, 
                  props: {
                    currentRate: scrapMetrics.rate,
                    variation: scrapMetrics.variation,
                    trendData: scrapMetrics.trendData,
                    choix2Pct: scrapMetrics.c2Pct,
                    choix3Pct: scrapMetrics.c3Pct,
                    recordCount: statsLinea.length,
                  } 
                },
                { 
                  id: "utilization", 
                  component: MachineUtilizationKpiCard, 
                  props: {
                    currentRate: utilizationMetrics.rate,
                    prevRate: utilizationMetrics.prevRate,
                    trendData: utilizationMetrics.trendData,
                    totalAvailableHours: utilizationMetrics.totalAvailableHours,
                    totalProductionHours: utilizationMetrics.totalProductionHours,
                  } 
                }
              ].map((kpi) => {
                const isFocused = focusedKpi === kpi.id;
                const Component = kpi.component;
                const kpiConfig = kpiObjectives.find((k) => k.id === kpi.id);
                const extraProps: Record<string, unknown> = kpiConfig
                  ? { objective: kpiConfig.objective, formula: kpiConfig.formula }
                  : {};
                return (
                  <div
                    key={kpi.id}
                    className={cn(
                      "transition-all duration-500 ease-out cursor-pointer relative",
                      isFocused 
                        ? "scale-[1.03] z-20 shadow-2xl" 
                        : "scale-100 z-10 hover:scale-[1.015] hover:z-15"
                    )}
                    onMouseEnter={() => setFocusedKpi(kpi.id)}
                    onMouseLeave={() => setFocusedKpi(null)}
                    onClick={() => setFocusedKpi(focusedKpi === kpi.id ? null : kpi.id)}
                  >
                    <Component {...kpi.props as any} {...extraProps} />
                    {isFocused && (
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 -z-10" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Format Quality Panel */}
          {(displayType === "KPIs" || displayType === "Graphiques") && (
            <FormatQualitePanel 
              data={filteredJournalier} 
              startDate={startDateParam}
              endDate={endDateParam}
            />
          )}

          {/* Charts Section */}
          {displayType === "Graphiques" && (
            <>
              {/* Production (m²) vs Objectif */}
              {visibleWidgets.has("trend") && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Production (m²) par {periodLabel(period)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={period === "day" ? -45 : 0} textAnchor={period === "day" ? "end" : "middle"} height={period === "day" ? 60 : 30} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR", {maximumFractionDigits: 0}) + " m²"} />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="total_m2" name="Total m² (Journalier)" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                        <Line type="monotone" dataKey="objectif" name="Objectif" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      L'objectif de production s'adapte dynamiquement selon les modèles (ex: 45*45 ➔ 8500 m²/j) et se divise proportionnellement lorsqu'un groupe spécifique est sélectionné (divisé par 3).
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Production by Groupe */}
                {visibleWidgets.has("groupe") && (
                  <div className="col-span-1 lg:col-span-2">
                    <Card>
                      <CardContent className="pt-6">
                        <MonthlyGroupDashboard />
                      </CardContent>
                    </Card>
                  </div>
                )}


              </div>

              {/* Choix by period */}
              {visibleWidgets.has("choix") && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Choix 1 / 2 / 3 par {periodLabel(period)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={choixByPeriod}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={period === "day" ? -45 : 0} textAnchor={period === "day" ? "end" : "middle"} height={period === "day" ? 60 : 30} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="choix1" name="Choix 1" fill={COLORS[1]} stackId="a" />
                        <Bar dataKey="choix2" name="Choix 2" fill={COLORS[2]} stackId="a" />
                        <Bar dataKey="choix3" name="Choix 3" fill={COLORS[3]} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}


            </>
          )}

          {/* Tableau View */}
          {displayType === "Tableau" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Données détaillées par {periodLabel(period)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50 text-[11px] uppercase tracking-wider">
                      <TableRow>
                        <TableHead className="w-[120px] font-bold">Période</TableHead>
                        <TableHead className="text-right font-bold">Production (m²)</TableHead>
                        <TableHead className="text-right font-bold">Choix 1 (m²)</TableHead>
                        <TableHead className="text-right font-bold">Choix 2 (m²)</TableHead>
                        <TableHead className="text-right font-bold">Choix 3 (m²)</TableHead>
                        <TableHead className="text-right font-bold">Objectif (m²)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {choixByPeriod.map((row) => {
                        const trendRow = trendData.find(t => t.period === row.period);
                        return (
                          <TableRow key={row.period} className="hover:bg-muted/30">
                            <TableCell className="text-xs font-medium">{row.period}</TableCell>
                            <TableCell className="text-right text-xs font-semibold">{(trendRow?.total_m2 || 0).toLocaleString("fr-FR")}</TableCell>
                            <TableCell className="text-right text-xs text-emerald-600 font-medium">{row.choix1.toLocaleString("fr-FR")}</TableCell>
                            <TableCell className="text-right text-xs text-orange-600">{row.choix2.toLocaleString("fr-FR")}</TableCell>
                            <TableCell className="text-right text-xs text-rose-600">{row.choix3.toLocaleString("fr-FR")}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground italic">{(trendRow?.objectif || 0).toLocaleString("fr-FR", {maximumFractionDigits: 0})}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {filteredJournalier.length} enregistrements · {statsLinea.length} stats qualité · Agrégation: {periodLabel(period)}
          </p>
        </TabsContent>

        <TabsContent value="monthly" className="mt-0">
          <MonthlyComparisonView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
