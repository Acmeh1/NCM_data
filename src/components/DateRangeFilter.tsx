import React, { useState, useEffect } from "react";
import { format, subDays, startOfDay, endOfDay, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown, Activity, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type AggregationType } from "./AnalyticsFilterBar";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  range: DateRange;
  onRangeChange: (range: DateRange, presetId?: string) => void;
  granularity: AggregationType;
  onGranularityChange: (g: AggregationType) => void;
  activePreset?: string;
}

const PRESETS = [
  { id: 'today', label: 'Aujourd\'hui', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { id: 'yesterday', label: 'Hier', getValue: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { id: '7d', label: '7 derniers jours', getValue: () => ({ from: startOfDay(subDays(new Date(), 6)), to: new Date() }) },
  { id: '30d', label: '30 derniers jours', getValue: () => ({ from: startOfDay(subDays(new Date(), 29)), to: new Date() }) },
  { id: 'month', label: 'Ce mois', getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { id: 'quarter', label: 'Ce trimestre', getValue: () => ({ from: startOfQuarter(new Date()), to: new Date() }) },
  { id: 'ytd', label: 'Depuis le début d\'année', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

export default function DateRangeFilter({
  range,
  onRangeChange,
  granularity,
  onGranularityChange,
  activePreset
}: DateRangeFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [localRange, setLocalRange] = useState<any>(range);
  const [activeMonth, setActiveMonth] = useState<Date>(range.from);

  // Sync local range when external range changes
  useEffect(() => {
    if (!isCalendarOpen) {
      setLocalRange(range);
    }
  }, [range, isCalendarOpen]);

  // Ensure activeMonth is set when popover opens
  useEffect(() => {
    if (isCalendarOpen) {
      setActiveMonth(range.from);
    }
  }, [isCalendarOpen]);

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    onRangeChange(preset.getValue(), preset.id);
  };

  const formattedRange = `${format(range.from, "d MMM", { locale: fr })} – ${format(range.to, "d MMM yyyy", { locale: fr })}`;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className={cn(
                "px-3.5 py-1.5 text-[13px] border rounded-[8px] transition-all whitespace-nowrap",
                activePreset === preset.id
                  ? "bg-[#1D9E75] border-[#1D9E75] text-white font-medium"
                  : "bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {preset.label}
            </button>
          ))}
          
          <div className="w-[1px] h-5 bg-border mx-1 hidden sm:block" />

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 border rounded-[8px] text-[13px] text-muted-foreground transition-all",
                  isCalendarOpen ? "bg-muted text-foreground" : "bg-transparent border-border hover:bg-muted/50"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>Période personnalisée</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                month={activeMonth}
                onMonthChange={setActiveMonth}
                selected={localRange}
                onSelect={(newRange: any) => {
                  setLocalRange(newRange);
                  if (newRange?.from && newRange?.to) {
                    onRangeChange({ from: newRange.from, to: newRange.to }, "custom");
                    setIsCalendarOpen(false);
                  }
                }}
                numberOfMonths={2}
                disabled={(date) => date > new Date()}
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          <div className="px-3 py-1.5 bg-muted/50 rounded-[8px] border border-border/50 text-[12px] text-muted-foreground">
            Affichage: <span className="text-foreground font-medium">{formattedRange}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-muted/30 rounded-[10px] border">
          {(["day", "week", "month"] as const).map((g) => (
            <button
              key={g}
              onClick={() => onGranularityChange(g)}
              className={cn(
                "px-3 py-1 rounded-[7px] text-[12px] transition-all whitespace-nowrap",
                granularity === g
                  ? "bg-white shadow-sm text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {g === "day" ? "Jour" : g === "week" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
