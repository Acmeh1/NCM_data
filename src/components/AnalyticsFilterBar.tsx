import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AggregationType = "day" | "week" | "month";
export type DisplayType = "Graphiques" | "Tableau" | "KPIs";

interface AnalyticsFilterBarProps {
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  aggregation: AggregationType;
  onAggregationChange: (v: AggregationType) => void;
  selectedGroups: string[]; // e.g. ["A", "B", "C", "D"]
  onGroupsChange: (v: string[]) => void;
  displayType: DisplayType;
  onDisplayTypeChange: (v: DisplayType) => void;
}

const GROUPS = ["A", "B", "C", "D"];
const GROUP_COLORS: Record<string, string> = {
  A: "text-blue-500",
  B: "text-emerald-500",
  C: "text-orange-500",
  D: "text-pink-500",
};

const GROUP_BG_COLORS: Record<string, string> = {
  A: "bg-blue-500/10",
  B: "bg-emerald-500/10",
  C: "bg-orange-500/10",
  D: "bg-pink-500/10",
};

export default function AnalyticsFilterBar({
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  aggregation,
  onAggregationChange,
  selectedGroups,
  onGroupsChange,
  displayType,
  onDisplayTypeChange,
}: AnalyticsFilterBarProps) {
  
  const handleToggleGroup = (group: string) => {
    if (group === "all") {
      onGroupsChange([]);
      return;
    }
    
    if (selectedGroups.includes(group)) {
      const next = selectedGroups.filter(g => g !== group);
      onGroupsChange(next);
    } else {
      onGroupsChange([...selectedGroups, group]);
    }
  };

  const isAllGroups = selectedGroups.length === 0;

  const activeFilters = [
    dateFrom && { label: `Depuis: ${dateFrom}`, onRemove: () => onDateFromChange("") },
    dateTo && { label: `Jusqu'à: ${dateTo}`, onRemove: () => onDateToChange("") },
    aggregation !== "day" && { label: `Agrégation: ${aggregation === "week" ? "Semaine" : "Mois"}`, onRemove: () => onAggregationChange("day") },
    ...selectedGroups.map(g => ({ label: `Groupe: ${g}`, onRemove: () => onGroupsChange(selectedGroups.filter(sg => sg !== g)) })),
    displayType !== "Graphiques" && { label: `Affichage: ${displayType}`, onRemove: () => onDisplayTypeChange("Graphiques") },
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  const clearAll = () => {
    onDateFromChange("");
    onDateToChange("");
    onAggregationChange("day");
    onGroupsChange([]);
    onDisplayTypeChange("Graphiques");
  };

  return (
    <div className="space-y-4">
      {/* Main Filter Bar */}
      <div className="flex items-center gap-4 bg-card border-[0.5px] rounded-[12px] p-[14px_16px] shadow-none overflow-x-auto no-scrollbar">
        
        {/* Période */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden xl:inline">Période</span>
          <div className="flex items-center gap-1.5 p-1 bg-muted/30 rounded-[20px] border-[0.5px]">
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-7 w-28 bg-transparent border-none text-[12px] px-2 focus-visible:ring-0" 
            />
            <span className="text-muted-foreground text-[12px]">→</span>
            <Input 
              type="date" 
              value={dateTo} 
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-7 w-28 bg-transparent border-none text-[12px] px-2 focus-visible:ring-0" 
            />
          </div>
        </div>

        <div className="w-[0.5px] h-6 bg-border shrink-0" />

        {/* Agrégation */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {(["day", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => onAggregationChange(p)}
                className={cn(
                  "rounded-[20px] text-[12px] px-[11px] py-[5px] border-[0.5px] transition-all",
                  aggregation === p 
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" 
                    : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground"
                )}
              >
                {p === "day" ? "Jour" : p === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
        </div>

        <div className="w-[0.5px] h-6 bg-border shrink-0" />

        {/* Groupe */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleToggleGroup("all")}
              className={cn(
                "rounded-[20px] text-[12px] px-[11px] py-[5px] border-[0.5px] transition-all",
                isAllGroups 
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" 
                  : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground"
              )}
            >
              Tous
            </button>
            {GROUPS.map((g) => {
              const active = selectedGroups.includes(g);
              const colorClass = GROUP_COLORS[g];
              const bgClass = GROUP_BG_COLORS[g];
              return (
                <button
                  key={g}
                  onClick={() => handleToggleGroup(g)}
                  className={cn(
                    "rounded-[20px] text-[12px] px-[11px] py-[5px] border-[0.5px] transition-all",
                    active 
                      ? `${colorClass} ${bgClass} border-transparent font-bold` 
                      : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground"
                  )}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-[0.5px] h-6 bg-border shrink-0" />

        {/* Affichage */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {(["Graphiques", "Tableau", "KPIs"] as const).map((d) => (
              <button
                key={d}
                onClick={() => onDisplayTypeChange(d)}
                className={cn(
                  "rounded-[20px] text-[12px] px-[11px] py-[5px] border-[0.5px] transition-all",
                  displayType === d 
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" 
                    : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filters Bar */}
      <div className="flex items-center gap-2 flex-wrap min-h-[24px]">
        {activeFilters.length > 0 ? (
          <>
            {activeFilters.map((f, i) => (
              <div key={i} className="flex items-center gap-1 bg-muted/50 rounded-[4px] px-2 py-0.5 text-[11px] text-muted-foreground border-[0.5px]">
                {f.label}
                <button onClick={f.onRemove} className="hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {activeFilters.length > 1 && (
              <button 
                onClick={clearAll}
                className="text-[11px] text-blue-500 hover:underline ml-2"
              >
                Tout effacer
              </button>
            )}
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">Aucun filtre actif — affichage complet</span>
        )}
      </div>
    </div>
  );
}
