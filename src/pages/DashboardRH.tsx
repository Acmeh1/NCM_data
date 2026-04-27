import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import DateRangeFilter from "@/components/DateRangeFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from "recharts";
import { Users, Briefcase, UserCheck, ShieldCheck, ClipboardList, UserMinus, Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  parseISO, 
  format as formatDate, 
  eachDayOfInterval, 
  eachMonthOfInterval, 
  isSameDay, 
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isAfter,
  isBefore
} from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = [
  "hsl(150, 60%, 45%)", // CDI - Green (Stability)
  "hsl(210, 70%, 55%)", // CDD - Blue
  "hsl(45, 80%, 55%)",  // Intérim - Orange/Yellow
  "hsl(340, 65%, 50%)", // Others
];

export default function DashboardRH() {
  const { 
    startDate, endDate, currentRange, period, activePreset,
    setRange, setPeriod 
  } = useDashboardFilters();

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

  // Property names from schema
  const PROP_CONTRAT = "Contrat";
  const PROP_DEPART = "Date_départ";
  const PROP_EMBAUCHE = "Date_Embauche";

  const getProp = (obj: any, key: string) => {
    if (!obj) return undefined;
    if (obj[key] !== undefined) return obj[key];
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_]/g, "");
    const target = normalize(key);
    const foundKey = Object.keys(obj).find(k => normalize(k) === target);
    return foundKey ? obj[foundKey] : undefined;
  };

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
        if (!hireDateStr) return false;

        const hireDate = parseISO(hireDateStr);
        const departDate = departDateStr ? parseISO(departDateStr) : null;

        // Active if hired on/before current date AND (no depart OR depart after current date)
        const isHired = hireDate <= date;
        const isStillActive = !departDate || isAfter(departDate, date);
        
        return isHired && isStillActive;
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
      const date = parseISO(hireDate);
      return isWithinInterval(date, { start: rangeStart, end: rangeEnd });
    });
  }, [rhData, rangeStart, rangeEnd]);

  // 3. Departures in period
  const departuresList = useMemo(() => {
    return rhData.filter(emp => {
      const departDate = getProp(emp, PROP_DEPART);
      if (!departDate) return false;
      const date = parseISO(departDate);
      return isWithinInterval(date, { start: rangeStart, end: rangeEnd });
    });
  }, [rhData, rangeStart, rangeEnd]);

  // 4. Final Headcount at end of period
  const countAtEnd = evolutionData.length > 0 ? evolutionData[evolutionData.length - 1].headcount : 0;

  // 5. Global Active Headcount (regardless of period - those who never left)
  const effectifActifGlobal = useMemo(() => {
    return rhData.filter(emp => !getProp(emp, PROP_DEPART)).length;
  }, [rhData]);

  // 6. Contract Breakdown at end of period
  const contractStats = useMemo(() => {
    const counts: Record<string, number> = {
      "CDI": 0,
      "CDD": 0,
      "Intérim": 0,
      "Autre": 0
    };

    // Calculate specifically for people active at the end of the period
    rhData.forEach((item: any) => {
      const hireDateStr = getProp(item, PROP_EMBAUCHE);
      const departDateStr = getProp(item, PROP_DEPART);
      if (!hireDateStr) return;

      const hireDate = parseISO(hireDateStr);
      const departDate = departDateStr ? parseISO(departDateStr) : null;

      const isActiveAtEnd = hireDate <= rangeEnd && (!departDate || isAfter(departDate, rangeEnd));
      
      if (isActiveAtEnd) {
        const contractValue = getProp(item, PROP_CONTRAT) || "";
        const type = String(contractValue).toUpperCase().trim();
        if (type.includes("CDI")) counts["CDI"]++;
        else if (type.includes("CDD")) counts["CDD"]++;
        else if (type.includes("INTÉRIM") || type.includes("INTERIM")) counts["Intérim"]++;
        else if (type) counts["Autre"]++;
      }
    });

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [rhData, rangeEnd]);

  const cdiCount = contractStats.find(s => s.name === "CDI")?.value || 0;
  const stabilityRate = countAtEnd > 0 ? ((cdiCount / countAtEnd) * 100).toFixed(1) : "0";

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
            <p className="text-sm text-muted-foreground font-medium">Analyse dynamique de l'effectif</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 transition-all hover:bg-primary hover:text-white">
          <Activity className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Diagnostics */}
      {(queryError || (rhData.length === 0 && !isLoading)) && (
        <Card className="bg-destructive/5 border-destructive/20 border-dashed">
          <CardContent className="p-4 text-sm text-destructive/80 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            {queryError ? (
              <p>Erreur : {(queryError as any).message}</p>
            ) : (
              <p>Aucune donnée trouvée dans la table <strong>fichRH</strong>. Vérifiez vos permissions RLS.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <div className="bg-card p-4 rounded-xl border shadow-sm">
        <DateRangeFilter
          range={currentRange}
          onRangeChange={setRange}
          granularity={period}
          onGranularityChange={setPeriod}
          activePreset={activePreset}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-500/10 to-blue-600/5 transition-transform hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-200">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Effectif Total</p>
                <div className="text-2xl font-bold">{isLoading ? "..." : rhData.length}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Nombre total de fiches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 transition-transform hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-200">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nouveaux Arrivants</p>
                <div className="text-2xl font-bold text-emerald-600">+{newHires.length}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Entrées sur la période</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-rose-500/10 to-rose-600/5 transition-transform hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-500 rounded-xl text-white shadow-lg shadow-rose-200">
                <UserMinus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Départs Période</p>
                <div className="text-2xl font-bold text-rose-600">-{departuresList.length}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Sorties sur la période</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-amber-500/10 to-amber-600/5 transition-transform hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-200">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Effectif Actif</p>
                <div className="text-2xl font-bold">{isLoading ? "..." : effectifActifGlobal}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Total sans date de départ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contrats Donut Chart */}
        <Card className="lg:col-span-1 shadow-sm border border-slate-200/60">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Répartition au {formatDate(rangeEnd, "dd/MM/yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center p-6">
            <div className="h-[250px] w-full">
              {isLoading ? (
                <div className="h-full flex items-center justify-center"><p className="animate-pulse">Chargement...</p></div>
              ) : contractStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={contractStats} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                      {contractStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Briefcase className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune donnée snapshot disponible.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stability Summary */}
        <Card className="lg:col-span-2 shadow-sm border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Résumé de la Période</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Embauches</p>
                <div className="text-2xl font-bold text-emerald-600">{newHires.length}</div>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Sorties</p>
                <div className="text-2xl font-bold text-rose-600">{departuresList.length}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              Cette analyse permet de surveiller le taux de remplacement et la variation nette de l'effectif au cours du temps. 
              Un effectif stable ou en croissance est un indicateur de bonne capacité de production.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
