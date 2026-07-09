import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ColoredKpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  bgColorClass: string; 
  textColorClass?: string; 
  
  // For objective + progress
  objectiveLabel?: string;
  objectiveValue?: string | number;
  progressPercent?: number;
  progressColorClass?: string;

  // For variation
  variationLabel?: string;
  variationValue?: string | number;
  variationPercent?: number;
  isPositive?: boolean;

  icon?: React.ReactNode;
}

export default function ColoredKpiCard({
  title,
  value,
  unit,
  bgColorClass,
  textColorClass = "text-white",
  objectiveLabel,
  objectiveValue,
  progressPercent,
  progressColorClass = "bg-white/90",
  variationLabel,
  variationValue,
  variationPercent,
  isPositive,
  icon
}: ColoredKpiCardProps) {
  return (
    <Card className={cn("overflow-hidden border-0 shadow-md transition-transform duration-300 hover:-translate-y-1", bgColorClass, textColorClass)}>
      <CardContent className="p-4 flex flex-col justify-between h-full min-h-[120px]">
        <div className="flex justify-between items-start">
          <h3 className="text-[13px] font-medium opacity-90">{title}</h3>
          {icon && <div className="opacity-70">{icon}</div>}
        </div>
        
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {unit && <span className="text-sm font-medium opacity-80">{unit}</span>}
        </div>

        <div className="mt-auto pt-3 flex flex-col gap-1.5">
          {objectiveLabel && (
            <>
              <div className="flex justify-between items-end text-[11px] opacity-90">
                <span>{objectiveLabel}: {objectiveValue}</span>
                {progressPercent !== undefined && <span className="font-bold">{progressPercent.toFixed(1)}%</span>}
              </div>
              {progressPercent !== undefined && (
                <div className="h-1 w-full bg-black/20 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", progressColorClass)} style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
                </div>
              )}
            </>
          )}

          {variationLabel && (
            <div className="flex justify-between items-center text-[11px] opacity-90">
              <span>{variationLabel}: {variationValue}</span>
              {variationPercent !== undefined && (
                <span className={cn("flex items-center gap-0.5 font-bold", isPositive ? "text-emerald-400" : "text-rose-400")}>
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(variationPercent).toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
