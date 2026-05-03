import React, { useMemo, useState } from "react";
import { 
  ShoppingCart, Truck, Wallet, Package, Clock, ArrowUpRight, 
  ArrowDownRight, MoreHorizontal, FileText, CheckCircle2, 
  AlertCircle, LayoutDashboard, TrendingUp, BarChart3, PieChart as PieChartIcon, Search
} from "lucide-react";
import { format as formatDate } from "date-fns";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import DateRangeFilter from "@/components/DateRangeFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(150, 60%, 45%)",
  "hsl(210, 70%, 55%)",
  "hsl(45, 80%, 55%)",
  "hsl(340, 65%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(180, 65%, 45%)",
  "hsl(10, 80%, 60%)",
];

const PURCHASE_TYPE_DATA: any[] = [];
const EVOLUTION_DATA: any[] = [];
const SUPPLIER_DATA: any[] = [];

export default function DashboardQualite() {
  const { 
    startDate, endDate, currentRange, period, activePreset,
    setRange, setPeriod 
  } = useDashboardFilters();

  const getProp = (obj: any, key: string) => {
    if (!obj) return undefined;
    if (obj[key] !== undefined) return obj[key];
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_]/g, "");
    const target = normalize(key);
    const foundKey = Object.keys(obj).find(k => normalize(k) === target);
    return foundKey ? obj[foundKey] : undefined;
  };

  // Fetch from Vue_Suivi_Achats_Complet - filter in JS on 'Date Facture'
  const { data: allApproData = [], isLoading } = useQuery({
    queryKey: ["vue-suivi-achats-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Vue_Suivi_Achats_Complet").select("*");
      if (error) throw error;
      return data || [];
    }
  });

  const parseDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    
    // Handle 'DD/MM/YYYY HH:MM:SS' or 'DD/MM/YYYY' format
    const str = String(dateStr).trim();
    const datePart = str.split(' ')[0]; // strip time component
    
    // Try DD/MM/YYYY
    const parts = datePart.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      const d = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
      if (!isNaN(d.getTime())) return d;
    }
    
    // Try DD-MM-YYYY or YYYY-MM-DD
    const dashParts = datePart.split('-');
    if (dashParts.length === 3) {
      if (dashParts[0].length === 4) {
        const d = new Date(`${dashParts[0]}-${dashParts[1]}-${dashParts[2]}`);
        if (!isNaN(d.getTime())) return d;
      } else if (dashParts[2].length === 4) {
        const d = new Date(`${dashParts[2]}-${dashParts[1]}-${dashParts[0]}`);
        if (!isNaN(d.getTime())) return d;
      }
    }
    
    // Fallback: native parse
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  const approData = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    return allApproData.filter(row => {
      const d = parseDate(getProp(row, "Date Facture"));
      return d && d >= s && d <= e;
    });
  }, [allApproData, startDate, endDate]);

  const prevApproData = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = e.getTime() - s.getTime();
    const ps = new Date(s.getTime() - diff - 86400000);
    const pe = new Date(s.getTime() - 86400000);
    
    return allApproData.filter(row => {
      const d = parseDate(getProp(row, "Date Facture"));
      return d && d >= ps && d <= pe;
    });
  }, [allApproData, startDate, endDate]);

  const stats = useMemo(() => {
    const cleanNum = (val: any) => {
      if (!val) return 0;
      const s = String(val).replace(/\s/g, '').replace(/,/g, '.');
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };

    const totalHT = approData.reduce((sum, row) => sum + cleanNum(getProp(row, "Total HT")), 0);
    const totalTTC = approData.reduce((sum, row) => sum + cleanNum(getProp(row, "Total TTC")), 0);
    
    const prevTotalHT = prevApproData.reduce((sum, row) => sum + cleanNum(getProp(row, "Total HT")), 0);
    const prevTotalTTC = prevApproData.reduce((sum, row) => sum + cleanNum(getProp(row, "Total TTC")), 0);
    
    const variationHT = prevTotalHT > 0 
      ? (((totalHT - prevTotalHT) / prevTotalHT) * 100).toFixed(1)
      : "0";
      
    const variationTTC = prevTotalTTC > 0 
      ? (((totalTTC - prevTotalTTC) / prevTotalTTC) * 100).toFixed(1)
      : "0";

    // Distribution by Type (from Vue_Suivi_Achats_Complet)
    const byType: Record<string, number> = {};
    approData.forEach(row => {
      const type = getProp(row, "Type") || "Autres";
      byType[type] = (byType[type] || 0) + cleanNum(getProp(row, "Total TTC"));
    });
    
    const typeDistribution = Object.entries(byType).map(([name, value]) => ({ 
      name, 
      value: totalTTC > 0 ? Math.round((value / totalTTC) * 100) : 0 
    })).sort((a, b) => b.value - a.value);

    // Top Suppliers
    const bySupplier: Record<string, number> = {};
    approData.forEach(row => {
      const supplier = getProp(row, "fournisseur") || "Inconnu";
      bySupplier[supplier] = (bySupplier[supplier] || 0) + cleanNum(getProp(row, "Total TTC"));
    });
    const topSuppliers = Object.entries(bySupplier)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Evolution by month using Date Facture - sorted chronologically
    const byMonth: Record<string, { totalTTC: number; totalHT: number; label: string; commandes: Set<string> }> = {};
    approData.forEach(row => {
      const d = parseDate(getProp(row, "Date Facture"));
      if (d) {
        const key = formatDate(d, "yyyy-MM"); // sortable key
        const label = formatDate(d, "MMM yyyy"); // display label
        if (!byMonth[key]) byMonth[key] = { totalTTC: 0, totalHT: 0, label, commandes: new Set() };
        byMonth[key].totalTTC += cleanNum(getProp(row, "Total TTC"));
        byMonth[key].totalHT += cleanNum(getProp(row, "Total HT"));
        
        const bonCommande = getProp(row, "Bon de Commande") || getProp(row, "N°") || getProp(row, "code");
        if (bonCommande) byMonth[key].commandes.add(String(bonCommande));
      }
    });
    const evolution = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b)) // sort YYYY-MM chronologically
      .map(([, { totalTTC, totalHT, label, commandes }]) => ({ 
        name: label, 
        "Total TTC": totalTTC,
        "Total HT": totalHT,
        "Nb Commandes": commandes.size
      }));

    // Recent orders from Vue_Suivi_Achats_Complet
    const recent = [...approData]
      .sort((a, b) => {
        const da = parseDate(getProp(a, "Date Facture"))?.getTime() || 0;
        const db = parseDate(getProp(b, "Date Facture"))?.getTime() || 0;
        return db - da;
      })
      .map(row => ({
        code: getProp(row, "code") ?? getProp(row, "Code") ?? "",
        id: getProp(row, "Designation") || "N/A",
        supplier: getProp(row, "fournisseur") || "Inconnu",
        date: getProp(row, "Date Facture"),
        type: getProp(row, "Type") || "N/A",
        qte: cleanNum(getProp(row, "Qte")),
        prixUnitaire: cleanNum(getProp(row, "Prix TTC")).toLocaleString("fr-FR") + " DA",
        amount: cleanNum(getProp(row, "Total TTC")).toLocaleString("fr-FR") + " DA",
        status: "Validé"
      }));

    // Top Products by Quantity
    const byProduct: Record<string, { qte: number; totalTTC: number; um: string; type: string }> = {};
    approData.forEach(row => {
      const designation = getProp(row, "Designation");
      if (!designation) return;
      if (!byProduct[designation]) {
        byProduct[designation] = {
          qte: 0,
          totalTTC: 0,
          um: getProp(row, "UM") || "-",
          type: getProp(row, "Type") || "N/A"
        };
      }
      byProduct[designation].qte += cleanNum(getProp(row, "Qte"));
      byProduct[designation].totalTTC += cleanNum(getProp(row, "Total TTC"));
    });

    const topProducts = Object.entries(byProduct)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qte - a.qte)
      .slice(0, 15);

    // Strategic Materials Tracking (Grouped)
    const strategicCategories = [
      { key: "argile", label: "Argile (Toutes variantes)" },
      { key: "feldspath", label: "Feldspath (Toutes variantes)" },
      { key: "defloculant", label: "Défloculant" },
      { key: "défloculant", label: "Défloculant" }
    ];
    
    const strategicGrouped: Record<string, { qte: number; totalTTC: number }> = {
      "Argile (Toutes variantes)": { qte: 0, totalTTC: 0 },
      "Feldspath (Toutes variantes)": { qte: 0, totalTTC: 0 },
      "Défloculant": { qte: 0, totalTTC: 0 }
    };

    approData.forEach(row => {
      const designation = String(getProp(row, "Designation") || "").toLowerCase();
      const cat = strategicCategories.find(c => designation.includes(c.key));
      if (cat) {
        strategicGrouped[cat.label].qte += cleanNum(getProp(row, "Qte"));
        strategicGrouped[cat.label].totalTTC += cleanNum(getProp(row, "Total TTC"));
      }
    });

    const strategicMaterials = Object.entries(strategicGrouped)
      .map(([name, data]) => ({ name, ...data }))
      .filter(item => item.totalTTC > 0)
      .sort((a, b) => b.totalTTC - a.totalTTC);

    return { 
      totalHT, totalTTC, variationHT, variationTTC, count: approData.length, 
      evolution, recent, typeDistribution, topSuppliers, topProducts, strategicMaterials,
      countBC: approData.length,
      countFournisseurs: new Set(approData.map(row => getProp(row, "fournisseur")).filter(Boolean)).size
    };
  }, [approData, prevApproData]);

  const [showTable, setShowTable] = useState(true);
  const [searchTable, setSearchTable] = useState("");

  const filteredRecent = useMemo(() => {
    if (!searchTable) return stats.recent;
    const lower = searchTable.toLowerCase();
    return stats.recent.filter((row: any) => 
      String(row.code || "").toLowerCase().includes(lower) || 
      String(row.id || "").toLowerCase().includes(lower) ||
      String(row.supplier || "").toLowerCase().includes(lower)
    );
  }, [stats.recent, searchTable]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/50 min-h-screen animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Approvisionnement & Achat</h2>
          <p className="text-muted-foreground font-medium">Analyse des dépenses, fournisseurs et flux logistiques.</p>
        </div>
        <div className="bg-white p-1 rounded-xl border shadow-sm flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Période d'analyse</p>
            <p className="text-xs font-black text-slate-900 truncate max-w-[150px]">
              {activePreset || "Personnalisé"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <DateRangeFilter
          range={currentRange}
          onRangeChange={setRange}
          granularity={period}
          onGranularityChange={setPeriod}
          activePreset={activePreset}
        />
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs font-medium text-muted-foreground">
          <Truck className="h-3.5 w-3.5 text-primary" />
          Suivi logistique actif
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Achats (HT)</p>
                <div className="text-xl font-black tracking-tight leading-tight">
                  {stats.totalHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DA
                </div>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                <Wallet className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className={cn(
              "mt-4 flex items-center gap-2 text-sm font-bold",
              Number(stats.variationHT) >= 0 ? "text-emerald-400" : "text-rose-400"
            )}>
              {Number(stats.variationHT) >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{Math.abs(Number(stats.variationHT))}% vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Achats TTC</p>
                <div className="text-xl font-black tracking-tight text-slate-900 leading-tight">
                  {stats.totalTTC.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DA
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className={cn(
              "mt-4 flex items-center gap-2 text-sm font-bold",
              Number(stats.variationTTC) >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {Number(stats.variationTTC) >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{Math.abs(Number(stats.variationTTC))}% de variation</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Nb commandes (BC)</p>
                <div className="text-3xl font-black tracking-tight text-slate-900">{stats.countBC}</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-amber-600 text-sm font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Bons de commande distincts</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Nb Fournisseurs Actifs</p>
                <div className="text-3xl font-black tracking-tight text-slate-900">{stats.countFournisseurs}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <Truck className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Fournisseurs distincts</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Type Distribution */}
        <Card className="lg:col-span-1 shadow-sm border-slate-200/60 overflow-hidden group">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Répartition par Type d'Achat
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.typeDistribution.length > 0 ? stats.typeDistribution : PURCHASE_TYPE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(stats.typeDistribution.length > 0 ? stats.typeDistribution : PURCHASE_TYPE_DATA).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
              {(stats.typeDistribution.length > 0 ? stats.typeDistribution : PURCHASE_TYPE_DATA).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-medium text-slate-600 truncate max-w-[120px]">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Evolution Chart */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200/60 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Évolution dépenses TTC — 12 mois
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.evolution.length > 0 ? stats.evolution : EVOLUTION_DATA}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                      return `${v}`;
                    }}
                  />
                  <Tooltip formatter={(value: number) => value.toLocaleString("fr-FR") + " DA"} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" dataKey="Total TTC" stroke="hsl(210, 70%, 55%)" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={3} />
                  <Area type="monotone" dataKey="Total HT" stroke="hsl(150, 60%, 45%)" fillOpacity={1} fill="url(#colorHT)" strokeWidth={2} strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Evolution Commandes */}
        <Card className="shadow-sm border-slate-200/60 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              Évolution du Nombre de Commandes — 12 mois
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.evolution.length > 0 ? stats.evolution : EVOLUTION_DATA}>
                  <defs>
                    <linearGradient id="colorCmd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value, "Commandes"]} />
                  <Area type="monotone" dataKey="Nb Commandes" stroke="hsl(45, 93%, 47%)" fillOpacity={1} fill="url(#colorCmd)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        {/* Top Suppliers (Static for now, but placeholder for real data) */}
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Analyse Fournisseurs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topSuppliers.length > 0 ? stats.topSuppliers : SUPPLIER_DATA} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="opacity-30" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip />
                  <Bar dataKey="value" name="Volume TTC" fill="hsl(150, 60%, 45%)" radius={[0, 4, 4, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="shadow-sm border-slate-200/60 lg:col-span-2">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Dernières Réceptions
                <span className="ml-2 text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{filteredRecent.length} lignes</span>
              </CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Rechercher (Code, Désignation...)"
                    value={searchTable}
                    onChange={(e) => setSearchTable(e.target.value)}
                    className="w-full text-xs h-8 pl-8 pr-3 rounded-md border border-input bg-transparent shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <button
                  onClick={() => setShowTable(v => !v)}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600 flex items-center gap-1 shrink-0"
                >
                  {showTable ? "▲ Masquer" : "▼ Afficher"}
                </button>
              </div>
            </div>
          </CardHeader>
          {showTable && (
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="overflow-y-auto max-h-[420px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Désignation</th>
                        <th className="px-4 py-3">Fournisseur</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Date Facture</th>
                        <th className="px-4 py-3 text-right">Qté</th>
                        <th className="px-4 py-3 text-right">Prix TTC</th>
                        <th className="px-4 py-3 text-right">Total TTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredRecent.length > 0 ? filteredRecent.map((order: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-slate-400 text-[10px] whitespace-nowrap">{order.code}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-700 max-w-[180px] truncate" title={order.id}>{order.id}</td>
                          <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{order.supplier}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="text-[10px] py-0 font-bold bg-blue-50 text-blue-700 border-blue-100 whitespace-nowrap">
                              {order.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 font-mono whitespace-nowrap">{order.date}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700 whitespace-nowrap">{order.qte}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-600 whitespace-nowrap">{order.prixUnitaire}</td>
                          <td className="px-4 py-2.5 text-right font-black text-slate-900 whitespace-nowrap">{order.amount}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground italic">
                            Aucune réception trouvée pour cette période.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        {/* Top Products */}
        <Card className="shadow-sm border-slate-200/60 lg:col-span-1">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Top Produits Achetés (Évolution)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[400px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                      <th className="px-4 py-3">Désignation</th>
                      <th className="px-4 py-3 text-center">UM</th>
                      <th className="px-4 py-3 text-right">Qté</th>
                      <th className="px-4 py-3 text-right">Total TTC</th>
                      <th className="px-4 py-3">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats.topProducts.length > 0 ? stats.topProducts.map((product: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-700">{product.name}</td>
                        <td className="px-4 py-3 text-center text-slate-500 font-mono">{product.um}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{product.qte.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">{product.totalTTC.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DA</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] py-0 font-bold bg-slate-100 text-slate-600 border-slate-200">
                            {product.type}
                          </Badge>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                          Aucun produit trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Materials Tracking */}
        <Card className="shadow-sm border-slate-200/60 lg:col-span-1">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Suivi Matières Stratégiques (Argile, Feldspath, Défloculant)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[400px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                      <th className="px-4 py-3">Matière Stratégique</th>
                      <th className="px-4 py-3 text-right">Qté Cumulée</th>
                      <th className="px-4 py-3 text-right">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats.strategicMaterials.length > 0 ? stats.strategicMaterials.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-700">{item.name}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">{item.qte.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">{item.totalTTC.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DA</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">
                          Aucun achat de matière stratégique sur cette période.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
