import { useSearchParams } from "react-router-dom";
import { format as formatISO, startOfMonth, parseISO } from "date-fns";
import { useMemo, useCallback } from "react";
import { DateRange } from "@/components/DateRangeFilter";
import { AggregationType, DisplayType } from "@/components/AnalyticsFilterBar";

export function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL synced state
  const startDate = searchParams.get("startDate") || formatISO(startOfMonth(new Date()), "yyyy-MM-dd");
  const endDate = searchParams.get("endDate") || formatISO(new Date(), "yyyy-MM-dd");
  const period = (searchParams.get("period") || "day") as AggregationType;
  const activePreset = searchParams.get("preset") || "month";
  const selectedGroups = searchParams.get("groups")?.split(",").filter(Boolean) || [];
  const displayType = (searchParams.get("display") || "Graphiques") as DisplayType;

  const currentRange = useMemo<DateRange>(() => ({
    from: parseISO(startDate),
    to: parseISO(endDate)
  }), [startDate, endDate]);

  const updateFilters = useCallback((params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const setRange = (range: DateRange, presetId?: string) => {
    updateFilters({
      startDate: formatISO(range.from, "yyyy-MM-dd"),
      endDate: formatISO(range.to, "yyyy-MM-dd"),
      preset: presetId || "custom"
    });
  };

  const setPeriod = (p: AggregationType) => updateFilters({ period: p });
  const setGroups = (groups: string[]) => updateFilters({ groups: groups.join(",") });
  const setDisplayType = (d: DisplayType) => updateFilters({ display: d });

  return {
    startDate,
    endDate,
    currentRange,
    period,
    activePreset,
    selectedGroups,
    displayType,
    setRange,
    setPeriod,
    setGroups,
    setDisplayType
  };
}
