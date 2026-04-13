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
}

export default function RendementKpiCard({
  currentRate,
  variation,
  trendData,
  choix1Pct,
  nonChoix1Pct,
  recordCount
}: RendementKpiCardProps) {
  const isBetter = variation > 0; // More yield = better

  return (
    <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-slate-900">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Gauge className="h-3 w-3 text-sky-500" />
              Rendement
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-extrabold tracking-tight">
                {currentRate.toFixed(2)}<span className="text-lg font-bold">%</span>
              </h2>
              <div className={cn(
                "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold",
                isBetter ? "bg-sky-500/10 text-sky-600" : "bg-violet-500/10 text-violet-600"
              )}>
                {isBetter ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(variation).toFixed(1)}%
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">vs période précédente</p>
            {recordCount !== undefined && (
              <p className={cn(
                "text-[10px] font-semibold mt-0.5",
                recordCount === 0 ? "text-rose-500" : "text-sky-600"
              )}>
                {recordCount === 0
                  ? "⚠ 0 données — vérifier production_date"
                  : `✓ ${recordCount} enregistrements`}
              </p>
            )}
          </div>

          <div className="w-32 h-14 translate-y-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradientRendement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradientRendement)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-muted/50">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-medium text-slate-600 dark:text-slate-400">1er Choix (Bonne production)</span>
              <span className="font-bold px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950/30 rounded text-sky-600">
                {choix1Pct.toFixed(1)}%
              </span>
            </div>
            <Progress value={choix1Pct} className="h-1.5 bg-sky-50 dark:bg-sky-950/30" indicatorClassName="bg-sky-500" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-medium text-slate-600 dark:text-slate-400">Rebut (Choix 2 + 3)</span>
              <span className="font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300">
                {nonChoix1Pct.toFixed(1)}%
              </span>
            </div>
            <Progress value={nonChoix1Pct} className="h-1.5 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-slate-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
