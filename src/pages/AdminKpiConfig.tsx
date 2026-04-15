import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Target, TrendingUp, TrendingDown, SquareStack, Gauge,
  AlertTriangle, Flame, Save, RotateCcw, Info, ChevronDown, ChevronRight,
  BarChart3, CheckCircle
} from "lucide-react";
import { useKpiSettings, DEFAULT_KPI_OBJECTIVES, KpiObjective } from "@/hooks/useKpiSettings";
import { cn } from "@/lib/utils";

const KPI_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  volume: SquareStack,
  rendement: Gauge,
  scrap: AlertTriangle,
  energy: Flame,
};

const KPI_COLOR_MAP: Record<string, { bg: string; text: string; border: string; ring: string; accent: string }> = {
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-900/40",
    ring: "ring-orange-500/20",
    accent: "bg-orange-500",
  },
  sky: {
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-900/40",
    ring: "ring-sky-500/20",
    accent: "bg-sky-500",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900/40",
    ring: "ring-amber-500/20",
    accent: "bg-amber-500",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-900/40",
    ring: "ring-rose-500/20",
    accent: "bg-rose-500",
  },
};

interface KpiCardEditorProps {
  kpi: KpiObjective;
  editValue: string;
  onChange: (val: string) => void;
  onReset: () => void;
  isDirty: boolean;
}

function FormulaBlock({ formula, description }: { formula: string; description: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        <BarChart3 className="h-3.5 w-3.5" />
        Formule de Calcul
      </div>
      <div className="font-mono text-sm bg-white dark:bg-slate-800 rounded-lg px-4 py-3 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 tracking-wide shadow-inner">
        <span className="text-slate-400 dark:text-slate-500 mr-2">{'>'}</span>
        {formula}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function KpiCardEditor({ kpi, editValue, onChange, onReset, isDirty }: KpiCardEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = KPI_COLOR_MAP[kpi.color] || KPI_COLOR_MAP["orange"];
  const Icon = KPI_ICON_MAP[kpi.id] || Target;
  const defaultKpi = DEFAULT_KPI_OBJECTIVES.find((d) => d.id === kpi.id);

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 border shadow-md",
      isDirty ? "border-primary/40 shadow-primary/10" : "border-slate-200/60 dark:border-slate-800/60"
    )}>
      {/* Header color bar */}
      <div className={cn("h-1 w-full", colors.accent)} />

      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl", colors.bg)}>
              <Icon className={cn("h-5 w-5", colors.text)} />
            </div>
            <div>
              <CardTitle className="text-base font-bold">{kpi.label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.unit} · {kpi.objectiveLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <Badge variant="outline" className="text-primary border-primary/40 text-[10px]">
                Modifié
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={cn("text-[10px] font-semibold gap-1", colors.bg, colors.text)}
            >
              {kpi.lowerIsBetter ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {kpi.lowerIsBetter ? "Minimiser" : "Maximiser"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 space-y-5">
        {/* Formula Block */}
        <FormulaBlock formula={kpi.formula} description={kpi.description} />

        {/* Objective Editor */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Objectif ({kpi.objectiveLabel})
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id={`kpi-obj-${kpi.id}`}
                type="number"
                step="any"
                value={editValue}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                  "pr-16 font-mono text-sm h-11 transition-all",
                  isDirty && "border-primary/60 ring-1 ring-primary/20"
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                {kpi.unit}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={!isDirty}
              className="h-11 px-3 text-xs gap-1.5 text-slate-500 hover:text-slate-700"
              title="Remettre la valeur par défaut"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Défaut
            </Button>
          </div>
          {defaultKpi && (
            <p className="text-[10px] text-muted-foreground">
              Valeur par défaut : <span className="font-medium font-mono">{defaultKpi.objective} {kpi.unit}</span>
            </p>
          )}
        </div>

        {/* Expand more info */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {expanded ? "Masquer les détails" : "Voir les sources de données"}
        </button>

        {expanded && (
          <div className="rounded-lg bg-muted/40 border border-slate-200 dark:border-slate-700/50 p-4 space-y-2 text-xs">
            <p className="font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide text-[10px]">Sources de données</p>
            {kpi.id === "volume" && (
              <ul className="space-y-1 text-muted-foreground">
                <li>📋 Table : <code className="bg-muted px-1 rounded">production_journalier</code></li>
                <li>📊 Colonne : <code className="bg-muted px-1 rounded">cuisson_m2</code></li>
                <li>🗓️ Filtrée par : <code className="bg-muted px-1 rounded">date</code></li>
              </ul>
            )}
            {kpi.id === "rendement" && (
              <ul className="space-y-1 text-muted-foreground">
                <li>📋 Table : <code className="bg-muted px-1 rounded">stats_linea</code></li>
                <li>📊 Colonnes : <code className="bg-muted px-1 rounded">choix1_surface_m2</code>, <code className="bg-muted px-1 rounded">total_surface_m2</code></li>
                <li>🗓️ Filtrée par : <code className="bg-muted px-1 rounded">production_date</code></li>
              </ul>
            )}
            {kpi.id === "scrap" && (
              <ul className="space-y-1 text-muted-foreground">
                <li>📋 Table : <code className="bg-muted px-1 rounded">stats_linea</code></li>
                <li>📊 Colonnes : <code className="bg-muted px-1 rounded">choix2_surface_m2</code>, <code className="bg-muted px-1 rounded">choix3_surface_m2</code>, <code className="bg-muted px-1 rounded">total_surface_m2</code></li>
                <li>🗓️ Filtrée par : <code className="bg-muted px-1 rounded">production_date</code></li>
              </ul>
            )}
            {kpi.id === "energy" && (
              <ul className="space-y-1 text-muted-foreground">
                <li>📋 Table : <code className="bg-muted px-1 rounded">production_journalier</code></li>
                <li>📊 Colonnes : <code className="bg-muted px-1 rounded">four_consommation_kwh</code>, <code className="bg-muted px-1 rounded">nb_pieces_four</code></li>
                <li>🗓️ Filtrée par : <code className="bg-muted px-1 rounded">date</code></li>
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminKpiConfig() {
  const { kpiObjectives, saveObjectives, saving } = useKpiSettings();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  // Initialize edit values from current objectives
  useEffect(() => {
    const init: Record<string, string> = {};
    kpiObjectives.forEach((k) => {
      init[k.id] = String(k.objective);
    });
    setEditValues(init);
  }, [kpiObjectives]);

  const handleChange = (id: string, val: string) => {
    setSaved(false);
    setEditValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleReset = (id: string) => {
    const def = DEFAULT_KPI_OBJECTIVES.find((d) => d.id === id);
    if (def) {
      setSaved(false);
      setEditValues((prev) => ({ ...prev, [id]: String(def.objective) }));
    }
  };

  const handleResetAll = () => {
    const init: Record<string, string> = {};
    DEFAULT_KPI_OBJECTIVES.forEach((k) => {
      init[k.id] = String(k.objective);
    });
    setEditValues(init);
    setSaved(false);
  };

  const isDirty = (id: string) => {
    const current = kpiObjectives.find((k) => k.id === id);
    if (!current) return false;
    return String(editValues[id]) !== String(current.objective);
  };

  const hasAnyDirty = kpiObjectives.some((k) => isDirty(k.id));

  const handleSave = async () => {
    const updated = kpiObjectives.map((k) => ({
      ...k,
      objective: parseFloat(editValues[k.id] ?? String(k.objective)) || k.objective,
    }));

    // Validate
    for (const k of updated) {
      if (isNaN(k.objective) || k.objective < 0) {
        toast.error(`Valeur invalide pour "${k.label}"`);
        return;
      }
    }

    const result = await saveObjectives(updated);
    if (result.success) {
      setSaved(true);
      if (result.localOnly) {
        toast.success("Objectifs sauvegardés localement", {
          description: "La table app_settings n'existe pas encore dans Supabase. Les valeurs sont conservées dans le navigateur.",
        });
      } else {
        toast.success("Objectifs KPI mis à jour avec succès");
      }
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10">
              <Target className="h-6 w-6 text-primary" />
            </div>
            Configuration des KPI
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            Définissez les formules de calcul et les objectifs de chaque indicateur de performance.
            Les valeurs sont appliquées en temps réel dans le tableau de bord Analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            disabled={saving}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser tout
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasAnyDirty}
            className="gap-1.5"
            id="save-kpi-objectives"
          >
            {saved ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Sauvegardé
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 px-4 py-3.5">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
          <p className="font-semibold">Comment fonctionnent les objectifs ?</p>
          <p className="text-blue-600/80 dark:text-blue-400/80">
            Chaque objectif est affiché sur la carte KPI correspondante dans le tableau de bord. 
            L'indicateur de performance compare la valeur calculée à l'objectif défini ici.
            Les formules sont fixes (liées aux colonnes de la base de données) mais les seuils sont modifiables.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {kpiObjectives.map((kpi) => (
          <KpiCardEditor
            key={kpi.id}
            kpi={kpi}
            editValue={editValues[kpi.id] ?? String(kpi.objective)}
            onChange={(val) => handleChange(kpi.id, val)}
            onReset={() => handleReset(kpi.id)}
            isDirty={isDirty(kpi.id)}
          />
        ))}
      </div>

      {/* Summary Table */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Récapitulatif des objectifs actuels
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-6 py-3 font-semibold">KPI</th>
                  <th className="text-left px-4 py-3 font-semibold">Formule</th>
                  <th className="text-right px-4 py-3 font-semibold">Objectif</th>
                  <th className="text-right px-6 py-3 font-semibold">Direction</th>
                </tr>
              </thead>
              <tbody>
                {kpiObjectives.map((kpi, i) => {
                  const colors = KPI_COLOR_MAP[kpi.color] || KPI_COLOR_MAP["orange"];
                  const Icon = KPI_ICON_MAP[kpi.id] || Target;
                  const currentEdit = parseFloat(editValues[kpi.id] ?? String(kpi.objective));
                  const dirty = isDirty(kpi.id);
                  return (
                    <tr key={kpi.id} className={cn("border-b last:border-0 hover:bg-muted/20 transition-colors", i % 2 === 0 ? "" : "bg-muted/10")}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-1.5 rounded-lg", colors.bg)}>
                            <Icon className={cn("h-3.5 w-3.5", colors.text)} />
                          </div>
                          <span className="font-medium text-sm">{kpi.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <code className="text-[11px] bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">
                          {kpi.formula}
                        </code>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={cn(
                          "font-bold font-mono text-sm",
                          dirty ? "text-primary" : "text-foreground"
                        )}>
                          {isNaN(currentEdit) ? "—" : currentEdit} {kpi.unit}
                        </span>
                        {dirty && (
                          <span className="ml-1.5 text-[10px] text-primary font-medium">(modifié)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] gap-1", colors.bg, colors.text)}
                        >
                          {kpi.lowerIsBetter ? (
                            <><TrendingDown className="h-3 w-3" /> Min</>
                          ) : (
                            <><TrendingUp className="h-3 w-3" /> Max</>
                          )}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom save bar (appears when dirty) */}
      {hasAnyDirty && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-card border shadow-xl rounded-xl px-5 py-3.5 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">Modifications non sauvegardées</span>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </div>
      )}
    </div>
  );
}
