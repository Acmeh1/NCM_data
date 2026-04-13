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
}

export default function VolumeProduitsKpiCard({
  totalVolume,
  prevVolume,
  trendData,
  groupBreakdown,
  periodDays,
}: VolumeProduitsKpiCardProps) {
  // Variation vs previous period
  const variation = prevVolume > 0 ? ((totalVolume - prevVolume) / prevVolume) * 100 : 0;
  const isBetter = variation >= 0;

  // Daily average
  const dailyAvg = periodDays > 0 ? totalVolume / periodDays : 0;

  return (
    <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-slate-900">
      <CardContent className="p-5">
        {/* ── Header row: big number + mini area chart ─────────────── */}
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <SquareStack className="h-3 w-3 text-orange-500" />
              Volume Produit (Cuisson)
            </p>

            {/* Main value */}
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-extrabold tracking-tight">
                {totalVolume.toLocaleString("fr-FR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
                <span className="text-lg font-bold ml-1">m²</span>
              </h2>

              {/* Variation badge — orange/amber palette, distinct from other KPIs */}
              <div
                className={cn(
                  "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold",
                  isBetter
                    ? "bg-orange-500/10 text-orange-600"
                    : "bg-amber-600/10 text-amber-700"
                )}
              >
                {isBetter ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(variation).toFixed(1)}%
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground italic">
              vs période précédente
            </p>
            <p className="text-[10px] font-semibold text-orange-600 mt-0.5">
              ⌀ {dailyAvg.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} m²/jour
            </p>
          </div>

          {/* Mini area chart */}
          <div className="w-32 h-14 translate-y-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradientVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f97316"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradientVolume)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Horizontal bars by group ──────────────────────────────── */}
        {groupBreakdown.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-muted/50">
            {groupBreakdown.map((g) => (
              <div key={g.label} className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-medium text-slate-600 dark:text-slate-400">
                    {g.label}
                  </span>
                  <span className="font-bold px-1.5 py-0.5 bg-orange-50 dark:bg-orange-950/30 rounded text-orange-600">
                    {g.pct.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={g.pct}
                  className="h-1.5 bg-orange-50 dark:bg-orange-950/30"
                  indicatorClassName="bg-orange-500"
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {g.value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} m²
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
