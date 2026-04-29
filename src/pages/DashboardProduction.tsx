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
   Activity, Layers, Target, Settings2, CalendarDays, Gauge, ChevronDown, ChevronUp,
   Wind, Flame, Share2
 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MonthlyComparisonView from "@/components/MonthlyComparisonView";
import MonthlyGroupDashboard from "@/components/MonthlyGroupDashboard";
import AnalyticsFilterBar, { type AggregationType, type DisplayType } from "@/components/AnalyticsFilterBar";
import DateRangeFilter, { type DateRange } from "@/components/DateRangeFilter";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import ScrapRateKpiCard from "@/components/ScrapRateKpiCard";
import RendementKpiCard from "@/components/RendementKpiCard";
import VolumeProduitsKpiCard from "@/components/VolumeProduitsKpiCard";
import MachineUtilizationKpiCard from "@/components/MachineUtilizationKpiCard";
import FormatQualitePanel from "@/components/FormatQualitePanel";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default function DashboardProduction() {
  const queryClient = useQueryClient();
  const { dashboard, isAdmin, loading: permLoading } = usePermissions();
  const { kpiObjectives } = useKpiSettings();
  
  const { 
    startDate: startDateParam, endDate: endDateParam, currentRange, period, activePreset, 
    selectedGroups, displayType, setRange, setPeriod, setGroups, setDisplayType 
  } = useDashboardFilters();

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  
  // Previous period for variation analysis
  const duration = differenceInDays(currentRange.to, currentRange.from) + 1;
  const prevStartDate = formatISO(subDays(currentRange.from, duration), "yyyy-MM-dd");
  const prevEndDate = formatISO(subDays(currentRange.from, 1), "yyyy-MM-dd");

  const [visibleWidgets, setVisibleWidgets] = useState<Set<WidgetId>>(
    new Set(["kpis", "trend", "groupe", "choix"])
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showProductionDetails, setShowProductionDetails] = useState(false);
  const [showQualityDetails, setShowQualityDetails] = useState(false);
  const [showFluxDetails, setShowFluxDetails] = useState(false);
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
  const totalProductionM2 = statsLinea.reduce((s, r) => s + (Number(r.total_surface_m2) || 0), 0);
  const totalPressageM2 = statsLinea.reduce((s, r) => s + (Number(r.choix1_surface_m2) || 0), 0);
  const totalDeuxiemeChoixM2 = statsLinea.reduce((s, r) => s + (Number(r.choix2_surface_m2) || 0), 0);
  const totalTroisiemeChoixM2 = statsLinea.reduce((s, r) => s + (Number(r.choix3_surface_m2) || 0), 0);
  const totalPalettes = filteredEmballage.reduce((s, r) => s + (Number(r.nb_palette) || 0), 0);
  const avgCycleMin = filteredJournalier.length
    ? filteredJournalier.reduce((s, r) => s + (r.cycle_min || 0), 0) / filteredJournalier.length
    : 0;



  const totalChoix1 = totalPressageM2;
  const totalChoix2 = totalDeuxiemeChoixM2;
  const totalChoix3 = totalTroisiemeChoixM2;
  const choixTotal = totalChoix1 + totalChoix2 + totalChoix3;
  const choixPieData = [
    { name: "Choix 1", value: totalChoix1, pct: choixTotal ? ((totalChoix1 / choixTotal) * 100).toFixed(1) : "0" },
    { name: "Choix 2", value: totalChoix2, pct: choixTotal ? ((totalChoix2 / choixTotal) * 100).toFixed(1) : "0" },
    { name: "Choix 3", value: totalChoix3, pct: choixTotal ? ((totalChoix3 / choixTotal) * 100).toFixed(1) : "0" },
  ];

  const choixByPeriod = useMemo(() => {
    const map: Record<string, { period: string; choix1: number; choix2: number; choix3: number; hasScanner: boolean; cuisson: number }> = {};
    
    // Process journalier first
    filteredJournalier.forEach((r) => {
      const key = aggregateKey(r.date, period);
      if (!map[key]) map[key] = { period: key, choix1: 0, choix2: 0, choix3: 0, hasScanner: false, cuisson: 0 };
      map[key].cuisson += Number(r.cuisson_m2) || 0;
    });

    statsLinea.forEach((r) => {
      const key = aggregateKey(r.production_date || "", period);
      if (!map[key]) map[key] = { period: key, choix1: 0, choix2: 0, choix3: 0, hasScanner: false, cuisson: 0 };
      map[key].choix1 += Number(r.choix1_surface_m2) || 0;
      map[key].choix2 += Number(r.choix2_surface_m2) || 0;
      map[key].choix3 += Number(r.choix3_surface_m2) || 0;
      map[key].hasScanner = true;
    });

    return Object.values(map).map(entry => {
      const isFallback = !entry.hasScanner && entry.cuisson > 0;
      return {
        period: entry.period,
        choix1: isFallback ? entry.cuisson : entry.choix1,
        choix2: entry.choix2,
        choix3: entry.choix3,
        isFallback
      };
    }).sort((a, b) => (a.period || "").localeCompare(b.period || ""));
  }, [statsLinea, filteredJournalier, period]);

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
    const map: Record<string, { period: string; total_m2_scanner: number; total_m2_cuisson: number; sumDailyObj: number; shiftCount: number }> = {};
    
    // 1. Production Actuals from Scanner (statsLinea)
    statsLinea.forEach((r) => {
      const key = aggregateKey(r.production_date || "", period);
      if (!map[key]) {
        map[key] = { period: key, total_m2_scanner: 0, total_m2_cuisson: 0, sumDailyObj: 0, shiftCount: 0 };
      }
      map[key].total_m2_scanner += Number(r.total_surface_m2) || 0;
    });

    // 2. Objectives calculation from Journalier formats
    filteredJournalier.forEach((r) => {
      const key = aggregateKey(r.date, period);
      if (!map[key]) {
        map[key] = { period: key, total_m2_scanner: 0, total_m2_cuisson: 0, sumDailyObj: 0, shiftCount: 0 };
      }
      map[key].total_m2_cuisson += Number(r.cuisson_m2) || 0;
      
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
      
      const hasScannerData = entry.total_m2_scanner > 0;
      
      return {
        period: entry.period,
        total_m2: hasScannerData ? entry.total_m2_scanner : entry.total_m2_cuisson,
        isFallback: !hasScannerData && entry.total_m2_cuisson > 0,
        objectif: finalObj
      };
    }).sort((a, b) => (a.period || "").localeCompare(b.period || ""));
  }, [statsLinea, filteredJournalier, period, selectedGroups]);

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

  const volumeMetrics = useMemo(() => {
    // Current period total
    const totalVolume = statsLinea.reduce((s, r) => s + (Number(r.total_surface_m2) || 0), 0);

    // Previous period
    const prevVolume = statsLineaPrev.reduce((s, r) => s + (Number(r.total_surface_m2) || 0), 0);

    // Daily trend from statsLinea
    const trendMap: Record<string, number> = {};
    statsLinea.forEach((r) => {
      const d = r.production_date;
      if (!d) return;
      trendMap[d] = (trendMap[d] || 0) + (Number(r.total_surface_m2) || 0);
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
  }, [statsLinea, statsLineaPrev, filteredJournalier, duration]);

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

  const qualityTableData = useMemo(() => {
    const map: Record<string, { period: string; total: number; c1: number; c2: number; c3: number; hasScanner: boolean; cuisson: number }> = {};
    
    // Process journalier for period skeleton and fallback totals
    filteredJournalier.forEach((r) => {
      const key = aggregateKey(r.date, period);
      if (!map[key]) map[key] = { period: key, total: 0, c1: 0, c2: 0, c3: 0, hasScanner: false, cuisson: 0 };
      map[key].cuisson += Number(r.cuisson_m2) || 0;
    });

    statsLinea.forEach((r) => {
      const key = aggregateKey(r.production_date || "", period);
      if (!map[key]) map[key] = { period: key, total: 0, c1: 0, c2: 0, c3: 0, hasScanner: false, cuisson: 0 };
      map[key].total += Number(r.total_surface_m2) || 0;
      map[key].c1 += Number(r.choix1_surface_m2) || 0;
      map[key].c2 += Number(r.choix2_surface_m2) || 0;
      map[key].c3 += Number(r.choix3_surface_m2) || 0;
      map[key].hasScanner = true;
    });

    return Object.values(map)
      .map(entry => {
        const isFallback = !entry.hasScanner && entry.cuisson > 0;
        const total = entry.hasScanner ? entry.total : entry.cuisson;
        const c1 = entry.hasScanner ? entry.c1 : entry.cuisson;
        return {
          ...entry,
          total,
          c1,
          isFallback,
          rendement: total > 0 ? (c1 / total) * 100 : 0,
          rebut: total > 0 ? ((entry.c2 + entry.c3) / total) * 100 : 0
        };
      })
      .sort((a, b) => (a.period || "").localeCompare(b.period || ""));
  }, [statsLinea, filteredJournalier, period]);

  const qualityTotals = useMemo(() => {
    const total = qualityTableData.reduce((s, r) => s + r.total, 0);
    const c1 = qualityTableData.reduce((s, r) => s + r.c1, 0);
    const scrap = qualityTableData.reduce((s, r) => s + (r.c2 + r.c3), 0);
    
    return {
      total,
      c1,
      scrap,
      rendement: total > 0 ? (c1 / total) * 100 : 0,
      rebut: total > 0 ? (scrap / total) * 100 : 0
    };
  }, [qualityTableData]);

  const productionTotals = useMemo(() => {
    const totalM2 = trendData.reduce((s, r) => s + r.total_m2, 0);
    const objective = trendData.reduce((s, r) => s + r.objectif, 0);
    const c1 = choixByPeriod.reduce((s, r) => s + r.choix1, 0);
    const c2 = choixByPeriod.reduce((s, r) => s + r.choix2, 0);
    const c3 = choixByPeriod.reduce((s, r) => s + r.choix3, 0);
    
    return { totalM2, objective, c1, c2, c3 };
  }, [trendData, choixByPeriod]);

  const periodicZoneData = useMemo(() => {
    const map: Record<string, { period: string; press: number; emaillage: number; cuisson: number; scanner: number; hasScanner: boolean }> = {};
    
    // Process journalier data
    filteredJournalier.forEach((r) => {
      const key = aggregateKey(r.date, period);
      if (!map[key]) map[key] = { period: key, press: 0, emaillage: 0, cuisson: 0, scanner: 0, hasScanner: false };
      map[key].press += Number(r.pressage_m2) || 0;
      map[key].emaillage += Number(r.emaillage_m2) || 0;
      map[key].cuisson += Number(r.cuisson_m2) || 0;
    });

    // Process scanner data
    statsLinea.forEach((r) => {
      const key = aggregateKey(r.production_date || "", period);
      if (!map[key]) map[key] = { period: key, press: 0, emaillage: 0, cuisson: 0, scanner: 0, hasScanner: false };
      map[key].scanner += Number(r.total_surface_m2) || 0;
      map[key].hasScanner = true;
    });

    return Object.values(map).map(r => ({
      ...r,
      isFallback: !r.hasScanner && r.cuisson > 0,
      scanner: r.hasScanner ? r.scanner : r.cuisson
    })).sort((a, b) => a.period.localeCompare(b.period));
  }, [filteredJournalier, statsLinea, period]);



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
            <TrendingUp className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Dashboard Production</h1>
              <p className="text-sm text-muted-foreground">Analyse détaillée de la performance ligne</p>
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
              onRangeChange={setRange}
              granularity={period}
              onGranularityChange={setPeriod}
              activePreset={activePreset}
            />
          </div>

          <AnalyticsFilterBar
            selectedGroups={selectedGroups}
            onGroupsChange={setGroups}
            displayType={displayType}
            onDisplayTypeChange={setDisplayType}
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
                    totalC1: totalPressageM2,
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
                    totalScrap: totalDeuxiemeChoixM2 + totalTroisiemeChoixM2,
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
                        <Bar dataKey="total_m2" name="Total m² (Scanner / Four)" radius={[4, 4, 0, 0]}>
                          {trendData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.isFallback ? "#f97316" : COLORS[1]} />
                          ))}
                        </Bar>
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
                        <MonthlyGroupDashboard 
                          startDate={startDateParam} 
                          endDate={endDateParam} 
                        />
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
             <div className="space-y-6">
               {/* New: Production Flow by Zone Table - Moved here */}
               <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                 <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Share2 className="h-4 w-4 text-primary rotate-90" />
                       <CardTitle className="text-sm font-bold">Détails de Flux de Production par Zone</CardTitle>
                     </div>
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       className="h-7 gap-1 text-[10px] hover:bg-muted"
                       onClick={() => setShowFluxDetails(!showFluxDetails)}
                     >
                       {showFluxDetails ? (
                         <>Masquer Détails <ChevronUp className="h-3 w-3" /></>
                       ) : (
                         <>Afficher Détails <ChevronDown className="h-3 w-3" /></>
                       )}
                     </Button>
                   </div>
                 </CardHeader>
                 <CardContent className="p-0">
                   <Table>
                     <TableHeader className="bg-muted/30 text-[10px] uppercase">
                       <TableRow>
                         <TableHead className="font-bold">Période</TableHead>
                         <TableHead className="text-right font-bold text-blue-600">Entrée Presse (m²)</TableHead>
                         <TableHead className="text-right font-bold text-purple-600">Émaillage (m²)</TableHead>
                         <TableHead className="text-right font-bold text-orange-600">Sortie Four (m²)</TableHead>
                         <TableHead className="text-right font-bold text-emerald-600">Scanner m² (Final)</TableHead>
                         <TableHead className="text-right font-bold">Rendement Global</TableHead>
                       </TableRow>
                     </TableHeader>
                     {showFluxDetails && (
                       <TableBody>
                         {periodicZoneData.map((row) => {
                           const rendement = row.press > 0 ? (row.scanner / row.press) * 100 : 0;
                           return (
                             <TableRow key={row.period} className={cn("hover:bg-muted/20 transition-colors", row.isFallback && "bg-orange-50/50 dark:bg-orange-500/5")}>
                               <TableCell className="text-xs font-bold">{row.period}</TableCell>
                               <TableCell className="text-right text-xs font-medium">{row.press.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</TableCell>
                               <TableCell className="text-right text-xs">{row.emaillage.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</TableCell>
                               <TableCell className="text-right text-xs">{row.cuisson.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</TableCell>
                               <TableCell className="text-right text-xs font-bold text-emerald-600">{row.scanner.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</TableCell>
                               <TableCell className="text-right py-2">
                                 <span className={cn(
                                   "text-[10px] font-black px-2 py-0.5 rounded shadow-sm",
                                   rendement > 95 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700"
                                 )}>
                                   {rendement.toFixed(1)}%
                                 </span>
                               </TableCell>
                             </TableRow>
                           );
                         })}
                       </TableBody>
                     )}
                     <TableFooter className="bg-muted/50">
                       <TableRow>
                         <TableCell className="text-xs font-black uppercase">Total</TableCell>
                         <TableCell className="text-right text-xs font-black">
                           {periodicZoneData.reduce((s, r) => s + r.press, 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                         </TableCell>
                         <TableCell className="text-right text-xs font-bold">
                           {periodicZoneData.reduce((s, r) => s + r.emaillage, 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                         </TableCell>
                         <TableCell className="text-right text-xs font-bold">
                           {periodicZoneData.reduce((s, r) => s + r.cuisson, 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                         </TableCell>
                         <TableCell className="text-right text-xs font-black text-emerald-700">
                           {periodicZoneData.reduce((s, r) => s + r.scanner, 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                         </TableCell>
                         <TableCell className="text-right text-xs font-black">
                           {(periodicZoneData.reduce((s, r) => s + r.press, 0) > 0 
                             ? (periodicZoneData.reduce((s, r) => s + r.scanner, 0) / periodicZoneData.reduce((s, r) => s + r.press, 0)) * 100 
                             : 0).toFixed(1)}%
                         </TableCell>
                       </TableRow>
                     </TableFooter>
                   </Table>
                 </CardContent>
               </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Données Production par {periodLabel(period)}</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1 text-[10px] hover:bg-muted"
                      onClick={() => setShowProductionDetails(!showProductionDetails)}
                    >
                      {showProductionDetails ? (
                        <>Masquer Détails <ChevronUp className="h-3 w-3" /></>
                      ) : (
                        <>Afficher Détails <ChevronDown className="h-3 w-3" /></>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50 text-[11px] uppercase tracking-wider">
                        <TableRow>
                          <TableHead className="w-[120px] font-bold">Période</TableHead>
                          <TableHead className="text-right font-bold">Production (m²)</TableHead>
                          <TableHead className="text-right font-bold">Objectif (m²)</TableHead>
                          <TableHead className="text-right font-bold text-blue-600">Écart (m²)</TableHead>
                          <TableHead className="text-right font-bold text-blue-600">Écart (%)</TableHead>
                          <TableHead className="text-right font-bold">Choix 1 (m²)</TableHead>
                          <TableHead className="text-right font-bold">Choix 2 (m²)</TableHead>
                          <TableHead className="text-right font-bold">Choix 3 (m²)</TableHead>
                        </TableRow>
                      </TableHeader>
                      {showProductionDetails && (
                        <TableBody>
                          {choixByPeriod.map((row) => {
                            const trendRow = trendData.find(t => t.period === row.period);
                            const prod = trendRow?.total_m2 || 0;
                            const obj = trendRow?.objectif || 0;
                            const ecartM2 = prod - obj;
                            const ecartPct = obj > 0 ? (ecartM2 / obj) * 100 : 0;
                            return (
                              <TableRow key={row.period} className={cn("hover:bg-muted/30 transition-colors", row.isFallback && "bg-orange-50/50 dark:bg-orange-500/5")}>
                                <TableCell className="text-xs font-medium">{row.period}</TableCell>
                                <TableCell className="text-right text-xs font-semibold">{prod.toLocaleString("fr-FR")}</TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground italic">{obj.toLocaleString("fr-FR", {maximumFractionDigits: 0})}</TableCell>
                                <TableCell className={cn("text-right text-xs font-bold", ecartM2 >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                  {ecartM2 >= 0 ? "+" : ""}{ecartM2.toLocaleString("fr-FR", {maximumFractionDigits: 0})}
                                </TableCell>
                                <TableCell className={cn("text-right text-xs font-black", ecartM2 >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                  {ecartPct >= 0 ? "+" : ""}{ecartPct.toFixed(1)}%
                                </TableCell>
                                <TableCell className="text-right text-xs text-emerald-600 font-medium">{row.choix1.toLocaleString("fr-FR")}</TableCell>
                                <TableCell className="text-right text-xs text-orange-600">{row.choix2.toLocaleString("fr-FR")}</TableCell>
                                <TableCell className="text-right text-xs text-rose-600">{row.choix3.toLocaleString("fr-FR")}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      )}
                      <TableFooter className="bg-muted/30">
                        <TableRow className="hover:bg-transparent">
                          <TableCell className="text-xs font-black uppercase">Total</TableCell>
                          <TableCell className="text-right text-xs font-black">{productionTotals.totalM2.toLocaleString("fr-FR")}</TableCell>
                          <TableCell className="text-right text-xs font-black italic">{productionTotals.objective.toLocaleString("fr-FR", {maximumFractionDigits: 0})}</TableCell>
                          <TableCell className={cn("text-right text-xs font-black", (productionTotals.totalM2 - productionTotals.objective) >= 0 ? "text-emerald-700" : "text-rose-700")}>
                            {(productionTotals.totalM2 - productionTotals.objective) >= 0 ? "+" : ""}
                            {(productionTotals.totalM2 - productionTotals.objective).toLocaleString("fr-FR", {maximumFractionDigits: 0})}
                          </TableCell>
                          <TableCell className={cn("text-right text-xs font-black", (productionTotals.totalM2 - productionTotals.objective) >= 0 ? "text-emerald-700" : "text-rose-700")}>
                            {productionTotals.objective > 0 ? (((productionTotals.totalM2 - productionTotals.objective) / productionTotals.objective) * 100).toFixed(1) : "0"}%
                          </TableCell>
                          <TableCell className="text-right text-xs text-emerald-600 font-black">{productionTotals.c1.toLocaleString("fr-FR")}</TableCell>
                          <TableCell className="text-right text-xs text-orange-600 font-black">{productionTotals.c2.toLocaleString("fr-FR")}</TableCell>
                          <TableCell className="text-right text-xs text-rose-600 font-black">{productionTotals.c3.toLocaleString("fr-FR")}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-sky-100 dark:border-sky-900 shadow-md">
                <CardHeader className="pb-2 bg-sky-50/50 dark:bg-sky-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-sky-600" />
                      <CardTitle className="text-sm">Analyse Détaillée Rendement & Qualité (Scanner)</CardTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1 text-[10px] hover:bg-sky-100 dark:hover:bg-sky-900"
                      onClick={() => setShowQualityDetails(!showQualityDetails)}
                    >
                      {showQualityDetails ? (
                        <>Masquer Détails <ChevronUp className="h-3 w-3" /></>
                      ) : (
                        <>Afficher Détails <ChevronDown className="h-3 w-3" /></>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="rounded-md border border-sky-100 dark:border-sky-900 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-sky-50 dark:bg-sky-950/40 text-[11px] uppercase tracking-wider">
                        <TableRow>
                          <TableHead className="w-[120px] font-bold text-sky-900 dark:text-sky-100">Période</TableHead>
                          <TableHead className="text-right font-bold text-sky-900 dark:text-sky-100">Total Scanner (m²)</TableHead>
                          <TableHead className="text-right font-bold text-sky-900 dark:text-sky-100">Objectif (m²)</TableHead>
                          <TableHead className="text-right font-bold text-sky-900 dark:text-sky-100">1er Choix (m²)</TableHead>
                          <TableHead className="text-right font-bold text-sky-900 dark:text-sky-100">Rendement (%)</TableHead>
                          <TableHead className="text-right font-bold text-sky-900 dark:text-sky-100">Scrap C2+C3 (m²)</TableHead>
                          <TableHead className="text-right font-bold text-sky-900 dark:text-sky-100">Taux Rebut (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      {showQualityDetails && (
                        <TableBody>
                          {qualityTableData.map((row) => (
                            <TableRow key={row.period} className={cn("hover:bg-sky-50/50 dark:hover:bg-sky-900/10 transition-colors", row.isFallback && "bg-orange-50/50 dark:bg-orange-500/5")}>
                              <TableCell className="text-xs font-bold">{row.period}</TableCell>
                              <TableCell className="text-right text-xs">{row.total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground italic">
                                { (trendData.find(t => t.period === row.period)?.objectif || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) }
                              </TableCell>
                              <TableCell className="text-right text-xs text-emerald-600 font-bold">{row.c1.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right text-xs font-black">
                                <span className={cn(
                                  "px-2 py-0.5 rounded",
                                  row.rendement >= 85 ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                                )}>
                                  {row.rendement.toFixed(2)}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-xs text-rose-500">{(row.c2 + row.c3).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right text-xs font-bold text-rose-600">{row.rebut.toFixed(2)}%</TableCell>
                            </TableRow>
                          ))}
                          {qualityTableData.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">
                                Aucune donnée de rendement disponible pour cette période
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      )}
                      {qualityTableData.length > 0 && (
                        <TableFooter className="bg-sky-100/50 dark:bg-sky-900/30">
                          <TableRow className="hover:bg-transparent border-t-2 border-sky-200 dark:border-sky-800">
                            <TableCell className="text-xs font-black text-sky-900 dark:text-sky-100 uppercase">Total</TableCell>
                            <TableCell className="text-right text-xs font-black text-sky-900 dark:text-sky-100">
                              {qualityTotals.total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-xs font-black text-sky-900/60 dark:text-sky-100/60 italic">
                               {productionTotals.objective.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                             </TableCell>
                            <TableCell className="text-right text-xs text-emerald-700 font-black">
                              {qualityTotals.c1.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-xs font-black">
                              <span className={cn(
                                "px-2 py-0.5 rounded shadow-sm text-white",
                                qualityTotals.rendement >= 85 ? "bg-emerald-500" : "bg-orange-500"
                              )}>
                                {qualityTotals.rendement.toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs text-rose-600 font-black">
                              {qualityTotals.scrap.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-xs font-black text-rose-700">
                              {qualityTotals.rebut.toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      )}
                    </Table>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-[10px] text-muted-foreground italic">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span>Rendement ≥ 85% (Objectif)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <span>Taux de Rebut (C2 + C3)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
