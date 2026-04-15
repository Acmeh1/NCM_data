import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface TrendPoint {
  date: string;
  rate: number;
}

interface RendementKpiCardProps {
  currentRate: number;
  variation: number;
  trendData: TrendPoint[];
  choix1Pct: number;
  nonChoix1Pct: number;
  recordCount?: number;
  objective?: number;
  formula?: string;
}

export default function RendementKpiCard({
  currentRate,
  variation,
  trendData,
  choix1Pct,
  nonChoix1Pct,
  recordCount,
  objective,
  formula,
}: RendementKpiCardProps) {
  const isBetter = variation > 0; // More yield = better
  const meetsObjective = objective !== undefined ? currentRate >= objective : null;

  return (
    <Card className="overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="p-1 rounded-md bg-sky-500/10">
                <Gauge className="h-3.5 w-3.5 text-sky-500" />
              </div>
              Rendement
            </p>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-950 to-slate-600 dark:from-white dark:to-slate-400">
                  {currentRate.toFixed(2)}
                </h2>
                <span className="text-sm font-bold text-slate-500/80 uppercase">%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm ring-1 ring-inset",
                  isBetter ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" : "bg-rose-500/10 text-rose-600 ring-rose-500/20"
                )}>
                  {isBetter ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(variation).toFixed(1)}%
                </div>
                <span className="text-[10px] text-slate-400 font-medium">vs prev.</span>
              </div>
            </div>
            {recordCount !== undefined && (
              <p className={cn(
                "text-[9px] font-bold uppercase tracking-tight mt-1 flex items-center gap-1",
                recordCount === 0 ? "text-rose-500/80" : "text-emerald-500/80"
              )}>
                <span className="h-1 w-1 rounded-full bg-current" />
                {recordCount === 0 ? "Aucune donnée" : `${recordCount} Stats`}
              </p>
            )}
          </div>

          <div className="w-28 h-12 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradientRendement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientRendement)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
          <div className="group/item">
            <div className="flex justify-between items-center text-[10px] mb-1.5">
              <span className="font-bold text-slate-500 dark:text-slate-400 group-hover/item:text-sky-500 transition-colors">1er Choix (C1)</span>
              <span className="font-black px-1.5 py-0.5 bg-sky-500/10 rounded text-sky-600 ring-1 ring-sky-500/20">
                {choix1Pct.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-sky-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${choix1Pct}%` }}
              />
            </div>
          </div>

          <div className="group/item">
            <div className="flex justify-between items-center text-[10px] mb-1.5">
              <span className="font-bold text-slate-500 dark:text-slate-400 group-hover/item:text-slate-400 transition-colors">Hors-C1 (Déclassement)</span>
              <span className="font-black px-1.5 py-0.5 bg-slate-500/10 rounded text-slate-500 ring-1 ring-slate-500/20">
                {nonChoix1Pct.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-slate-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${nonChoix1Pct}%` }}
              />
            </div>
          </div>
        </div>

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
                🎯 Obj. ≥ {objective}%
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
