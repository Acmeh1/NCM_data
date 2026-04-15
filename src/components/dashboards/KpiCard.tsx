import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  variation?: number;
  lowerIsBetter?: boolean;
  color?: string;
  description?: string;
  objective?: number;
}

export default function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  variation,
  lowerIsBetter = false,
  color = "blue",
  description,
  objective,
}: KpiCardProps) {
  const isBetter = variation !== undefined 
    ? (lowerIsBetter ? variation <= 0 : variation >= 0) 
    : null;

  return (
    <Card className="overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className={cn("p-1 rounded-md", `bg-${color}-500/10`)}>
                <Icon className={cn("h-3.5 w-3.5", `text-${color}-500`)} />
              </div>
              {label}
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-950 to-slate-600 dark:from-white dark:to-slate-400">
                  {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
                </h2>
                {unit && <span className="text-sm font-bold text-slate-500/80 uppercase">{unit}</span>}
              </div>

              {variation !== undefined && (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm ring-1 ring-inset",
                      isBetter
                        ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 ring-rose-500/20"
                    )}
                  >
                    {variation >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(variation).toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">vs prev.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {description && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50">
            <p className="text-[10px] text-slate-400 leading-relaxed italic">
              {description}
            </p>
          </div>
        )}

        {objective !== undefined && (
          <div className="mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-1">
            🎯 Objectif : {objective}{unit}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
