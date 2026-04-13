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
}

export default function ScrapRateKpiCard({
  currentRate,
  variation,
  trendData,
  choix2Pct,
  choix3Pct,
  recordCount
}: ScrapRateKpiCardProps) {
  const isBetter = variation < 0; // Negative variation in scrap is good

  return (
    <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-slate-900">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Taux de Rebut
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-extrabold tracking-tight">
                {currentRate.toFixed(2)}<span className="text-lg font-bold">%</span>
              </h2>
              <div className={cn(
                "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold",
                isBetter ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
              )}>
                {isBetter ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {Math.abs(variation).toFixed(1)}%
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">vs période précédente</p>
            {recordCount !== undefined && (
              <p className={cn(
                "text-[10px] font-semibold mt-0.5",
                recordCount === 0 ? "text-rose-500" : "text-emerald-600"
              )}>
                {recordCount === 0
                  ? "⚠ 0 données — vérifier colonne production_date"
                  : `✓ ${recordCount} enregistrements qualité`}
              </p>
            )}
          </div>

          <div className="w-32 h-14 translate-y-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradientScrap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isBetter ? "#10b981" : "#f43f5e"} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={isBetter ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke={isBetter ? "#10b981" : "#f43f5e"}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradientScrap)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-muted/50">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-medium text-slate-600 dark:text-slate-400">2ème Choix (Qualité B)</span>
              <span className="font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300">
                {choix2Pct.toFixed(1)}%
              </span>
            </div>
            <Progress value={choix2Pct} className="h-1.5 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-amber-500" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-medium text-slate-600 dark:text-slate-400">3ème Choix / Rebut</span>
              <span className="font-bold px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/30 rounded text-rose-600">
                {choix3Pct.toFixed(1)}%
              </span>
            </div>
            <Progress value={choix3Pct} className="h-1.5 bg-rose-50 dark:bg-rose-950/30" indicatorClassName="bg-rose-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
