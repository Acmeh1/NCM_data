import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface JRow {
  format?: string | null;
  modele?: string | null;
  couleur?: string | null;
  choix_1_m2?: number | null;
  choix_2_m2?: number | null;
  choix_3_m2?: number | null;
  total_m2?: number | null;
}

interface FormatQualitePanelProps {
  data: JRow[];
}

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const FORMAT_PALETTE = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f97316", "#ec4899",
  "#06b6d4", "#84cc16", "#f43f5e", "#14b8a6", "#a78bfa",
];

const CHOIX_CFG = [
  { key: "c1", label: "1er Choix",  fill: "#22c55e", bg: "bg-emerald-100 dark:bg-emerald-900/40", txt: "text-emerald-700 dark:text-emerald-400" },
  { key: "c2", label: "2ème Choix", fill: "#f59e0b", bg: "bg-amber-100  dark:bg-amber-900/40",   txt: "text-amber-700  dark:text-amber-400"   },
  { key: "c3", label: "3ème Choix", fill: "#f43f5e", bg: "bg-rose-100   dark:bg-rose-900/40",    txt: "text-rose-700   dark:text-rose-400"    },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function dominant(c1: number, c2: number, c3: number): 1 | 2 | 3 {
  if (c1 >= c2 && c1 >= c3) return 1;
  if (c2 >= c3) return 2;
  return 3;
}

/* ─── Custom tooltip for donut ───────────────────────────────────────────── */
const DonutTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-xs shadow-xl">
      <p className="font-bold" style={{ color: d.payload.color }}>{d.name}</p>
      <p className="text-muted-foreground">
        {(d.value as number).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} m²
      </p>
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function FormatQualitePanel({ data }: FormatQualitePanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

  /* 1. Format summary (all formats in period) */
  const formatSummary = useMemo(() => {
    const map: Record<string, { fmt: string; c1: number; c2: number; c3: number; total: number }> = {};
    data.forEach((r) => {
      const fmt = String(r.format ?? "").trim();
      if (!fmt) return;
      if (!map[fmt]) map[fmt] = { fmt, c1: 0, c2: 0, c3: 0, total: 0 };
      map[fmt].c1    += Number(r.choix_1_m2) || 0;
      map[fmt].c2    += Number(r.choix_2_m2) || 0;
      map[fmt].c3    += Number(r.choix_3_m2) || 0;
      map[fmt].total += Number(r.total_m2)   || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data]);

  /* 2. Model breakdown for selected format */
  const modelBreakdown = useMemo(() => {
    if (!selectedFormat) return [];
    const map: Record<string, { nom: string; c1: number; c2: number; c3: number; total: number }> = {};
    data.forEach((r) => {
      if (String(r.format ?? "").trim() !== selectedFormat) return;
      const nom = String(r.modele ?? "").trim() || "Inconnu";
      if (!map[nom]) map[nom] = { nom, c1: 0, c2: 0, c3: 0, total: 0 };
      map[nom].c1    += Number(r.choix_1_m2) || 0;
      map[nom].c2    += Number(r.choix_2_m2) || 0;
      map[nom].c3    += Number(r.choix_3_m2) || 0;
      map[nom].total += Number(r.total_m2)   || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data, selectedFormat]);

  const selFmt = formatSummary.find((f) => f.fmt === selectedFormat);

  const donutData = selFmt
    ? CHOIX_CFG.map((c) => ({
        name:  c.label,
        color: c.fill,
        value: selFmt[c.key as "c1" | "c2" | "c3"],
      })).filter((d) => d.value > 0)
    : [];

  if (formatSummary.length === 0) return null;

  const fmtColor = (i: number) => FORMAT_PALETTE[i % FORMAT_PALETTE.length];

  return (
    <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-slate-900">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-blue-500" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Formats produits (période sélectionnée)
          </h3>
          <span className="ml-auto text-[10px] text-muted-foreground italic">
            Cliquez un format pour le détail
          </span>
        </div>

        {/* Format bubbles */}
        <div className="flex flex-wrap gap-2 mb-4">
          {formatSummary.map((f, i) => {
            const color  = fmtColor(i);
            const active = selectedFormat === f.fmt;
            const c1Pct  = f.total > 0 ? Math.round((f.c1 / f.total) * 100) : 0;
            return (
              <button
                key={f.fmt}
                onClick={() => setSelectedFormat(active ? null : f.fmt)}
                className={cn(
                  "group flex flex-col items-start px-3 py-2 rounded-xl border-2 text-left transition-all duration-150",
                  "hover:shadow-md hover:scale-[1.03]",
                  active ? "shadow-lg scale-[1.03]" : "bg-transparent"
                )}
                style={{
                  borderColor: color,
                  backgroundColor: active ? color : undefined,
                  color:            active ? "#fff" : color,
                }}
              >
                <span className="text-xs font-bold leading-none">{f.fmt}</span>
                <span className={cn("text-[10px] mt-0.5 font-medium", active ? "text-white/80" : "text-muted-foreground")}>
                  {f.total.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} m² · C1: {c1Pct}%
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Detail panel ──────────────────────────────────────────────── */}
        {selectedFormat && selFmt && (
          <div className="mt-2 border-t border-muted/40 pt-5 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Title */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h4 className="font-extrabold text-lg tracking-tight">{selectedFormat}</h4>
                <p className="text-xs text-muted-foreground">
                  {selFmt.total.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} m² produits ·{" "}
                  {modelBreakdown.length} modèle{modelBreakdown.length > 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedFormat(null)}
                className="rounded-full p-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* ── Donut chart ──────────────────────────────────────── */}
              <div className="flex flex-col items-center justify-start lg:w-52 shrink-0">
                <div className="relative w-44 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        stroke="#fff"
                        strokeWidth={2}
                        dataKey="value"
                      >
                        {donutData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-medium text-muted-foreground">Total</span>
                    <span className="text-base font-extrabold leading-none">
                      {selFmt.total >= 1000
                        ? (selFmt.total / 1000).toFixed(1) + "k"
                        : selFmt.total.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">m²</span>
                  </div>
                </div>

                {/* Donut legend */}
                <div className="w-full space-y-2 mt-3">
                  {donutData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: d.color }}
                        />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">
                          {selFmt.total > 0
                            ? ((d.value / selFmt.total) * 100).toFixed(1) + "%"
                            : "—"}
                        </span>
                        <span className="text-muted-foreground ml-1 text-[10px]">
                          ({d.value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} m²)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Model ranking table ───────────────────────────────── */}
              <div className="flex-1 min-w-0">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 text-left w-8 font-medium">Rg</th>
                      <th className="pb-2 text-left font-medium">Modèle</th>
                      <th className="pb-2 text-center font-medium">Choix</th>
                      <th className="pb-2 text-right font-medium">m²</th>
                      <th className="pb-2 text-right font-medium min-w-[110px]">Part format</th>
                      <th className="pb-2 text-right font-medium">Rebut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelBreakdown.map((m, i) => {
                      const pct   = selFmt.total > 0 ? (m.total / selFmt.total) * 100 : 0;
                      const dom   = dominant(m.c1, m.c2, m.c3);
                      const rebut = m.total > 0 ? ((m.c2 + m.c3) / m.total) * 100 : 0;
                      const cfg   = CHOIX_CFG[dom - 1];
                      const barColor = dom === 1 ? "#22c55e" : dom === 2 ? "#f59e0b" : "#f43f5e";
                      const rebutColor =
                        rebut < 2 ? "text-emerald-600" : rebut < 6 ? "text-amber-600" : "text-rose-600";

                      return (
                        <tr
                          key={m.nom}
                          className="border-b border-muted/30 hover:bg-muted/20 transition-colors"
                        >
                          {/* Rank */}
                          <td className="py-2.5">
                            <span
                              className={cn(
                                "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
                                i === 0
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                  : i === 1
                                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                  : i === 2
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {i + 1}
                            </span>
                          </td>

                          {/* Modèle */}
                          <td className="py-2.5 font-medium max-w-[160px]">
                            <span title={m.nom} className="block truncate">
                              {m.nom}
                            </span>
                          </td>

                          {/* Choix badge */}
                          <td className="py-2.5 text-center">
                            <span
                              className={cn(
                                "inline-block px-1.5 py-0.5 rounded text-[10px] font-bold",
                                cfg.bg, cfg.txt
                              )}
                            >
                              {cfg.label}
                            </span>
                          </td>

                          {/* m² */}
                          <td className="py-2.5 text-right font-semibold tabular-nums">
                            {m.total.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                          </td>

                          {/* Progress bar + % */}
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                    background: barColor,
                                  }}
                                />
                              </div>
                              <span
                                className="text-[10px] font-bold w-10 text-right tabular-nums"
                                style={{ color: barColor }}
                              >
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* Rebut */}
                          <td className={cn("py-2.5 text-right font-semibold tabular-nums", rebutColor)}>
                            {rebut.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {modelBreakdown.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    Aucun modèle trouvé pour ce format.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
