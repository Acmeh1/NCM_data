import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UserCheck, AlertTriangle, Clock, CalendarRange, ShieldCheck,
  ChevronDown, ChevronUp, Activity, ClipboardList, Loader2,
} from "lucide-react";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { cn } from "@/lib/utils";

// Register ChartJS modules
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

interface DashboardProps {
  startDate: string;
  endDate: string;
  rhData: any[];
}

// Helpers to build month option objects
const buildMonthOpt = (d: Date) => ({
  label: format(d, "MMMM yyyy", { locale: fr }).replace(/^./, c => c.toUpperCase()),
  start: format(startOfMonth(d), "yyyy-MM-dd"),
  end:   format(endOfMonth(d),   "yyyy-MM-dd"),
});

// Colour map for absence motifs
const MOTIF_COLORS: Record<string, string> = {
  "Absence Non Autorisée": "#A32D2D",
  "Congé Maladie":         "#185FA5",
  "Récupération":          "#534AB7",
  "Congé Annuel":          "#854F0B",
  "Absence Autorisée":     "#3B6D11",
  "Formation":             "#0f766e",
  "Congé Décès":           "#64748b",
  "Congé Mariage":         "#d97706",
  "Congé sans solde":      "#9333ea",
  "Congé Circoncision":    "#0284c7",
  "Congé Naissance":       "#16a34a",
};

const getBadgeType = (motif: string): string => {
  if (motif === "Absence Non Autorisée") return "unauth";
  if (motif === "Congé Maladie")         return "sick";
  if (motif === "Récupération")          return "recup";
  if (motif?.toLowerCase().includes("congé")) return "cong";
  return "auth";
};

export default function Dashboard({ startDate, endDate, rhData }: DashboardProps) {

  // ─── helpers ───────────────────────────────────────────────────────────────
  const getProp = (obj: any, key: string) => {
    if (!obj) return undefined;
    if (obj[key] !== undefined) return obj[key];
    const norm = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_]/g, "");
    const t = norm(key);
    const k = Object.keys(obj).find(x => norm(x) === t);
    return k ? obj[k] : undefined;
  };

  // ─── QUERY 0 : date range of pointage_rh ────────────────────────────────
  const { data: dateRangeData } = useQuery({
    queryKey: ["pointage_date_range"],
    queryFn: async () => {
      const [{ data: minRow }, { data: maxRow }] = await Promise.all([
        supabase.from("pointage_rh").select("date").order("date", { ascending: true  }).limit(1).single(),
        supabase.from("pointage_rh").select("date").order("date", { ascending: false }).limit(1).single(),
      ]);
      return { min: minRow?.date as string | null, max: maxRow?.date as string | null };
    },
    staleTime: 10 * 60 * 1000,
  });

  // Build dynamic month list from the real date range
  const MONTH_OPTIONS = useMemo(() => {
    if (!dateRangeData?.min || !dateRangeData?.max) return [buildMonthOpt(new Date())];
    const months = eachMonthOfInterval({
      start: startOfMonth(parseISO(dateRangeData.min)),
      end:   startOfMonth(parseISO(dateRangeData.max)),
    });
    return months.map(buildMonthOpt).reverse(); // most recent first
  }, [dateRangeData]);

  // Build TREND_MONTHS: last 6 months up to latest available
  const TREND_MONTHS = useMemo(() => {
    const latest = dateRangeData?.max ? startOfMonth(parseISO(dateRangeData.max)) : new Date();
    const months: Date[] = [];
    for (let i = 5; i >= 0; i--) months.push(subMonths(latest, i));
    return months.map(buildMonthOpt);
  }, [dateRangeData]);

  // ─── state ────────────────────────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDept,  setSelectedDept]  = useState("Tous");
  const [expandedId,    setExpandedId]    = useState<string | null>(null);

  // Default to latest available month once options are loaded
  const effectiveMonth = selectedMonth ?? MONTH_OPTIONS[0]?.label ?? "";
  const monthOpt = MONTH_OPTIONS.find(m => m.label === effectiveMonth) ?? MONTH_OPTIONS[0];

  // ─── derived data from rhData prop ────────────────────────────────────────
  const servicesList = useMemo(() => {
    const svcs = new Set<string>();
    (rhData || []).forEach(emp => {
      const s = String(getProp(emp, "Service") || "").trim();
      if (s) svcs.add(s);
    });
    return Array.from(svcs).sort();
  }, [rhData]);

  const employeeMap = useMemo(() => {
    const map: Record<string, any> = {};
    (rhData || []).forEach(emp => {
      const mat = String(getProp(emp, "Matricule") || "").trim();
      if (mat) map[mat] = emp;
    });
    return map;
  }, [rhData]);

  // ─── matricules for selected dept (for retard filtering) ──────────────────
  const deptMatricules = useMemo(() => {
    if (selectedDept === "Tous") return null;
    return new Set(
      (rhData || [])
        .filter(e => String(getProp(e, "Service") || "").trim() === selectedDept)
        .map(e => String(getProp(e, "Matricule") || "").trim())
        .filter(Boolean)
    );
  }, [rhData, selectedDept]);

  // ─── QUERY 1 : Vue_Pointage_Matricule — selected month, all services ──────
  const { data: vueMonth = [], isLoading: loadingMonth } = useQuery({
    queryKey: ["vue_pointage_month", monthOpt.start, monthOpt.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Vue_Pointage_Matricule")
        .select("Date, Matricule, Service, Présence, Motif_Absence")
        .gte("Date", monthOpt.start)
        .lte("Date", monthOpt.end);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ─── QUERY 2 : pointage_rh — retards and heures supp for selected month ──
  const { data: retardRows = [] } = useQuery({
    queryKey: ["pointage_retard", monthOpt.start, monthOpt.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pointage_rh")
        .select("matricule, retard, heures_supp")
        .gte("date", monthOpt.start)
        .lte("date", monthOpt.end)
        .or("retard.gt.0,heures_supp.gt.0");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ─── QUERY 3 : Vue_Pointage_Matricule — 6-month trend ────────────────────
  const { data: trendRaw = [] } = useQuery({
    queryKey: ["vue_pointage_trend", TREND_MONTHS[0]?.start, TREND_MONTHS[TREND_MONTHS.length - 1]?.end],
    queryFn: async () => {
      if (!TREND_MONTHS.length) return [];
      const { data, error } = await supabase
        .from("Vue_Pointage_Matricule")
        .select("Date, Présence, Motif_Absence, Service")
        .gte("Date", TREND_MONTHS[0].start)
        .lte("Date", TREND_MONTHS[TREND_MONTHS.length - 1].end);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // ─── filtered data for the selected dept ──────────────────────────────────
  const filteredData = useMemo(() => {
    if (selectedDept === "Tous") return vueMonth as any[];
    return (vueMonth as any[]).filter(r => r["Service"] === selectedDept);
  }, [vueMonth, selectedDept]);

  const filteredRetard = useMemo(() => {
    let rows = retardRows as any[];
    if (deptMatricules) {
      rows = rows.filter(r => deptMatricules.has(r.matricule));
    }
    return rows.filter(r => r.retard > 0);
  }, [retardRows, deptMatricules]);

  // ─── KPI calculations from real data ──────────────────────────────────────
  const kpis = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) return null;

    const present  = filteredData.filter(r => r["Présence"] === 1).length;
    const unauth   = filteredData.filter(r => r["Motif_Absence"] === "Absence Non Autorisée").length;
    const sick     = filteredData.filter(r => r["Motif_Absence"] === "Congé Maladie").length;
    const recup    = filteredData.filter(r => r["Motif_Absence"] === "Récupération").length;
    const totalAbs = total - present;
    const auth     = Math.max(0, totalAbs - unauth - sick - recup);
    const late     = filteredRetard.length;

    const pct = (n: number) => ((n / total) * 100).toFixed(1) + "%";

    return {
      presence: pct(present),
      unauth:   pct(unauth),
      auth:     pct(auth),
      sick:     pct(sick),
      recup:    `${recup} j`,
      late:     `${late}`,
    };
  }, [filteredData, filteredRetard]);

  // ─── Absence table rows from real data ────────────────────────────────────
  const absenceRows = useMemo(() => {
    const absent = filteredData.filter(r => r["Présence"] === 0 && r["Motif_Absence"]);

    // group by Matricule
    const byMat: Record<string, any[]> = {};
    absent.forEach(r => {
      const m = String(r["Matricule"]);
      if (!byMat[m]) byMat[m] = [];
      byMat[m].push(r);
    });

    return Object.entries(byMat).map(([mat, records]) => {
      const emp = employeeMap[mat];
      const nom = emp
        ? `${getProp(emp, "Nom") || ""} ${getProp(emp, "Prénom") || ""}`.trim()
        : mat;
      const service = String(records[0]["Service"] || "—");
      const sorted = [...records].sort((a, b) =>
        String(b["Date"]).localeCompare(String(a["Date"]))
      );
      const latest = sorted[0];
      const motif  = String(latest["Motif_Absence"] || "");

      // per-employee stats using the full vueMonth (not filtered by dept)
      const empAll     = (vueMonth as any[]).filter(r => String(r["Matricule"]) === mat);
      const empPresent = empAll.filter(r => r["Présence"] === 1).length;
      const empTotal   = empAll.length;
      const empAbs     = empTotal - empPresent;
      const empUnauth  = empAll.filter(r => r["Motif_Absence"] === "Absence Non Autorisée").length;
      const empSick    = empAll.filter(r => r["Motif_Absence"] === "Congé Maladie").length;
      const empAuth    = Math.max(0, empAbs - empUnauth - empSick);
      
      const empRetardRows = (retardRows as any[]).filter(r => r.matricule === mat);
      const empLateOccurrences = empRetardRows.filter(r => r.retard > 0).length;
      const empLateHours = empRetardRows.reduce((sum, r) => sum + (Number(r.retard) || 0), 0);
      const empHeuresSupp = empRetardRows.reduce((sum, r) => sum + (Number(r.heures_supp) || 0), 0);
      
      const empPresencePct = empTotal > 0 ? Math.round((empPresent / empTotal) * 100) : 0;

      return {
        id:       mat,
        name:     nom,
        dept:     service,
        date:     String(latest["Date"]),
        type:     motif,
        badgeType: getBadgeType(motif),
        absCount: records.length,
        fiche: {
          presence:  `${empPresencePct}%`,
          auth:      `${empAuth} j`,
          unauth:    `${empUnauth} j`,
          sick:      `${empSick} j`,
          lateCount: `${empLateOccurrences}`,
          lateHours: `${empLateHours} h`,
          heuresSupp: `${empHeuresSupp} h`,
          totalAbs:  `${empAbs} j`,
          history:   sorted.map(r => ({
            date:  String(r["Date"]),
            type:  String(r["Motif_Absence"] || ""),
            color: MOTIF_COLORS[String(r["Motif_Absence"] || "")] || "#64748b",
          })),
        },
      };
    }).sort((a, b) => b.absCount - a.absCount);
  }, [filteredData, vueMonth, retardRows, employeeMap]);

  // ─── Donut chart ──────────────────────────────────────────────────────────
  const donutData = useMemo(() => {
    const absent = filteredData.filter(r => r["Présence"] === 0 && r["Motif_Absence"]);
    if (!absent.length) return null;

    const counts: Record<string, number> = {};
    absent.forEach(r => {
      const m = String(r["Motif_Absence"]);
      counts[m] = (counts[m] || 0) + 1;
    });

    const labels = Object.keys(counts);
    return {
      labels,
      datasets: [{
        data:            Object.values(counts),
        backgroundColor: labels.map(l => MOTIF_COLORS[l] || "#64748b"),
        borderWidth:     0,
        cutout:          "60%",
      }],
    };
  }, [filteredData]);

  // ─── Line chart: 6-month trend (filtered by selected dept) ───────────────────────
  const lineData = useMemo(() => {
    const calcPct = (month: { start: string; end: string }, motif: string) => {
      let recs = (trendRaw as any[]).filter(r => {
        const d = String(r["Date"]);
        return d >= month.start && d <= month.end;
      });
      // Respect the department filter
      if (selectedDept !== "Tous") {
        recs = recs.filter(r => r["Service"] === selectedDept);
      }
      if (!recs.length) return 0;
      const n = recs.filter(r => r["Motif_Absence"] === motif).length;
      return parseFloat(((n / recs.length) * 100).toFixed(1));
    };

    return {
      labels: TREND_MONTHS.map(m => m.label),
      datasets: [
        {
          label:           "Non autorisées",
          data:            TREND_MONTHS.map(m => calcPct(m, "Absence Non Autorisée")),
          borderColor:     "#A32D2D",
          backgroundColor: "rgba(163,45,45,0.1)",
          fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2,
        },
        {
          label:           "Maladie",
          data:            TREND_MONTHS.map(m => calcPct(m, "Congé Maladie")),
          borderColor:     "#185FA5",
          backgroundColor: "rgba(24,85,165,0.08)",
          fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2,
        },
      ],
    };
  }, [trendRaw]);

  // ─── Stacked bar: absences by service ────────────────────────────────────
  const stackedBarData = useMemo(() => {
    const svcs = servicesList.slice(0, 9);
    if (!svcs.length) return null;

    const count = (svc: string, motif: string) =>
      (vueMonth as any[]).filter(r => r["Service"] === svc && r["Motif_Absence"] === motif).length;

    const countAuth = (svc: string) =>
      (vueMonth as any[]).filter(r =>
        r["Service"] === svc &&
        r["Présence"] === 0 &&
        r["Motif_Absence"] !== "Absence Non Autorisée" &&
        r["Motif_Absence"] !== "Congé Maladie"
      ).length;

    return {
      labels: svcs,
      datasets: [
        { label: "Autorisées",     data: svcs.map(countAuth),                              backgroundColor: "#3B6D11", stack: "S0", barThickness: 18 },
        { label: "Non autorisées", data: svcs.map(s => count(s, "Absence Non Autorisée")), backgroundColor: "#A32D2D", stack: "S0", barThickness: 18 },
        { label: "Maladie",        data: svcs.map(s => count(s, "Congé Maladie")),          backgroundColor: "#185FA5", stack: "S0", barThickness: 18 },
      ],
    };
  }, [vueMonth, servicesList]);

  // ─── Badge renderer ───────────────────────────────────────────────────────
  const renderBadge = (text: string, type: string) => {
    const styles: Record<string, string> = {
      auth:  "bg-[#EAF3DE] text-[#3B6D11]",
      unauth:"bg-[#FCEBEB] text-[#A32D2D]",
      sick:  "bg-[#E6F1FB] text-[#185FA5]",
      recup: "bg-[#EEEDFE] text-[#534AB7]",
      cong:  "bg-[#FAEEDA] text-[#854F0B]",
    };
    return (
      <span className={cn(
        "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
        styles[type] ?? "bg-slate-100 text-slate-700"
      )}>
        {text}
      </span>
    );
  };

  // ─── Expandable fiche ─────────────────────────────────────────────────────
  const renderFiche = (row: (typeof absenceRows)[0]) => (
    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/50 space-y-5 animate-in slide-in-from-top-2 duration-300">

      {/* KPI mini-cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Présence",            value: row.fiche.presence,   left: "border-l-[#3B6D11]", val: "text-[#3B6D11]" },
          { label: "Abs. Autorisées",     value: row.fiche.auth,       left: "border-l-[#854F0B]", val: "text-[#854F0B]" },
          { label: "Abs. Non Aut.",       value: row.fiche.unauth,     left: "border-l-[#A32D2D]", val: "text-[#A32D2D]" },
          { label: "Retards (Fois)",      value: row.fiche.lateCount,  left: "border-l-[#185FA5]", val: "text-[#185FA5]" },
          { label: "Retards (H)",         value: row.fiche.lateHours,  left: "border-l-blue-400",  val: "text-blue-500" },
          { label: "Heures Supp.",        value: row.fiche.heuresSupp, left: "border-l-amber-500", val: "text-amber-600" },
          { label: "Total Absences",      value: row.fiche.totalAbs,   left: "border-l-[#534AB7]", val: "text-[#534AB7]" },
        ].map((item, i) => (
          <Card key={i} className={cn("border-none shadow-sm bg-white border-l-4", item.left)}>
            <CardContent className="p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{item.label}</p>
              <div className={cn("text-xl font-bold mt-1", item.val)}>{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Historique du mois
        </h5>
        {row.fiche.history.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Aucune absence enregistrée.</p>
        ) : (
          row.fiche.history.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-2 px-3 bg-white rounded-lg border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: h.color }} />
                <span className="min-w-[80px] text-slate-400 font-semibold">{h.date}</span>
                <span className="font-bold text-slate-700">{h.type}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loadingMonth) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm font-medium">Chargement des données de pointage…</span>
      </div>
    );
  }

  // ─── No data state ────────────────────────────────────────────────────────
  const noData = vueMonth.length === 0;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* CSS variables */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --color-background-secondary: #f8fafc;
        }
        .dark {
          --color-background-secondary: #1e293b;
        }
      `}} />

      {/* ── FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white rounded-xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <CalendarRange className="h-4 w-4 text-primary" /> Filtres Globaux :
        </div>
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <select
            value={effectiveMonth}
            onChange={e => { setSelectedMonth(e.target.value); setExpandedId(null); }}
            className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            {MONTH_OPTIONS.map(m => <option key={m.label} value={m.label}>{m.label}</option>)}
          </select>
          <select
            value={selectedDept}
            onChange={e => { setSelectedDept(e.target.value); setExpandedId(null); }}
            className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            <option value="Tous">Tous les Départements</option>
            {servicesList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {noData ? (
        <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
          <ClipboardList className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Aucune donnée de pointage trouvée pour {selectedMonth}</p>
          <p className="text-xs">Vérifiez que les données ont été importées dans la table <code>pointage_rh</code>.</p>
        </div>
      ) : (
        <>
          {/* ── SECTION 1 — KPIs ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Présents",            value: kpis?.presence ?? "—", icon: <UserCheck   className="h-4 w-4 text-[#3B6D11]" />, color: "text-[#3B6D11]" },
              { label: "Abs. Non Autorisées", value: kpis?.unauth   ?? "—", icon: <AlertTriangle className="h-4 w-4 text-[#A32D2D]" />, color: "text-[#A32D2D]", wrap: true },
              { label: "Abs. Autorisées",     value: kpis?.auth     ?? "—", icon: <ShieldCheck  className="h-4 w-4 text-[#854F0B]" />, color: "text-[#854F0B]", wrap: true },
              { label: "Congé maladie",       value: kpis?.sick     ?? "—", icon: <Activity     className="h-4 w-4 text-[#185FA5]" />, color: "text-[#185FA5]", wrap: true },
              { label: "Récupérations",       value: kpis?.recup    ?? "—", icon: <Clock        className="h-4 w-4 text-[#534AB7]" />, color: "text-[#534AB7]", wrap: true, sub: "en cours" },
              { label: "Retards",             value: kpis?.late     ?? "—", icon: <ClipboardList className="h-4 w-4 text-slate-500" />, color: "text-slate-700", sub: "ce mois" },
            ].map((kpi, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200/50 bg-[var(--color-background-secondary)] flex flex-col justify-between h-[100px] shadow-sm">
                <div className="flex justify-between items-start">
                  <span className={cn("text-[12px] font-bold text-slate-400 uppercase tracking-widest", (kpi as any).wrap ? "text-nowrap" : "")}>{kpi.label}</span>
                  {kpi.icon}
                </div>
                <div className="mt-2">
                  <div className={cn("text-[22px] font-bold leading-none", kpi.color)}>{kpi.value}</div>
                  {(kpi as any).sub && (
                    <span className="text-[11px] text-slate-400 mt-1 block">{(kpi as any).sub}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── SECTION 2 — Donut + Line charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Donut */}
            <Card className="shadow-sm border border-slate-200/60 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Répartition des absences</span>
                  <span className="text-[10px] font-normal text-slate-400">Volume total</span>
                </CardTitle>
                {donutData && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                    {donutData.labels.map((label, i) => (
                      <div key={label} className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                        <div className="w-[9px] h-[9px] rounded-[2px] flex-shrink-0" style={{ backgroundColor: (donutData.datasets[0].backgroundColor as string[])[i] }} />
                        <span>{label} ({donutData.datasets[0].data[i]})</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="h-[200px] flex items-center justify-center pt-2">
                {donutData ? (
                  <div className="h-full w-full max-w-[200px]">
                    <Doughnut
                      key={`donut-${selectedDept}-${effectiveMonth}`}
                      data={donutData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} j` } },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Aucune absence ce mois</p>
                )}
              </CardContent>
            </Card>

            {/* Line chart */}
            <Card className="shadow-sm border border-slate-200/60 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Évolution mensuelle</CardTitle>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                    <div className="w-3.5 h-[2px] bg-[#A32D2D]" />
                    <span>Non autorisées</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                    <div className="w-3.5 h-[2px] border-t-2 border-dashed border-[#185FA5]" />
                    <span>Maladie</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[200px] pt-2">
                <Line
                  key={`trend-${selectedDept}-${effectiveMonth}`}
                  data={lineData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                      y: {
                        grid: { color: "rgba(0,0,0,0.04)" },
                        ticks: { font: { size: 10 }, callback: val => `${val}%` },
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* ── SECTION 3 — Stacked bar by service ── */}
          {stackedBarData && (
            <Card className="shadow-sm border border-slate-200/60 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Absences par service</span>
                  <span className="text-[10px] font-normal text-slate-400">Jours absents</span>
                </CardTitle>
                <div className="flex gap-4 mt-2">
                  {[
                    { color: "#3B6D11", label: "Autorisées" },
                    { color: "#A32D2D", label: "Non autorisées" },
                    { color: "#185FA5", label: "Maladie" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                      <div className="w-[9px] h-[9px]" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="h-[200px] pt-2">
                <Bar
                  key={`bar-${effectiveMonth}`}
                  data={stackedBarData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 35 } },
                      y: { stacked: true, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10 } } },
                    },
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* ── SECTION 4 — Suivi individuel ── */}
          <Card className="shadow-sm border border-slate-200/60 bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-3">
              <CardTitle className="text-sm font-bold text-slate-800">
                Suivi individuel — absences {effectiveMonth}
                {selectedDept !== "Tous" && (
                  <span className="ml-2 text-[10px] font-normal text-slate-400">· {selectedDept}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                      <th className="px-4 py-3">Employé</th>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Dernière abs.</th>
                      <th className="px-4 py-3">Nb jours abs.</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Fiche</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {absenceRows.length > 0 ? (
                      absenceRows.map(row => {
                        const isExpanded = expandedId === row.id;
                        return (
                          <React.Fragment key={row.id}>
                            <tr className={cn("transition-colors", isExpanded ? "bg-slate-50/70" : "hover:bg-slate-50/30")}>
                              <td className="px-4 py-3 font-bold text-slate-700">{row.name}</td>
                              <td className="px-4 py-3 text-slate-600 font-semibold">{row.dept}</td>
                              <td className="px-4 py-3 text-slate-500 font-medium">{row.date}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{row.absCount} j</td>
                              <td className="px-4 py-3">{renderBadge(row.type, row.badgeType)}</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                                  className="text-[10px] font-black uppercase text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                                >
                                  {isExpanded
                                    ? <><ChevronUp className="h-3 w-3" /> Fermer</>
                                    : <><ChevronDown className="h-3 w-3" /> Voir</>}
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} className="px-6 py-4 bg-slate-50/30 border-y border-slate-200/50">
                                  {renderFiche(row)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic font-medium">
                          Aucune absence enregistrée pour ce filtre
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
