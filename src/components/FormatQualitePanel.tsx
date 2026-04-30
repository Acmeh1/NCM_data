import React, { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { X, Layers, Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface JRow {
  format?: string | null;
  modele?: string | null;
  couleur?: string | null;
  choix_1_m2?: number | null;
  choix_2_m2?: number | null;
  choix_3_m2?: number | null;
  total_m2?: number | null;
}

interface FormatQualitePanelProps {
  data: JRow[];
  startDate?: string;
  endDate?: string;
}

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const FORMAT_PALETTE = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f97316", "#ec4899",
  "#06b6d4", "#84cc16", "#f43f5e", "#14b8a6", "#a78bfa",
];

const CHOIX_CFG = [
  { key: "c1", label: "1er Choix",  fill: "#22c55e", bg: "bg-emerald-100 dark:bg-emerald-900/40", txt: "text-emerald-700 dark:text-emerald-400" },
  { key: "c2", label: "2ème Choix", fill: "#f59e0b", bg: "bg-amber-100  dark:bg-amber-900/40",   txt: "text-amber-700  dark:text-amber-400"   },
  { key: "c3", label: "3ème Choix", fill: "#f43f5e", bg: "bg-rose-100   dark:bg-rose-900/40",    txt: "text-rose-700   dark:text-rose-400"    },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function dominant(c1: number, c2: number, c3: number): 1 | 2 | 3 {
  if (c1 >= c2 && c1 >= c3) return 1;
  if (c2 >= c3) return 2;
  return 3;
}

/* ─── Custom tooltip for donut ───────────────────────────────────────────── */
const DonutTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-xs shadow-xl">
      <p className="font-bold" style={{ color: d.payload.color }}>{d.name}</p>
      <p className="text-muted-foreground">
        {(d.value as number).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} m²
      </p>
    </div>
  );
};

/* ─── Bar chart custom tooltip ──────────────────────────────────────────── */
const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-xs shadow-xl space-y-1">
      <p className="font-bold text-[11px] mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{(p.value as number).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} m²</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function FormatQualitePanel({ data, startDate, endDate }: FormatQualitePanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

  /* 1. Format summary (all formats in period) */
  const formatSummary = useMemo(() => {
    const map: Record<string, { fmt: string; c1: number; c2: number; c3: number; total: number }> = {};
    data.forEach((r) => {
      const fmt = String(r.format ?? "").trim();
      if (!fmt) return;
      if (!map[fmt]) map[fmt] = { fmt, c1: 0, c2: 0, c3: 0, total: 0 };
      map[fmt].c1    += Number(r.choix_1_m2) || 0;
      map[fmt].c2    += Number(r.choix_2_m2) || 0;
      map[fmt].c3    += Number(r.choix_3_m2) || 0;
      map[fmt].total += Number(r.total_m2)   || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data]);

  /* 2. Model breakdown for selected format */
  const modelBreakdown = useMemo(() => {
    if (!selectedFormat || selectedFormat === "GLOBAL") return [];
    const map: Record<string, { nom: string; c1: number; c2: number; c3: number; total: number }> = {};
    data.forEach((r) => {
      if (String(r.format ?? "").trim() !== selectedFormat) return;
      const nom = String(r.modele ?? "").trim() || "Inconnu";
      if (!map[nom]) map[nom] = { nom, c1: 0, c2: 0, c3: 0, total: 0 };
      map[nom].c1    += Number(r.choix_1_m2) || 0;
      map[nom].c2    += Number(r.choix_2_m2) || 0;
      map[nom].c3    += Number(r.choix_3_m2) || 0;
      map[nom].total += Number(r.total_m2)   || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data, selectedFormat]);

  /* 3. Global ranking — all models, all formats combined */
  const globalRanking = useMemo(() => {
    const map: Record<string, {
      nom: string; c1: number; c2: number; c3: number; total: number;
      formats: Set<string>;
    }> = {};
    data.forEach((r) => {
      const nom = String(r.modele ?? "").trim() || "Inconnu";
      const fmt = String(r.format  ?? "").trim();
      if (!map[nom]) map[nom] = { nom, c1: 0, c2: 0, c3: 0, total: 0, formats: new Set() };
      map[nom].c1    += Number(r.choix_1_m2) || 0;
      map[nom].c2    += Number(r.choix_2_m2) || 0;
      map[nom].c3    += Number(r.choix_3_m2) || 0;
      map[nom].total += Number(r.total_m2)   || 0;
      if (fmt) map[nom].formats.add(fmt);
    });
    return Object.values(map)
      .sort((a, b) => b.c1 - a.c1)
      .map((m) => ({ ...m, formats: [...m.formats].join(", ") }));
  }, [data]);

  /* Top 8 for bar chart */
  const barData = globalRanking.slice(0, 8).map((m) => ({
    name: m.nom.length > 14 ? m.nom.slice(0, 13) + "…" : m.nom,
    fullName: m.nom,
    "1er Choix":  m.c1,
    "2ème Choix": m.c2,
    "3ème Choix": m.c3,
  }));

  const selFmt = formatSummary.find((f) => f.fmt === selectedFormat);

  /* 4. Format Ranking — Leaderboard of formats */
  const formatRanking = useMemo(() => {
    return [...formatSummary].sort((a, b) => b.total - a.total);
  }, [formatSummary]);


  const donutData = selFmt
    ? CHOIX_CFG.map((c) => ({
        name:  c.label,
        color: c.fill,
        value: selFmt[c.key as "c1" | "c2" | "c3"],
      })).filter((d) => d.value > 0)
    : [];

  if (formatSummary.length === 0) return null;

  const fmtColor = (i: number) => FORMAT_PALETTE[i % FORMAT_PALETTE.length];

  return (
    <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-slate-900">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-blue-500" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Qualité & Classements
          </h3>
          <span className="ml-auto text-[10px] text-muted-foreground italic">
            Cliquez une bulle pour afficher le détail
          </span>
        </div>

        {/* Action Bubbles: Global + Formats */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* 🏆 Classement TOTAL (Modèles) */}
          <button
            onClick={() => setSelectedFormat(selectedFormat === "GLOBAL_MODELS" ? null : "GLOBAL_MODELS")}
            className={cn(
              "group flex flex-col items-start px-3 py-2 rounded-xl border-2 text-left transition-all duration-150",
              "hover:shadow-md hover:scale-[1.02]",
              selectedFormat === "GLOBAL_MODELS"
                ? "bg-amber-500 border-amber-500 text-white shadow-lg scale-[1.02]"
                : "bg-amber-500/5 border-amber-500/20 text-amber-600 hover:bg-amber-500/10"
            )}
          >
            <div className="flex items-center gap-1.5">
              <Trophy className={cn("h-3 w-3", selectedFormat === "GLOBAL_MODELS" ? "text-white" : "text-amber-500")} />
              <span className="text-xs font-bold leading-none">Classement Modèles</span>
            </div>
            <span className={cn("text-[10px] mt-0.5 font-medium", selectedFormat === "GLOBAL_MODELS" ? "text-white/80" : "text-muted-foreground")}>
              Top Performances
            </span>
          </button>

          {/* 📊 Classement des FORMATS */}
          <button
            onClick={() => setSelectedFormat(selectedFormat === "GLOBAL_FORMATS" ? null : "GLOBAL_FORMATS")}
            className={cn(
              "group flex flex-col items-start px-3 py-2 rounded-xl border-2 text-left transition-all duration-150",
              "hover:shadow-md hover:scale-[1.02]",
              selectedFormat === "GLOBAL_FORMATS"
                ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.02]"
                : "bg-blue-600/5 border-blue-600/20 text-blue-600 hover:bg-blue-600/10"
            )}
          >
            <div className="flex items-center gap-1.5">
              <Layers className={cn("h-3 w-3", selectedFormat === "GLOBAL_FORMATS" ? "text-white" : "text-blue-500")} />
              <span className="text-xs font-bold leading-none">Classement Formats</span>
            </div>
            <span className={cn("text-[10px] mt-0.5 font-medium", selectedFormat === "GLOBAL_FORMATS" ? "text-white/80" : "text-muted-foreground")}>
              Leaderboard Formats
            </span>
          </button>

          {/* 📦 Format Bubbles */}
          {formatSummary.map((f, i) => {
            const color = fmtColor(i);
            const active = selectedFormat === f.fmt;
            const c1Pct = f.total > 0 ? Math.round((f.c1 / f.total) * 100) : 0;
            return (
              <button
                key={f.fmt}
                onClick={() => setSelectedFormat(active ? null : f.fmt)}
                className={cn(
                  "group flex flex-col items-start px-3 py-2 rounded-xl border-2 text-left transition-all duration-150",
                  "hover:shadow-md hover:scale-[1.02]",
                  active ? "shadow-lg scale-[1.02]" : "bg-transparent"
                )}
                style={{
                  borderColor: color,
                  backgroundColor: active ? color : undefined,
                  color: active ? "#fff" : color,
                }}
              >
                <span className="text-xs font-bold leading-none">{f.fmt}</span>
                <span className={cn("text-[10px] mt-0.5 font-medium", active ? "text-white/80" : "text-muted-foreground")}>
                  {f.total.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} m² · C1: {c1Pct}%
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Detail section (Conditional) ─────────────────────────────── */}
        {selectedFormat && (
          <div className="mt-2 border-t border-muted/40 pt-5 animate-in fade-in slide-in-from-top-2 duration-300">
            {selectedFormat === "GLOBAL_MODELS" ? (
              /* Case 1: GLOBAL MODELS VIEW */
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <div>
                      <h4 className="font-extrabold text-lg tracking-tight">Classement Top Modèles</h4>
                      <p className="text-xs text-muted-foreground">Performances cumulées sur tous les formats</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedFormat(null)} className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors transition-opacity opacity-70 hover:opacity-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Top 6 Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {globalRanking.slice(0, 6).map((m, i) => {
                    const rebut = m.total > 0 ? ((m.c2 + m.c3) / m.total) * 100 : 0;
                    const c1Pct = m.total > 0 ? (m.c1 / m.total) * 100 : 0;
                    const rankStyle = i === 0 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800" : i === 1 ? "bg-slate-50 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800" : i === 2 ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-800" : "bg-muted/20 border-muted/30";
                    return (
                      <div key={m.nom} className={cn("rounded-xl border p-3 flex flex-col gap-1.5 transition-shadow hover:shadow-sm", rankStyle)}>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black tracking-tighter italic">#{i + 1}</span>
                          {i < 3 && <Medal className={cn("h-4 w-4", i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : "text-orange-500")} />}
                        </div>
                        <p className="text-[11px] font-bold leading-tight line-clamp-2 min-h-[2.2em]">{m.nom}</p>
                        <div className="mt-auto">
                          <span className="text-xs font-black text-emerald-600 tabular-nums">{m.c1.toLocaleString("fr-FR")}</span>
                          <span className="text-[10px] text-muted-foreground ml-0.5">m² C1</span>
                        </div>
                        <div className="space-y-0.5 mt-1 pt-1 border-t border-muted/30">
                          <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">C1:</span><span className="font-bold text-emerald-600">{c1Pct.toFixed(0)}%</span></div>
                          <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Choix comm:</span><span className={cn("font-bold", rebut < 2 ? "text-emerald-600" : rebut < 5 ? "text-amber-600" : "text-rose-600")}>{rebut.toFixed(1)}%</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Volume Comparison Chart */}
                <div className="w-full h-[320px] bg-muted/5 rounded-2xl p-4 border border-muted/20 shadow-inner">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} barCategoryGap="20%" barGap={2} margin={{ bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 500 }} angle={-35} textAnchor="end" interval={0} height={70} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + "k" : v} />
                      <Tooltip content={<BarTooltip />} />
                      <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                      <Bar name="1er Choix" dataKey="1er Choix" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar name="2ème Choix" dataKey="2ème Choix" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar name="3ème Choix" dataKey="3ème Choix" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : selectedFormat === "GLOBAL_FORMATS" ? (
              /* Case 3: GLOBAL FORMATS VIEW */
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-500" />
                    <div>
                      <h4 className="font-extrabold text-lg tracking-tight">Leaderboard des Formats</h4>
                      <p className="text-xs text-muted-foreground">Comparaison de l'efficacité et du volume par format</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedFormat(null)} className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors transition-opacity opacity-70 hover:opacity-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   {/* Table of formats */}
                   <div className="lg:col-span-2 bg-muted/5 rounded-2xl p-4 border border-muted/20 shadow-inner overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-muted/30 text-[10px] uppercase font-bold text-muted-foreground">
                            <th className="pb-3 text-left pl-2">Format</th>
                            <th className="pb-3 text-right">Volume Total (m²)</th>
                            <th className="pb-3 text-right">1er Choix (%)</th>
                            <th className="pb-3 text-right pr-2">Total C1 (m²)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-muted/10">
                          {formatRanking.map((f, i) => {
                            const c1Pct = f.total > 0 ? (f.c1 / f.total) * 100 : 0;
                            const color = fmtColor(formatSummary.findIndex(sum => sum.fmt === f.fmt));
                            return (
                              <tr key={f.fmt} className="hover:bg-background/40 transition-all group cursor-pointer" onClick={() => setSelectedFormat(f.fmt)}>
                                <td className="py-3 pl-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="font-bold text-foreground text-sm">{f.fmt}</span>
                                  </div>
                                </td>
                                <td className="py-3 text-right font-black tabular-nums">{f.total.toLocaleString("fr-FR")}</td>
                                <td className="py-3 text-right">
                                   <div className="flex flex-col items-end gap-1">
                                      <span className={cn("font-bold", c1Pct > 90 ? "text-emerald-500" : c1Pct > 80 ? "text-amber-500" : "text-rose-500")}>
                                        {c1Pct.toFixed(1)}%
                                      </span>
                                      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden shadow-inner">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c1Pct}%` }} />
                                      </div>
                                   </div>
                                </td>
                                <td className="py-3 text-right font-medium text-muted-foreground pr-2">{f.c1.toLocaleString("fr-FR")}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                   </div>

                   {/* Distribution Pie chart or summary */}
                   <div className="bg-muted/5 rounded-2xl p-6 border border-muted/20 shadow-inner flex flex-col items-center justify-center">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Volume par Format</h5>
                      <div className="relative w-48 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={formatRanking.map((f, i) => ({ name: f.fmt, value: f.total, color: fmtColor(formatSummary.findIndex(sum => sum.fmt === f.fmt)) }))} 
                              cx="50%" cy="50%" innerRadius={60} outerRadius={85} stroke="transparent" dataKey="value" paddingAngle={2}
                            >
                              {formatRanking.map((entry, idx) => (
                                <Cell key={idx} fill={fmtColor(formatSummary.findIndex(sum => sum.fmt === entry.fmt))} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Total</span>
                          <span className="text-xl font-black text-foreground tabular-nums">
                            {formatRanking.reduce((s, f) => s + f.total, 0) >= 1000000 
                              ? (formatRanking.reduce((s, f) => s + f.total, 0) / 1000000).toFixed(1) + "M"
                              : (formatRanking.reduce((s, f) => s + f.total, 0) / 1000).toFixed(0) + "k"
                            }
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">m²</span>
                        </div>
                      </div>
                      <div className="mt-6 w-full space-y-2">
                        {formatRanking.slice(0, 3).map((f) => {
                           const color = fmtColor(formatSummary.findIndex(sum => sum.fmt === f.fmt));
                           const pct = (f.total / formatRanking.reduce((s, f) => s + f.total, 0)) * 100;
                           return (
                             <div key={f.fmt} className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-background/50 border border-muted/10 shadow-sm">
                               <div className="flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                 <span className="font-semibold">{f.fmt}</span>
                               </div>
                               <span className="font-black text-foreground">{pct.toFixed(1)}%</span>
                             </div>
                           );
                        })}
                      </div>
                   </div>
                </div>
              </div>
            ) : (
              /* Case 2: SPECIFIC FORMAT VIEW */
              selFmt && (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg bg-muted/20" style={{ color: fmtColor(formatSummary.findIndex(f => f.fmt === selectedFormat)) }}>
                        {selectedFormat.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-xl tracking-tight">{selectedFormat}</h4>
                          {startDate && endDate && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                              {startDate} ⮕ {endDate}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-bold text-foreground">{selFmt.total.toLocaleString("fr-FR")} m²</span> au total · {modelBreakdown.length} modèles détectés
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedFormat(null)} className="rounded-full p-1.5 hover:bg-muted text-muted-foreground transition-all">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Donut Qualitative Summary */}
                    <div className="flex flex-col items-center justify-start lg:w-64 shrink-0 bg-muted/5 rounded-2xl p-6 border border-muted/20 shadow-inner">
                      <div className="relative w-48 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={donutData} 
                              cx="50%" cy="50%" 
                              innerRadius={60} 
                              outerRadius={85} 
                              stroke="transparent" 
                              dataKey="value" 
                              paddingAngle={4}
                            >
                              {donutData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<DonutTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Production</span>
                          <span className="text-2xl font-black text-foreground tabular-nums">
                            {selFmt.total >= 1000 ? (selFmt.total / 1000).toFixed(1) + "k" : selFmt.total}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">m² total</span>
                        </div>
                      </div>
                      
                      {/* Detailed Legend with Quantities & Percentages */}
                      <div className="w-full space-y-2.5 mt-6 pt-4 border-t border-muted/20">
                        {donutData.map((d) => (
                          <div key={d.name} className="group flex flex-col gap-1 px-3 py-2 rounded-xl bg-background/40 hover:bg-background/80 border border-muted/10 shadow-sm transition-all text-[11px]">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shadow-sm" style={{ background: d.color }} />
                                <span className="font-bold text-muted-foreground">{d.name}</span>
                              </div>
                              <span className="font-black text-foreground">
                                {((d.value / selFmt.total) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground/80 pl-4 italic">
                              <span>Volume:</span>
                              <span className="font-medium tabular-nums font-mono">{d.value.toLocaleString("fr-FR")} m²</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ranked Models Table */}
                    <div className="flex-1 min-w-0 bg-muted/5 rounded-2xl p-5 border border-muted/20 shadow-inner overflow-hidden">
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 mb-4 flex items-center gap-2">
                        <Trophy className="h-3 w-3" /> Comparaison des Modèles
                      </h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-muted/30 text-[10px] uppercase font-bold text-muted-foreground">
                              <th className="pb-3 text-left w-10 pl-2">Rg</th>
                              <th className="pb-3 text-left">Modèle</th>
                              <th className="pb-3 text-right text-emerald-600">1er Choix (m²)</th>
                              <th className="pb-3 text-right text-amber-600">2ème Choix (m²)</th>
                              <th className="pb-3 text-right text-rose-600 pr-2">3ème Choix (m²)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-muted/10">
                            {modelBreakdown.map((m, i) => {
                              return (
                                <tr key={m.nom} className="hover:bg-background/50 transition-all group border-b border-muted/10 last:border-0">
                                  <td className="py-4 pl-2">
                                    <span className={cn(
                                      "inline-flex items-center justify-center w-7 h-7 rounded-xl text-[12px] font-black shadow-sm",
                                      i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-orange-800" : "bg-muted/40 text-muted-foreground"
                                    )}>
                                      {i + 1}
                                    </span>
                                  </td>
                                  <td className="py-4 font-bold text-foreground/90 max-w-[220px]" title={m.nom}>
                                    <div className="flex flex-col">
                                      <span className="truncate text-sm">{m.nom}</span>
                                      <span className="text-[9px] font-medium text-muted-foreground/60 italic uppercase tracking-tighter">Détail qualité</span>
                                    </div>
                                  </td>
                                  <td className="py-4 text-right">
                                    <span className="font-black text-emerald-600 tabular-nums text-sm">{m.c1.toLocaleString("fr-FR")}</span>
                                  </td>
                                  <td className="py-4 text-right">
                                    <span className="font-bold text-amber-600 tabular-nums text-sm">{m.c2.toLocaleString("fr-FR")}</span>
                                  </td>
                                  <td className="py-4 text-right pr-2">
                                    <span className="font-bold text-rose-500 tabular-nums text-sm">{m.c3.toLocaleString("fr-FR")}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
