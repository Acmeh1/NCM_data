import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface FilterConfig {
  key: string;
  label: string;
  type: "date" | "select" | "text";
}

interface Props {
  data: Record<string, any>[];
  filters: FilterConfig[];
  onFilteredData: (filtered: Record<string, any>[]) => void;
}

export function useTableFilters<T extends Record<string, any>>(
  data: T[],
  filterConfigs: FilterConfig[]
) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const uniqueValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    filterConfigs.forEach((f) => {
      if (f.type === "select") {
        const vals = [...new Set(data.map((d) => String(d[f.key] ?? "")).filter(Boolean))];
        vals.sort();
        result[f.key] = vals;
      }
    });
    return result;
  }, [data, filterConfigs]);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      return filterConfigs.every((f) => {
        const val = filterValues[f.key];
        if (!val) return true;
        const rowVal = String(row[f.key] ?? "");
        if (f.type === "text") {
          return val === "" || rowVal.toLowerCase().includes(val.toLowerCase());
        }
        if (f.type === "date") {
          return rowVal.includes(val);
        }
        return rowVal === val;
      });
    });
  }, [data, filterValues, filterConfigs]);

  const setFilter = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilterValues({});
  const hasActiveFilters = Object.values(filterValues).some(Boolean);

  return { filteredData, filterValues, setFilter, clearFilters, hasActiveFilters, uniqueValues };
}

interface TableFiltersProps {
  filterConfigs: FilterConfig[];
  filterValues: Record<string, string>;
  uniqueValues: Record<string, string[]>;
  onSetFilter: (key: string, value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export default function TableFilters({
  filterConfigs,
  filterValues,
  uniqueValues,
  onSetFilter,
  onClear,
  hasActiveFilters,
}: TableFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/30">
      <Filter className="h-4 w-4 text-muted-foreground mt-1" />
      {filterConfigs.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs text-muted-foreground">{f.label}</Label>
          {f.type === "text" ? (
            <Input
              type="text"
              placeholder={`Rechercher...`}
              className="h-8 text-xs w-[160px]"
              value={filterValues[f.key] ?? ""}
              onChange={(e) => onSetFilter(f.key, e.target.value)}
            />
          ) : f.type === "date" ? (
            <Input
              type="date"
              className="h-8 text-xs w-[140px]"
              value={filterValues[f.key] ?? ""}
              onChange={(e) => onSetFilter(f.key, e.target.value)}
            />
          ) : (
            <Select
              value={filterValues[f.key] ?? "__all__"}
              onValueChange={(v) => onSetFilter(f.key, v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous</SelectItem>
                {(uniqueValues[f.key] ?? []).map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onClear}>
          <X className="h-3 w-3" /> Réinitialiser
        </Button>
      )}
    </div>
  );
}
