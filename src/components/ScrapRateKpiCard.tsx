import React from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface ScrapTrendPoint {
  date: string;
  rate: number;
}

interface ScrapRateKpiCardProps {
  currentRate: number;
  variation: number;
  trendData: ScrapTrendPoint[];
  choix2Pct: number;
  choix3Pct: number;
  recordCount?: number;
  objective?: number;
  formula?: string;
}

export default function ScrapRateKpiCard({
  currentRate,
  variation,
  trendData,
  choix2Pct,
  choix3Pct,
  recordCount,
  objective,
  formula,
}: ScrapRateKpiCardProps) {
  const isBetter = variation < 0; // Negative variation in scrap is good
  const meetsObjective = objective !== undefined ? currentRate <= objective : null;

  return (
    <Card className="overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="p-1 rounded-md bg-amber-500/10">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </div>
              Taux de Rebut
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
                  {isBetter ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
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
                {recordCount === 0 ? "Données manquantes" : `${recordCount} Stats`}
              </p>
            )}
          </div>

          <div className="w-28 h-12 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradientScrap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isBetter ? "#10b981" : "#f43f5e"} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={isBetter ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke={isBetter ? "#10b981" : "#f43f5e"}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientScrap)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
          <div className="group/item">
            <div className="flex justify-between items-center text-[10px] mb-1.5">
              <span className="font-bold text-slate-500 dark:text-slate-400 group-hover/item:text-amber-500 transition-colors">2ème Choix (Qualité B)</span>
              <span className="font-black px-1.5 py-0.5 bg-amber-500/10 rounded text-amber-600 ring-1 ring-amber-500/20">
                {choix2Pct.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${choix2Pct}%` }}
              />
            </div>
          </div>

          <div className="group/item">
            <div className="flex justify-between items-center text-[10px] mb-1.5">
              <span className="font-bold text-slate-500 dark:text-slate-400 group-hover/item:text-rose-500 transition-colors">3ème Choix / Rebut</span>
              <span className="font-black px-1.5 py-0.5 bg-rose-500/10 rounded text-rose-600 ring-1 ring-rose-500/20">
                {choix3Pct.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-rose-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${choix3Pct}%` }}
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
                🎯 Obj. ≤ {objective}%
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
