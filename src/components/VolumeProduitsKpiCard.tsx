import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, SquareStack } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface VolumeTrendPoint {
  date: string;
  value: number;
}

interface GroupVolume {
  label: string;
  value: number;
  pct: number;
}

interface VolumeProduitsKpiCardProps {
  totalVolume: number;      // sum cuisson_m2 current period
  prevVolume: number;       // sum cuisson_m2 previous period
  trendData: VolumeTrendPoint[];
  groupBreakdown: GroupVolume[];     // per‑group breakdown
  periodDays: number;               // nb jours dans la période
  objective?: number;               // objectif journalier m²
  formula?: string;
}

export default function VolumeProduitsKpiCard({
  totalVolume,
  prevVolume,
  trendData,
  groupBreakdown,
  periodDays,
  objective,
  formula,
}: VolumeProduitsKpiCardProps) {
  // Variation vs previous period
  const variation = prevVolume > 0 ? ((totalVolume - prevVolume) / prevVolume) * 100 : 0;
  const isBetter = variation >= 0;
  // Daily average
  const dailyAvg = periodDays > 0 ? totalVolume / periodDays : 0;
  const objTotal = objective && periodDays ? objective * periodDays : null;
  const meetsObjective = objTotal !== null ? totalVolume >= objTotal : null;

  return (
    <Card className="overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300">
      <CardContent className="p-6">
        {/* ── Header row: big number + mini area chart ─────────────── */}
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="p-1 rounded-md bg-orange-500/10">
                <SquareStack className="h-3.5 w-3.5 text-orange-500" />
              </div>
              Volume Produit
            </div>

            {/* Main value */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-950 to-slate-600 dark:from-white dark:to-slate-400">
                  {totalVolume.toLocaleString("fr-FR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </h2>
                <span className="text-sm font-bold text-slate-500/80 uppercase">m²</span>
              </div>

              {/* Variation badge */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm ring-1 ring-inset",
                    isBetter
                      ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 ring-rose-500/20"
                  )}
                >
                  {isBetter ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(variation).toFixed(1)}%
                </div>
                <span className="text-[10px] text-slate-400 font-medium">vs prev.</span>
              </div>
            </div>
          </div>

          {/* Mini area chart */}
          <div className="w-28 h-12 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradientVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientVolume)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-4">
           <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/50">
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Moyenne / Jour</p>
             <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
               {dailyAvg.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} <span className="text-[10px] font-medium opacity-60">m²</span>
             </p>
           </div>
           <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/50">
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Période</p>
             <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
               {totalVolume > 1000 ? (totalVolume/1000).toFixed(1) + "k" : totalVolume} <span className="text-[10px] font-medium opacity-60">m²</span>
             </p>
           </div>
        </div>

        {/* ── Horizontal bars by group ──────────────────────────────── */}
        {groupBreakdown.length > 0 && (
          <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-800/50">
            {groupBreakdown.map((g) => (
              <div key={g.label} className="group/item">
                <div className="flex justify-between items-center text-[10px] mb-1.5">
                  <span className="font-bold text-slate-500 dark:text-slate-400 group-hover/item:text-orange-500 transition-colors">
                    {g.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">
                      {g.value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} m²
                    </span>
                    <span className="font-black px-1.5 py-0.5 bg-orange-500/10 rounded text-orange-600 ring-1 ring-orange-500/20">
                      {g.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-orange-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${g.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formula & Objective */}
        {(formula || objective !== undefined) && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between gap-2 flex-wrap">
            {formula && (
              <code className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">
                {formula}
              </code>
            )}
            {objective !== undefined && (
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                meetsObjective
                  ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20"
              )}>
                🎯 Obj. {objective.toLocaleString("fr-FR")} m²/j
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
