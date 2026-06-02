import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Save,
  ChevronLeft,
  ChevronRight,
  Users,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Briefcase,
  Clock,
  AlertTriangle,
  Sparkles,
  Activity,
} from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { usePointageStore, STATUT_OPTIONS } from "@/hooks/usePointageStore";
import PointageGrid from "@/components/PointageGrid";

export default function RHPointage() {
  // ── State ────────────────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const store = usePointageStore(selectedMonth);

  // Filter employees by service
  const filteredEmployees = useMemo(() => {
    if (serviceFilter === "all") return store.employees;
    return store.employees.filter((emp) => emp.Service === serviceFilter);
  }, [store.employees, serviceFilter]);

  // ── Navigation ───────────────────────────────────────────────────
  const goToPrevMonth = () => setSelectedMonth((d) => subMonths(d, 1));
  const goToNextMonth = () => setSelectedMonth((d) => addMonths(d, 1));
  const goToCurrentMonth = () => setSelectedMonth(new Date());

  // ── Loading ──────────────────────────────────────────────────────
  if (store.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">
            Chargement des données de pointage...
          </p>
        </div>
      </div>
    );
  }

  const stats = store.monthStats;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-2.5 rounded-xl">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Pointage RH
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Suivi mensuel de la présence des employés
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {store.hasChanges && (
            <Badge
              variant="outline"
              className="animate-pulse bg-amber-50 border-amber-200 text-amber-700 gap-1.5"
            >
              <AlertTriangle className="h-3 w-3" />
              Modifications non sauvegardées
            </Badge>
          )}
          <Button
            onClick={() => store.save()}
            disabled={!store.hasChanges || store.isSaving}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all"
          >
            {store.isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* ── Controls Bar ────────────────────────────────────────── */}
      <Card className="border border-slate-200/60 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Month Navigator */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={goToPrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <button
                onClick={goToCurrentMonth}
                className="px-5 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:from-white hover:to-slate-50 transition-all min-w-[200px] text-center"
              >
                {format(selectedMonth, "MMMM yyyy", { locale: fr })
                  .replace(/^\w/, (c) => c.toUpperCase())}
              </button>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={goToNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-1 lg:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un employé..."
                  className="pl-8 h-9 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <Briefcase className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Tous les services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Tous les services
                  </SelectItem>
                  {store.services.map((service) => (
                    <SelectItem key={service} value={service} className="text-xs">
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-9"
                onClick={() => store.initializeMonth(filteredEmployees)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Initialiser le mois
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-none shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100">
                  Taux Présence
                </p>
                <p className="text-xl font-black leading-tight">
                  {stats.presenceRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <XCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-red-100">
                  Taux Absence
                </p>
                <p className="text-xl font-black leading-tight">
                  {stats.absenceRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border border-slate-200/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Présents
                </p>
                <p className="text-xl font-black leading-tight text-emerald-600">
                  {stats.present}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border border-slate-200/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <CalendarDays className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Abs. Autorisées
                </p>
                <p className="text-xl font-black leading-tight text-blue-600">
                  {stats.absAutorisee}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border border-slate-200/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-red-100 rounded-lg">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Abs. Non Autorisées
                </p>
                <p className="text-xl font-black leading-tight text-red-600">
                  {stats.absNonAutorisee}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border border-slate-200/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <Activity className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Congés Annuels
                </p>
                <p className="text-xl font-black leading-tight text-amber-600">
                  {stats.congeAnnuel}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Legend ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Légende :
        </span>
        {STATUT_OPTIONS.map((opt) => (
          <div key={opt.value} className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
              style={{ backgroundColor: opt.color }}
            >
              {opt.icon}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              {opt.label}
            </span>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-slate-400 italic">
          Clic = changer statut · Shift+Clic ou Clic droit = détails
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────── */}
      <PointageGrid
        employees={filteredEmployees}
        daysOfMonth={store.daysOfMonth}
        getCellData={store.getCellData}
        updateCell={store.updateCell}
        cycleStatut={store.cycleStatut}
        searchQuery={searchQuery}
      />

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-50">
          NCM Céramique · Système de Pointage RH ·{" "}
          {format(selectedMonth, "MMMM yyyy", { locale: fr })}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {filteredEmployees.length} employés · {store.daysOfMonth.length} jours
        </div>
      </div>
    </div>
  );
}
