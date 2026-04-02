import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
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
  AreaChart, Area, ComposedChart, Line,
} from "recharts";
import {
  Factory, TrendingUp, Package, BarChart3,
  Activity, Layers, Target, Settings2, CalendarDays
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MonthlyComparisonView from "@/components/MonthlyComparisonView";
import MonthlyGroupDashboard from "@/components/MonthlyGroupDashboard";
import AnalyticsFilterBar, { type AggregationType, type DisplayType } from "@/components/AnalyticsFilterBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  { id: "comparaison", label: "Comparaison Production vs Emballage" },
] as const;

type WidgetId = (typeof WIDGET_OPTIONS)[number]["id"];
type ChoixCompare = "choix1" | "choix2" | "choix3";

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
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [dayFrom, setDayFrom] = useState<string>("");
  const [dayTo, setDayTo] = useState<string>("");
  const [period, setPeriod] = useState<AggPeriod>("day");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [displayType, setDisplayType] = useState<DisplayType>("Graphiques");
  const [choixCompare, setChoixCompare] = useState<ChoixCompare>("choix1");
  const [visibleWidgets, setVisibleWidgets] = useState<Set<WidgetId>>(
    new Set(["kpis", "trend", "groupe", "choix", "comparaison"])
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  const { data: journalier = [] } = useQuery({
    queryKey: ["analytics-journalier"],
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
        .limit(5000)
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: emballage = [] } = useQuery({
    queryKey: ["analytics-emballage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_emballage")
        .select("id, date, choice_type, surface_totale_m2, reste_m2, nb_palette")
        .order("date", { ascending: true });
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

  // Filter helper: check if date matches selected slicers
  const matchesSlicers = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    const m = parseInt(dateStr.slice(5, 7), 10);
    const y = dateStr.slice(0, 4);
    if (selectedYear !== "all" && y !== selectedYear) return false;
    if (selectedMonth !== "all" && String(m) !== selectedMonth) return false;
    if (selectedWeek !== "all" && getWeek(dateStr) !== selectedWeek) return false;
    if (dayFrom && dateStr < dayFrom) return false;
    if (dayTo && dateStr > dayTo) return false;
    return true;
  };

  // FIX 1: Correction du filtre date de fin — ne réagit que quand dayFrom change,
  // pas quand dayTo change (évite d'écraser dayTo dès qu'il est saisi)
  useEffect(() => {
    if (dayFrom && dayTo && dayFrom > dayTo) {
      setDayTo(dayFrom);
    }
  }, [dayFrom]); // ← seulement dayFrom, pas [dayFrom, dayTo]

  // Filters
  const filteredJournalier = useMemo(() => {
    return journalier.filter((r) => {
      if (!matchesSlicers(r.date)) return false;
      if (selectedGroups.length > 0 && !selectedGroups.includes(r.groupe)) return false;
      return true;
    });
  }, [journalier, selectedYear, selectedMonth, selectedWeek, dayFrom, dayTo, selectedGroups]);

  const filteredEmballage = useMemo(() => {
    return emballage.filter((r) => {
      if (!matchesSlicers(r.date)) return false;
      return true;
    });
  }, [emballage, selectedYear, selectedMonth, selectedWeek, dayFrom, dayTo]);

  // KPIs
  const totalProductionM2 = filteredJournalier.reduce((s, r) => s + (r.total_m2 || 0), 0);
  const totalPressageM2 = filteredJournalier.reduce((s, r) => s + (r.choix_1_m2 || 0), 0);
  const totalDeuxiemeChoixM2 = filteredJournalier.reduce((s, r) => s + (r.choix_2_m2 || 0), 0);
  const totalTroisiemeChoixM2 = filteredJournalier.reduce((s, r) => s + (r.choix_3_m2 || 0), 0);
  const totalPalettes = filteredEmballage.reduce((s, r) => s + (Number(r.nb_palette) || 0), 0);
  const avgCycleMin = filteredJournalier.length
    ? filteredJournalier.reduce((s, r) => s + (r.cycle_min || 0), 0) / filteredJournalier.length
    : 0;

  // Emballage choix classification helper
  const getEmballageChoix = (choiceType: string): "choix1" | "choix2" | "choix3" | null => {
    const ct = choiceType || "";
    if (["A", "B", "C", "D"].includes(ct)) return "choix1";
    if (ct === "Choix_Commercial") return "choix2";
    if (ct === "Choix_Commercial_Decasse") return "choix3";
    return null;
  };

  const getEmballageM2 = (r: any): number => {
    const choix = getEmballageChoix(r.choice_type);
    if (choix === "choix1") return Number(r.surface_totale_m2) || 0;
    if (choix === "choix2" || choix === "choix3") return Number(r.reste_m2) || 0;
    return 0;
  };

  const embChoix1Total = filteredEmballage.reduce((s, r) => s + (getEmballageChoix(r.choice_type) === "choix1" ? getEmballageM2(r) : 0), 0);
  const embChoix2Total = filteredEmballage.reduce((s, r) => s + (getEmballageChoix(r.choice_type) === "choix2" ? getEmballageM2(r) : 0), 0);
  const embChoix3Total = filteredEmballage.reduce((s, r) => s + (getEmballageChoix(r.choice_type) === "choix3" ? getEmballageM2(r) : 0), 0);
  const totalEmballageM2 = embChoix1Total + embChoix2Total + embChoix3Total;

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

  const comparaisonData = useMemo(() => {
    const map: Record<string, { period: string; prod_c1: number; prod_c2: number; prod_c3: number; emb_c1: number; emb_c2: number; emb_c3: number }> = {};

    filteredJournalier.forEach((r) => {
      const key = aggregateKey(r.date, period);
      if (!map[key]) map[key] = { period: key, prod_c1: 0, prod_c2: 0, prod_c3: 0, emb_c1: 0, emb_c2: 0, emb_c3: 0 };
      map[key].prod_c1 += r.choix_1_m2 || 0;
      map[key].prod_c2 += r.choix_2_m2 || 0;
      map[key].prod_c3 += r.choix_3_m2 || 0;
    });

    filteredEmballage.forEach((r: any) => {
      const date = r.date;
      if (!date) return;
      const key = aggregateKey(date, period);
      if (!map[key]) map[key] = { period: key, prod_c1: 0, prod_c2: 0, prod_c3: 0, emb_c1: 0, emb_c2: 0, emb_c3: 0 };
      const choix = getEmballageChoix(r.choice_type);
      const m2 = getEmballageM2(r);
      if (choix === "choix1") map[key].emb_c1 += m2;
      else if (choix === "choix2") map[key].emb_c2 += m2;
      else if (choix === "choix3") map[key].emb_c3 += m2;
    });

    return Object.values(map).sort((a, b) => (a.period || "").localeCompare(b.period || ""));
  }, [filteredJournalier, filteredEmballage, period]);

  const choixCompareLabels: Record<ChoixCompare, string> = {
    choix1: "1er Choix (Prod) vs A+B+C+D (Emb)",
    choix2: "2ème Choix (Prod) vs Choix Commercial (Emb)",
    choix3: "3ème Choix (Prod) vs Déclassé Commercial (Emb)",
  };

  const groupes = [...new Set(journalier.map((r) => r.groupe))].filter(Boolean).sort();

  const kpis = [
    { label: "Production totale", value: `${totalProductionM2.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`, icon: Factory, color: "text-blue-600" },
    { label: "1er Choix", value: `${totalPressageM2.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`, icon: Layers, color: "text-emerald-600" },
    { label: "2ème Choix", value: `${totalDeuxiemeChoixM2.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`, icon: Activity, color: "text-orange-600" },
    { label: "3ème Choix", value: `${totalTroisiemeChoixM2.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`, icon: Package, color: "text-purple-600" },
    { label: "Palettes", value: totalPalettes.toFixed(0), icon: Target, color: "text-rose-600" },
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
          <AnalyticsFilterBar
            dateFrom={dayFrom}
            onDateFromChange={setDayFrom}
            dateTo={dayTo}
            onDateToChange={setDayTo}
            aggregation={period}
            onAggregationChange={(p) => setPeriod(p)}
            selectedGroups={selectedGroups}
            onGroupsChange={setSelectedGroups}
            displayType={displayType}
            onDisplayTypeChange={setDisplayType}
          />

          {/* KPIs */}
          {(displayType === "KPIs" || displayType === "Graphiques") && visibleWidgets.has("kpis") && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {kpis.map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2 mb-1">
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                      <span className="text-xs text-muted-foreground">{kpi.label}</span>
                    </div>
                    <p className="text-lg font-bold">{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
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

              {/* Comparaison Production vs Emballage */}
              {visibleWidgets.has("comparaison") && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-sm">Comparaison Production vs Emballage par {periodLabel(period)}</CardTitle>
                      <Select value={choixCompare} onValueChange={(v) => setChoixCompare(v as ChoixCompare)}>
                        <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="choix1">1er Choix (A+B+C+D)</SelectItem>
                          <SelectItem value="choix2">2ème Choix (Commercial)</SelectItem>
                          <SelectItem value="choix3">3ème Choix (Déclassé)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">{choixCompareLabels[choixCompare]}</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={comparaisonData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={period === "day" ? -45 : 0} textAnchor={period === "day" ? "end" : "middle"} height={period === "day" ? 60 : 30} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                        {choixCompare === "choix1" && (
                          <>
                            <Area type="monotone" dataKey="prod_c1" name="Production 1er Choix (m²)" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.15} strokeWidth={2} />
                            <Area type="monotone" dataKey="emb_c1" name="Emballage 1er Choix (m²)" stroke={COLORS[3]} fill={COLORS[3]} fillOpacity={0.15} strokeWidth={2} />
                          </>
                        )}
                        {choixCompare === "choix2" && (
                          <>
                            <Area type="monotone" dataKey="prod_c2" name="Production 2ème Choix (m²)" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.15} strokeWidth={2} />
                            <Area type="monotone" dataKey="emb_c2" name="Emballage 2ème Choix (m²)" stroke={COLORS[3]} fill={COLORS[3]} fillOpacity={0.15} strokeWidth={2} />
                          </>
                        )}
                        {choixCompare === "choix3" && (
                          <>
                            <Area type="monotone" dataKey="prod_c3" name="Production 3ème Choix (m²)" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.15} strokeWidth={2} />
                            <Area type="monotone" dataKey="emb_c3" name="Emballage 3ème Choix (m²)" stroke={COLORS[3]} fill={COLORS[3]} fillOpacity={0.15} strokeWidth={2} />
                          </>
                        )}
                      </AreaChart>
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
            {filteredJournalier.length} enregistrements · Agrégation: {periodLabel(period)}
          </p>
        </TabsContent>

        <TabsContent value="monthly" className="mt-0">
          <MonthlyComparisonView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
