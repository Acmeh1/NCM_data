import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Trophy, TrendingUp, Award, ChevronDown } from "lucide-react";

// ── colour palette ────────────────────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  A: "#3B82F6",
  B: "#10B981",
  C: "#F59E0B",
  D: "#EC4899",
};
const RANK_META = [
  { label: "1er", bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  { label: "2ème", bg: "#F3F4F6", text: "#374151", border: "#D1D5DB" },
  { label: "3ème", bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  { label: "4ème", bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
];

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

// ── custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "var(--background, #fff)",
      border: "1px solid #E5E7EB",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    }}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: GROUP_COLORS[d.groupe] || "#111" }}>
        Groupe {d.groupe}
      </p>
      <p style={{ color: "#6B7280" }}>Performance : <strong style={{ color: "#111" }}>{fmt(d.performance)} m²/Jr</strong></p>
      <p style={{ color: "#6B7280" }}>Écart var : <strong style={{ color: d.ecart > 0 ? "#10B981" : "#EF4444" }}>{d.ecart > 0 ? "+" : ""}{d.ecart.toFixed(1)}%</strong></p>
      <p style={{ color: "#6B7280" }}>Métrage : <strong style={{ color: "#111" }}>{fmt(d.total_surface_m2)} m²</strong></p>
      <p style={{ color: "#6B7280" }}>Jours : <strong style={{ color: "#111" }}>{d.jours}</strong></p>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
interface MonthlyGroupDashboardProps {
  startDate?: string;
  endDate?: string;
}

export default function MonthlyGroupDashboard({ startDate, endDate }: MonthlyGroupDashboardProps) {
  const now = new Date();
  
  // Use props if provided, otherwise fallback to current month
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  const from = startDate || `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const to = endDate || `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;

  // ── fetch ──────────────────────────────────────────────────────────────────
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["group-dashboard", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_globale")
        .select("groupe, total_m2, date, horaire")
        .gte("date", from)
        .lte("date", to)
        .limit(5000);

      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        group: row.groupe,
        total_surface_m2: row.total_m2,
        date: row.date,
        horaire: row.horaire
      }));
    },
  });

  // ── aggregate ──────────────────────────────────────────────────────────────
  const groupData = useMemo(() => {
    const mapM2: Record<string, number> = {};
    const mapShifts: Record<string, Set<string>> = {};
    
    rows.forEach((r: any) => {
      const g = r.group || "?";
      mapM2[g] = (mapM2[g] || 0) + (Number(r.total_surface_m2) || 0);
      
      if (!mapShifts[g]) mapShifts[g] = new Set();
      if (r.date) {
        mapShifts[g].add(r.date);
      }
    });

    const rawData = Object.entries(mapM2).map(([groupe, total_surface_m2]) => {
      const jours = mapShifts[groupe]?.size || 0;
      const performance = jours > 0 ? total_surface_m2 / jours : 0;
      return {
        groupe,
        total_surface_m2,
        jours,
        performance,
      };
    });

    const totalM2All = rawData.reduce((s, d) => s + d.total_surface_m2, 0);
    const totalJoursAll = rawData.reduce((s, d) => s + d.jours, 0);
    const moyenneGlobale = totalJoursAll > 0 ? totalM2All / totalJoursAll : 0;

    return rawData
      .map(d => ({
        ...d,
        ecart: moyenneGlobale > 0 ? ((d.performance - moyenneGlobale) / moyenneGlobale) * 100 : 0
      }))
      .sort((a, b) => b.performance - a.performance);
  }, [rows]);

  const winner = groupData[0];
  const totalM2 = groupData.reduce((s, d) => s + d.total_surface_m2, 0);
  const totalJours = groupData.reduce((s, d) => s + d.jours, 0);
  const maxPerformance = Math.max(...groupData.map(d => d.performance), 1);
  const globale = totalJours > 0 ? totalM2 / totalJours : 0;

  // ── year options ───────────────────────────────────────────────────────────
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", width: "100%" }}>

      {/* ── header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)", borderRadius: 10, padding: 8, display: "flex" }}>
            <Trophy size={18} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--foreground,#111)" }}>
              Performance par groupe
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>
              Analylse filtrée · {from} au {to}
            </p>
          </div>
        </div>
      </div>

      {/* ── loading ── */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>
          Chargement des données…
        </div>
      )}

      {/* ── no data ── */}
      {!isLoading && groupData.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>
          Aucune donnée pour ce mois.
        </div>
      )}

      {!isLoading && groupData.length > 0 && (
        <>
          {/* ── winner banner ── */}
          {winner && (
            <div style={{
              background: `linear-gradient(135deg, ${GROUP_COLORS[winner.groupe] || "#3B82F6"}18, ${GROUP_COLORS[winner.groupe] || "#3B82F6"}08)`,
              border: `1.5px solid ${GROUP_COLORS[winner.groupe] || "#3B82F6"}40`,
              borderRadius: 12, padding: "14px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
              marginBottom: 18,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: GROUP_COLORS[winner.groupe] || "#3B82F6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 800, color: "#fff",
                }}>
                  {winner.groupe}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 2 }}>Meilleur groupe du mois</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground,#111)" }}>
                    Groupe {winner.groupe}
                    <span style={{
                      marginLeft: 8, fontSize: 11, fontWeight: 600,
                      background: "#FEF3C7", color: "#92400E",
                      padding: "2px 8px", borderRadius: 20,
                    }}>
                      🏆 Prime
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: GROUP_COLORS[winner.groupe] || "#3B82F6" }}>
                  {fmt(winner.performance)} m²/Jr
                </div>
                <div style={{ fontSize: 11, color: winner.ecart > 0 ? "#10B981" : "#EF4444", fontWeight: 600 }}>
                  {winner.ecart > 0 ? "+" : ""}{winner.ecart.toFixed(1)}% vs moy.
                </div>
              </div>
            </div>
          )}

          {/* ── rank cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
            {groupData.map((d, i) => {
              const meta = RANK_META[i] || RANK_META[3];
              const color = GROUP_COLORS[d.groupe] || "#6B7280";
              return (
                <div key={d.groupe} style={{
                  border: `1.5px solid ${meta.border}`,
                  background: meta.bg,
                  borderRadius: 12, padding: "12px 14px",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", top: 8, right: 10,
                    fontSize: 10, fontWeight: 700, color: meta.text,
                    background: "rgba(255,255,255,0.6)", padding: "1px 7px", borderRadius: 20,
                  }}>
                    {meta.label}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 3 }}>Groupe</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{d.groupe}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                       <span style={{ fontSize: 12, fontWeight: 700, color: d.ecart > 0 ? "#10B981" : "#EF4444", background: d.ecart > 0 ? "#ECFDF5" : "#FEF2F2", padding: "2px 6px", borderRadius: 4 }}>
                         {d.ecart > 0 ? "+" : ""}{d.ecart.toFixed(1)}%
                       </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginTop: 8 }}>
                    {fmt(d.performance)} m²/Jr
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {fmt(d.total_surface_m2)} m² en {d.jours} Jr.
                  </div>
                  {/* mini bar */}
                  <div style={{ marginTop: 8, height: 5, background: "rgba(0,0,0,0.08)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(d.performance / maxPerformance) * 100}%`, background: color, borderRadius: 4, transition: "width .5s" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── bar chart ── */}
          <div style={{
            background: "var(--background,#fff)", border: "1px solid #F3F4F6",
            borderRadius: 12, padding: "16px 8px 8px",
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: "#6B7280", marginLeft: 12, marginBottom: 8, fontWeight: 600 }}>
              Performance (m² / Jr) — {from} au {to}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={groupData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="groupe" tick={{ fontSize: 13, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v).toFixed(0)}`} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="performance" radius={[6, 6, 0, 0]} maxBarSize={70}>
                  {groupData.map((d, i) => (
                    <Cell key={i} fill={GROUP_COLORS[d.groupe] || "#6B7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── detailed table ── */}
          <div style={{ borderRadius: 12, border: "1px solid #F3F4F6", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "#6B7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>Rang</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "#6B7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>Groupe</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "#6B7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>Jours</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "#6B7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>Métrage Total</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "#6B7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>Performance (m²/Jr)</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "#6B7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>Écart vs Moyenne</th>
                </tr>
              </thead>
              <tbody>
                {groupData.map((d, i) => {
                  const color = GROUP_COLORS[d.groupe] || "#6B7280";
                  return (
                    <tr key={d.groupe} style={{ borderTop: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          background: RANK_META[i]?.bg || "#F3F4F6",
                          color: RANK_META[i]?.text || "#374151",
                          padding: "2px 8px", borderRadius: 20,
                        }}>
                          {RANK_META[i]?.label || `${i + 1}e`}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: color, display: "flex", alignItems: "center", justifyCenter: "center", fontWeight: 800, fontSize: 13, color: "#fff" }}>
                            {d.groupe}
                          </div>
                          <span style={{ fontWeight: 600, color: "var(--foreground,#111)" }}>
                            Groupe {d.groupe}
                            {i === 0 && (
                              <span style={{ marginLeft: 6, fontSize: 10, background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: 20, font: 700 }}>
                                🏆 Prime
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>
                        {d.jours}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "#6B7280" }}>
                        {fmt(d.total_surface_m2)} m²
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color }}>
                        {fmt(d.performance)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <span style={{ fontWeight: 700, color: d.ecart > 0 ? "#10B981" : "#EF4444" }}>
                          {d.ecart > 0 ? "+" : ""}{d.ecart.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #E5E7EB", background: "#F9FAFB" }}>
                  <td colSpan={2} style={{ padding: "10px 14px", fontWeight: 700, fontSize: 12 }}>Total / Moyenne Globale</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, fontSize: 13 }}>{totalJours}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, fontSize: 13 }}>{fmt(totalM2)} m²</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, fontSize: 13 }}>{fmt(globale)}</td>
                  <td style={{ padding: "10px 14px" }} />
                </tr>
              </tfoot>
            </table>
          </div>

          <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 10 }}>
            Source : table <code>stats_linea</code> · colonne <code>total_surface_m2</code> · {rows.length} enregistrements
          </p>
        </>
      )}
    </div>
  );
}
