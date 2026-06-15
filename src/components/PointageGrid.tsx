import React, { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { format, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import PointageDayCell from "./PointageDayCell";
import {
  type Employee,
  type PointageRow,
  getEmployeeName,
  STATUT_OPTIONS,
} from "@/hooks/usePointageStore";

interface PointageGridProps {
  employees: Employee[];
  daysOfMonth: Date[];
  getCellData: (matricule: string, dateStr: string) => PointageRow;
  updateCell: (matricule: string, dateStr: string, updates: Partial<PointageRow>) => void;
  cycleStatut: (matricule: string, dateStr: string) => void;
  searchQuery: string;
}

// Day header labels
const DAY_NAMES_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

export default function PointageGrid({
  employees,
  daysOfMonth,
  getCellData,
  updateCell,
  cycleStatut,
  searchQuery,
}: PointageGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Virtualization
  const rowVirtualizer = useVirtualizer({
    count: employees.length, // Initial count, will be updated below
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter((emp) => {
      const name = getEmployeeName(emp).toLowerCase();
      const mat = (emp.Matricule || "").toLowerCase();
      return name.includes(q) || mat.includes(q);
    });
  }, [employees, searchQuery]);

  // Column totals per day
  const dayTotals = useMemo(() => {
    return daysOfMonth.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      let present = 0;
      let absent = 0;
      let total = 0;

      filteredEmployees.forEach((emp) => {
        const cell = getCellData(emp.Matricule, dateStr);
        if (
          cell.statut !== "WEEKEND" &&
          cell.statut !== "FERIE" &&
          cell.statut !== "DEBUT_CONTRAT" &&
          cell.statut !== "FIN_CONTRAT"
        ) {
          total++;
          if (cell.statut === "PRESENT") present++;
          if (cell.statut === "ABS_AUTORISEE" || cell.statut === "ABS_NON_AUTORISEE") absent++;
        }
      });

      return { present, absent, total };
    });
  }, [daysOfMonth, filteredEmployees, getCellData]);

  // Per-employee row totals
  const getRowTotals = (matricule: string) => {
    let present = 0;
    let absAutorisee = 0;
    let absNonAutorisee = 0;
    let hsupp = 0;
    let retard = 0;
    let mise_a_pied = 0;

    daysOfMonth.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const cell = getCellData(matricule, dateStr);
      switch (cell.statut) {
        case "PRESENT":           present++;  break;
        case "ABS_AUTORISEE":     absAutorisee++;  break;
        case "ABS_NON_AUTORISEE": absNonAutorisee++;  break;
      }
      hsupp += cell.heures_supp || 0;
      retard += cell.retard || 0;
      if (cell.mise_a_pied) mise_a_pied++;
    });

    return { present, absAutorisee, absNonAutorisee, hsupp, retard, mise_a_pied };
  };

  if (filteredEmployees.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">Aucun employé trouvé</p>
        <p className="text-sm mt-1">Vérifiez le filtre ou la recherche.</p>
      </div>
    );
  }

  // Update virtualizer count with filtered employees
  rowVirtualizer.setOptions({
    ...rowVirtualizer.options,
    count: filteredEmployees.length,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
    : 0;
  const colSpanCount = daysOfMonth.length + 7;

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
      <div ref={scrollRef} className="overflow-auto max-h-[70vh]">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-20">
            {/* Day numbers row */}
            <tr className="bg-slate-50 border-b border-slate-200">
              <th
                className="sticky left-0 z-30 bg-slate-50 px-3 py-2 text-left font-bold text-slate-600 border-r border-slate-200 min-w-[180px]"
                rowSpan={2}
              >
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400">Employé</span>
                  <span className="text-slate-600 text-xs">
                    {filteredEmployees.length} personne{filteredEmployees.length > 1 ? "s" : ""}
                  </span>
                </div>
              </th>
              {daysOfMonth.map((day, idx) => {
                const dayOfWeek = getDay(day);
                const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Vendredi + Samedi
                return (
                  <th
                    key={idx}
                    className={cn(
                      "px-0.5 pt-1.5 pb-0 text-center font-bold min-w-[34px]",
                      isWeekend
                        ? "bg-slate-200/50 text-slate-400"
                        : "text-slate-600"
                    )}
                  >
                    <span className="text-[9px] uppercase text-slate-400 block leading-none">
                      {DAY_NAMES_SHORT[dayOfWeek]}
                    </span>
                  </th>
                );
              })}
              {/* Summary columns */}
              <th className="px-2 py-2 text-center font-bold text-emerald-600 bg-emerald-50/50 min-w-[36px] border-l border-slate-200" rowSpan={2} title="Présents">
                <span className="text-[8px] uppercase block leading-tight">P</span>
              </th>
              <th className="px-2 py-2 text-center font-bold text-blue-600 bg-blue-50/50 min-w-[36px]" rowSpan={2} title="Absences Autorisées">
                <span className="text-[8px] uppercase block leading-tight">AA</span>
              </th>
              <th className="px-2 py-2 text-center font-bold text-red-600 bg-red-50/50 min-w-[36px]" rowSpan={2} title="Absences Non Autorisées">
                <span className="text-[8px] uppercase block leading-tight">AN</span>
              </th>
              <th className="px-2 py-2 text-center font-bold text-primary bg-primary/5 min-w-[40px]" rowSpan={2} title="Heures Supplémentaires">
                <span className="text-[8px] uppercase block leading-tight">H.S</span>
              </th>
              <th className="px-2 py-2 text-center font-bold text-amber-700 bg-amber-50/30 min-w-[40px]" rowSpan={2} title="Retard">
                <span className="text-[8px] uppercase block leading-tight">RET</span>
              </th>
              <th className="px-2 py-2 text-center font-bold text-purple-600 bg-purple-50/50 min-w-[40px]" rowSpan={2} title="Mise à pied">
                <span className="text-[8px] uppercase block leading-tight">MP</span>
              </th>
            </tr>
            {/* Day numbers */}
            <tr className="bg-slate-50 border-b border-slate-200">
              {daysOfMonth.map((day, idx) => {
                const dayOfWeek = getDay(day);
                const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Vendredi + Samedi
                return (
                  <th
                    key={idx}
                    className={cn(
                      "px-0.5 pb-1.5 pt-0 text-center font-bold min-w-[34px]",
                      isWeekend
                        ? "bg-slate-200/50 text-slate-400"
                        : "text-slate-700"
                    )}
                  >
                    {format(day, "d")}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={colSpanCount} />
              </tr>
            )}
            {virtualItems.map((virtualRow) => {
              const empIdx = virtualRow.index;
              const emp = filteredEmployees[empIdx];
              const rowTotals = getRowTotals(emp.Matricule);
              return (
                <tr
                  key={emp.Matricule}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className={cn(
                    "border-b border-slate-100 transition-colors",
                    empIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                    "hover:bg-primary/[0.02]"
                  )}
                >
                  {/* Employee info */}
                  <td className="sticky left-0 z-10 px-3 py-1 border-r border-slate-200 bg-inherit">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 text-[11px] truncate max-w-[160px]">
                        {getEmployeeName(emp)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 font-mono">
                          {emp.Matricule}
                        </span>
                        {emp.Service && (
                          <span className="text-[8px] text-primary/60 font-medium">
                            {emp.Service}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Day cells */}
                  {daysOfMonth.map((day, dayIdx) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const cellData = getCellData(emp.Matricule, dateStr);
                    return (
                      <td key={dayIdx} className="px-0.5 py-0.5">
                        <PointageDayCell
                          cellData={cellData}
                          day={day}
                          onCycleStatut={() => cycleStatut(emp.Matricule, dateStr)}
                          onUpdateCell={(updates) => updateCell(emp.Matricule, dateStr, updates)}
                        />
                      </td>
                    );
                  })}

                  {/* Row totals */}
                  <td className="px-1 py-1 text-center font-bold text-emerald-700 text-[10px] bg-emerald-50/30 border-l border-slate-200">
                    {rowTotals.present}
                  </td>
                  <td className="px-1 py-1 text-center font-bold text-blue-700 text-[10px] bg-blue-50/30">
                    {rowTotals.absAutorisee || ""}
                  </td>
                  <td className="px-1 py-1 text-center font-bold text-red-700 text-[10px] bg-red-50/30">
                    {rowTotals.absNonAutorisee || ""}
                  </td>
                  <td className="px-1 py-1 text-center font-bold text-primary text-[10px] bg-primary/5">
                    {rowTotals.hsupp || ""}
                  </td>
                  <td className="px-1 py-1 text-center font-bold text-amber-700 text-[10px] bg-amber-50/5">
                    {rowTotals.retard || ""}
                  </td>
                  <td className="px-1 py-1 text-center font-bold text-purple-700 text-[10px] bg-purple-50/30 border-r border-slate-200">
                    {rowTotals.mise_a_pied ? "✓" : ""}
                  </td>
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={colSpanCount} />
              </tr>
            )}
          </tbody>

          {/* Footer totals */}
          <tfoot className="sticky bottom-0 z-20">
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
              <td className="sticky left-0 z-30 bg-slate-100 px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 border-r border-slate-200">
                Totaux
              </td>
              {daysOfMonth.map((_, idx) => {
                const totals = dayTotals[idx];
                const rate = totals.total > 0 ? Math.round((totals.present / totals.total) * 100) : 0;
                return (
                  <td key={idx} className="px-0.5 py-1.5 text-center">
                    <span
                      className={cn(
                        "text-[8px] font-black block",
                        rate >= 90
                          ? "text-emerald-600"
                          : rate >= 70
                          ? "text-amber-600"
                          : "text-red-600"
                      )}
                    >
                      {totals.total > 0 ? `${rate}%` : ""}
                    </span>
                  </td>
                );
              })}
              <td colSpan={6} className="border-l border-slate-200" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
