import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnergyTrendPoint {
  date: string;
  rate: number; // the ratio for that day
}

interface EnergyRatioKpiCardProps {
  currentRatio: number;      // current period ratio
  prevRatio: number;         // previous period ratio
  trendData: EnergyTrendPoint[];
  totalGas: number;
  totalPieces: number;
  objective?: number;
  formula?: string;
}

export default function EnergyRatioKpiCard({
  currentRatio,
  prevRatio,
  trendData,
  totalGas,
  totalPieces,
  objective,
  formula,
}: EnergyRatioKpiCardProps) {
  // Variation: lower is better for ratio
  const variation = prevRatio > 0 ? ((currentRatio - prevRatio) / prevRatio) * 100 : 0;
  const isBetter = variation <= 0; // Negative variation means improvement (reduction in consumption per piece)
  const meetsObjective = objective !== undefined ? currentRatio <= objective : null;

  return (
    <Card className="overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="p-1 rounded-md bg-rose-500/10">
                <Flame className="h-3.5 w-3.5 text-rose-500" />
              </div>
              Ratio Énergie / Pièce
            </p>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-950 to-slate-600 dark:from-white dark:to-slate-400">
                  {currentRatio.toLocaleString("fr-FR", {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}
                </h2>
                <span className="text-sm font-bold text-slate-500/80 uppercase">m³/pc</span>
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
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
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
                  <linearGradient id="gradientEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientEnergy)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
           <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/50">
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Gaz</p>
             <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
               {totalGas.toLocaleString("fr-FR")} <span className="text-[10px] font-medium opacity-60">m³</span>
             </p>
           </div>
           <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/50">
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Pièces</p>
             <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
               {totalPieces.toLocaleString("fr-FR")} <span className="text-[10px] font-medium opacity-60">pcs</span>
             </p>
           </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50">
            <p className="text-[10px] text-slate-400 leading-relaxed italic">
              Performance énergétique : une baisse indique une meilleure efficacité thermique du four.
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
                🎯 Obj. ≤ {objective} m³/pc
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
