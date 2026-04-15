import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface UtilizationTrendPoint {
  date: string;
  rate: number; // the percentage for that day
}

interface MachineUtilizationKpiCardProps {
  currentRate: number;      // current period average rate (%)
  prevRate: number;         // previous period average rate (%)
  trendData: UtilizationTrendPoint[];
  totalAvailableHours: number;
  totalProductionHours: number;
  objective?: number;
  formula?: string;
}

export default function MachineUtilizationKpiCard({
  currentRate,
  prevRate,
  trendData,
  totalAvailableHours,
  totalProductionHours,
  objective,
  formula,
}: MachineUtilizationKpiCardProps) {
  // Variation: higher is better for utilization
  const variation = prevRate > 0 ? ((currentRate - prevRate) / prevRate) * 100 : 0;
  const isBetter = variation >= 0; 
  const meetsObjective = objective !== undefined ? currentRate >= objective : null;

  return (
    <Card className="overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="p-1 rounded-md bg-indigo-500/10">
                <Timer className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              Taux Disponibilité Four
            </p>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-950 to-slate-600 dark:from-white dark:to-slate-400">
                  {currentRate.toLocaleString("fr-FR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </h2>
                <span className="text-sm font-bold text-slate-500/80 uppercase">%</span>
              </div>

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

          <div className="w-28 h-12 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradientUtil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientUtil)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
           <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/50">
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Prod. Réelle</p>
             <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
               {totalProductionHours.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} <span className="text-[10px] font-medium opacity-60">h</span>
             </p>
           </div>
           <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/50">
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Disponibilité</p>
             <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
               {totalAvailableHours.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} <span className="text-[10px] font-medium opacity-60">h</span>
             </p>
           </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50">
            <p className="text-[10px] text-slate-400 leading-relaxed italic">
              Taux de disponibilité : mesure le temps réel de production par rapport au temps total disponible.
            </p>
        </div>

        {/* Formula & Objective */}
        {(formula || objective !== undefined) && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between gap-2 flex-wrap">
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
                🎯 Obj. ≥ {objective}%
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
