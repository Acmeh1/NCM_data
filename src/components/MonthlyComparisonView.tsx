import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Target, Factory, Award, AlertCircle } from "lucide-react";

// --- Types & Constants ---
const COLORS = {
  primary: "hsl(210, 70%, 55%)",
  secondary: "hsl(215, 25%, 27%)",
  success: "hsl(150, 60%, 45%)",
  warning: "hsl(45, 80%, 55%)",
  danger: "hsl(340, 65%, 50%)",
  grey: "hsl(210, 10%, 60%)",
  purple: "hsl(270, 55%, 55%)",
  lightPurple: "hsl(270, 70%, 75%)",
};

const DAILY_M2_OBJECTIVE = 8000;
const MONTHLY_M2_OBJECTIVE = 240000; // Objectif mensuel fixe

interface MonthlyData {
  month: string; // YYYY-MM
  actualProd: number;
  objective: number;
  realizationRate: number;
  choix1Rate: number;
  choix2Rate: number;
  choix3Rate: number;
  pertesPresse: number;
  pertesFour: number;
  pertesTriage: number;
  totalLosses: number;
  poudreAtomisee: number;
  poudrePressee: number;
  poudrePertes: number;
  emailEngobe: number;
  cycleFour: number;
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

// --- Helper Functions ---
function calculateTrend(current: number, previous: number, lowerIsBetter = false) {
  if (!previous) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.001) return "stable";
  if (lowerIsBetter) {
    return diff < 0 ? "up" : "down";
  }
  return diff > 0 ? "up" : "down";
}

// --- Main Component ---
export default function MonthlyComparisonView() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: journalier = [] } = useQuery({
    queryKey: ["monthly-journalier"],
    queryFn: async () => {
      const { data, error } = await supabase.from("production_journalier").select("*");
      if (error) throw error;
      return data || [];
    }
  });

  const { data: selection = [] } = useQuery({
    queryKey: ["monthly-selection"],
    queryFn: async () => {
      const { data, error } = await supabase.from("production_selection").select("*");
      if (error) throw error;
      return data || [];
    }
  });



  const processedData = useMemo(() => {
    const months: MonthlyData[] = [];
    const [year, month] = selectedMonth.split("-").map(Number);

    for (let i = 2; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const prodInMonth = journalier.filter(r => r.date.startsWith(mStr));
      const selectionInMonth = selection.filter(r => r.date.startsWith(mStr));

      const actualProd = prodInMonth.reduce((acc, r) => acc + (Number(r.total_m2) || 0), 0);

      let sumDailyObjForShifts = 0;
      prodInMonth.forEach(r => {
        const format = String(r.format || r.Format || r.modele || r.Modele || "").trim();
        let dailyObj = 8000; // default (e.g. 60*60)
        if (format.includes("45*45")) dailyObj = 8500;
        else if (format.includes("60*30") || format.includes("30*60")) dailyObj = 9100;
        
        sumDailyObjForShifts += dailyObj;
      });

      // Calcul de l'objectif mensuel dynamique : on fait la moyenne des objectifs journaliers (selon les formats produits) x 30 jours.
      let objective = MONTHLY_M2_OBJECTIVE; // Fallback à 240 000
      if (prodInMonth.length > 0) {
        const avgDailyObj = sumDailyObjForShifts / prodInMonth.length;
        objective = avgDailyObj * 30;
      }

      const totalChoix1 = prodInMonth.reduce((acc, r) => acc + (Number(r.choix_1_m2) || 0), 0);
      const totalChoix2 = prodInMonth.reduce((acc, r) => acc + (Number(r.choix_2_m2) || 0), 0);
      const totalChoix3 = prodInMonth.reduce((acc, r) => acc + (Number(r.choix_3_m2) || 0), 0);
      const sumChoix = totalChoix1 + totalChoix2 + totalChoix3;

      const pertesPresse = selectionInMonth.reduce((acc, r) => acc + (Number(r.zone_presse) || 0), 0);
      const pertesFour = selectionInMonth.reduce((acc, r) => acc + (Number(r.zone_four) || 0), 0);
      const pertesTriage = selectionInMonth.reduce((acc, r) => acc + (Number(r.zone_projecta) || 0), 0);

      const poudreAtomisee = (prodInMonth.reduce((acc, r) => acc + (Number(r.pressage_m2) || 0), 0) * 1.05) * 0.02;
      const poudrePressee = prodInMonth.reduce((acc, r) => acc + (Number(r.pressage_m2) || 0), 0) * 0.02;
      const poudrePertes = poudreAtomisee - poudrePressee;
      const emailEngobe = prodInMonth.reduce((acc, r) => acc + (Number(r.emaillage_m2 ?? r.Emaillage_m2) || 0), 0) * 0.001;

      const avgCycle = prodInMonth.length > 0
        ? prodInMonth.reduce((acc, r) => acc + (Number(r.cycle_min) || 0), 0) / prodInMonth.length
        : 0;



      months.push({
        month: mStr,
        actualProd,
        objective,
        realizationRate: objective > 0 ? (actualProd / objective) * 100 : 0,
        choix1Rate: sumChoix > 0 ? (totalChoix1 / sumChoix) * 100 : 0,
        choix2Rate: sumChoix > 0 ? (totalChoix2 / sumChoix) * 100 : 0,
        choix3Rate: sumChoix > 0 ? (totalChoix3 / sumChoix) * 100 : 0,
        pertesPresse,
        pertesFour,
        pertesTriage,
        totalLosses: pertesPresse + pertesFour + pertesTriage,
        poudreAtomisee,
        poudrePressee,
        poudrePertes,
        emailEngobe,
        cycleFour: avgCycle
      });
    }
    return months;
  }, [selectedMonth, journalier, selection]);

  const currentMonthData = processedData[2];
  const prevMonthData = processedData[1];

  const formatMonth = (mStr: string) => {
    const [y, m] = mStr.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  };

  const TrendIcon = ({ current, previous, lowerIsBetter = false }: { current: number, previous: number, lowerIsBetter?: boolean }) => {
    const trend = calculateTrend(current, previous, lowerIsBetter);
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-rose-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Comparaison Mensuelle</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">Mois de référence :</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...new Set(journalier.map(r => r.date.slice(0, 7)))].sort().reverse().map(m => (
                <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Factory className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Production Réelle</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold">{currentMonthData.actualProd.toFixed(0)} m²</p>
                  <span className="text-[10px] text-muted-foreground">/ {currentMonthData.objective.toLocaleString("fr-FR", {maximumFractionDigits: 0})}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg"><Target className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Taux réalisation</p>
                <p className="text-xl font-bold">{currentMonthData.realizationRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg"><Award className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Taux 1er Choix</p>
                <p className="text-xl font-bold">{currentMonthData.choix1Rate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 rounded-lg"><AlertCircle className="h-5 w-5 text-rose-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pertes totales</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold">{currentMonthData.totalLosses.toFixed(0)} m²</p>
                  <span className="text-[10px] text-rose-600 font-semibold">
                    ({currentMonthData.actualProd > 0 ? ((currentMonthData.totalLosses / currentMonthData.actualProd) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Production Réelle vs Objectif (m²)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={formatMonth} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar name="Objectif" dataKey="objective" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                <Bar name="Réalisé" dataKey="actualProd" fill={COLORS.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Répartition Qualité (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={formatMonth} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar name="1er Choix" dataKey="choix1Rate" stackId="a" fill={COLORS.success} />
                <Bar name="2ème Choix" dataKey="choix2Rate" stackId="a" fill={COLORS.warning} />
                <Bar name="3ème Choix" dataKey="choix3Rate" stackId="a" fill={COLORS.danger} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Pertes par type (m²)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={formatMonth} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar name="Presse" dataKey="pertesPresse" stackId="a" fill={COLORS.danger} />
                <Bar name="Ligne" dataKey="pertesTriage" stackId="a" fill={COLORS.warning} />
                <Bar name="Entrée Four" dataKey="pertesFour" stackId="a" fill={COLORS.grey} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Matière première (Tonne Estimation)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={formatMonth} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar name="Poudre Atomisée" dataKey="poudreAtomisee" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                <Bar name="Poudre Pressée" dataKey="poudrePressee" fill={COLORS.lightPurple} radius={[4, 4, 0, 0]} />
                <Bar name="Pertes Poudre" dataKey="poudrePertes" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tableau Comparatif & Analyse de Tendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[250px] font-bold text-xs">Indicateur</TableHead>
                  <TableHead className="text-right font-bold text-xs">{formatMonth(processedData[0].month)}</TableHead>
                  <TableHead className="text-right font-bold text-xs">{formatMonth(processedData[1].month)}</TableHead>
                  <TableHead className="text-right font-bold text-xs">{formatMonth(processedData[2].month)}</TableHead>
                  <TableHead className="w-[80px] text-center font-bold text-xs">Tendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-blue-50/20 font-medium">
                  <TableCell className="py-2 text-xs">Production réelle (m²)</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[0].actualProd.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[1].actualProd.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[2].actualProd.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].actualProd} previous={processedData[1].actualProd} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2 text-xs">Taux de réalisation (%)</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[0].realizationRate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[1].realizationRate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[2].realizationRate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].realizationRate} previous={processedData[1].realizationRate} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2 text-xs">1er choix (%)</TableCell>
                  <TableCell className="py-2 text-right text-xs font-semibold text-emerald-600">{processedData[0].choix1Rate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-right text-xs font-semibold text-emerald-600">{processedData[1].choix1Rate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-right text-xs font-semibold text-emerald-600">{processedData[2].choix1Rate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].choix1Rate} previous={processedData[1].choix1Rate} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2 text-xs">2ème choix (%)</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[0].choix2Rate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[1].choix2Rate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[2].choix2Rate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].choix2Rate} previous={processedData[1].choix2Rate} lowerIsBetter />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2 text-xs">3ème choix (%)</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[0].choix3Rate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[1].choix3Rate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[2].choix3Rate.toFixed(1)}%</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].choix3Rate} previous={processedData[1].choix3Rate} lowerIsBetter />
                  </TableCell>
                </TableRow>
                <TableRow className="bg-rose-50/20 font-medium">
                  <TableCell className="py-2 text-xs">Pertes Presse (m²)</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[0].pertesPresse.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[1].pertesPresse.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[2].pertesPresse.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].pertesPresse} previous={processedData[1].pertesPresse} lowerIsBetter />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2 text-xs">Pertes Entrée Four (m²)</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[0].pertesFour.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[1].pertesFour.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[2].pertesFour.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].pertesFour} previous={processedData[1].pertesFour} lowerIsBetter />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2 text-xs">Pertes Ligne / Triage (m²)</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[0].pertesTriage.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[1].pertesTriage.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[2].pertesTriage.toFixed(0)}</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].pertesTriage} previous={processedData[1].pertesTriage} lowerIsBetter />
                  </TableCell>
                </TableRow>
                <TableRow className="bg-purple-50/20 font-medium">
                  <TableCell className="py-2 text-xs">Poudre Atomisée (Tonne)</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[0].poudreAtomisee.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[1].poudreAtomisee.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[2].poudreAtomisee.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].poudreAtomisee} previous={processedData[1].poudreAtomisee} lowerIsBetter />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2 text-xs">Poudre Pressée (Tonne)</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[0].poudrePressee.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[1].poudrePressee.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[2].poudrePressee.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].poudrePressee} previous={processedData[1].poudrePressee} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2 text-xs">Consommation Email+Engobe (Tonne)</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[0].emailEngobe.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[1].emailEngobe.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[2].emailEngobe.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].emailEngobe} previous={processedData[1].emailEngobe} lowerIsBetter />
                  </TableCell>
                </TableRow>
                <TableRow className="bg-slate-50/50 font-medium">
                  <TableCell className="py-2 text-xs">Cycle Four (min)</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[0].cycleFour.toFixed(1)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[1].cycleFour.toFixed(1)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{processedData[2].cycleFour.toFixed(1)}</TableCell>
                  <TableCell className="py-2 text-center">
                    <TrendIcon current={processedData[2].cycleFour} previous={processedData[1].cycleFour} />
                  </TableCell>
                </TableRow>

              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center italic">
        Note: Les tonnages de matière première et d'émail sont des estimations basées sur les surfaces (m²) déclarées. Objectif mensuel : {currentMonthData.objective.toLocaleString("fr-FR", {maximumFractionDigits: 0})} m².
      </p>
    </div>
  );
}
