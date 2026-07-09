import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Filter } from "lucide-react";

interface WorkforceDetailProps {
  rhData: any[]; // Data from fichRH
}

const getProp = (obj: any, key: string) => {
  if (!obj) return undefined;
  if (obj[key] !== undefined) return obj[key];
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_]/g, "");
  const target = normalize(key);
  const foundKey = Object.keys(obj).find(k => normalize(k) === target);
  return foundKey ? obj[foundKey] : undefined;
};

// Date formatter
const formatDisplayDate = (dateStr: any) => {
  if (!dateStr) return "-";
  if (typeof dateStr === "number") {
    const d = new Date((dateStr - 25569) * 86400 * 1000);
    return d.toLocaleDateString("fr-FR");
  }
  if (typeof dateStr === "string") {
    if (dateStr.includes("/")) return dateStr;
    if (dateStr.includes("-")) {
      const parts = dateStr.split("T")[0].split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return String(dateStr);
};

const parseRobustDate = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  if (typeof dateStr === "number") {
    return new Date((dateStr - 25569) * 86400 * 1000);
  }
  
  const str = String(dateStr).trim();
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  } else if (str.includes("-")) {
    const d = new Date(str.split("T")[0]);
    if (!isNaN(d.getTime())) return d;
  }
  
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  
  return null;
};

const calculateAnciennetePrecise = (dateStr: any) => {
  const d = parseRobustDate(dateStr);
  if (!d) return "-";
  
  const today = new Date();
  let years = today.getFullYear() - d.getFullYear();
  let months = today.getMonth() - d.getMonth();
  
  if (months < 0 || (months === 0 && today.getDate() < d.getDate())) {
    years--;
    months += 12;
  }
  
  if (years < 0) return "-";
  if (years > 0) {
    return `${years} an${years > 1 ? 's' : ''}`;
  } else {
    return `${months} mois`;
  }
};

const hasDepartureDate = (dateStr: any) => {
  if (!dateStr) return false;
  const str = String(dateStr).trim();
  return str !== "" && str !== "-" && str !== "0" && str !== "N/A";
};

export default function WorkforceDetail({ rhData }: WorkforceDetailProps) {
  const [selectedService, setSelectedService] = useState<string>("Production");

  const serviceStats = useMemo(() => {
    const stats: Record<string, { total: number }> = {};
    (rhData || []).forEach(emp => {
      const s = String(getProp(emp, "Service") || "").trim();
      if (s && s !== "undefined") {
        if (!stats[s]) stats[s] = { total: 0 };
        stats[s].total++;
      }
    });
    return Object.entries(stats)
      .map(([name, data]) => ({ name, total: data.total }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rhData]);

  // Default to first service if selected is not available
  useMemo(() => {
    if (serviceStats.length > 0 && !serviceStats.find(s => s.name === selectedService)) {
      setSelectedService(serviceStats[0].name);
    }
  }, [serviceStats, selectedService]);

  const employeesInService = useMemo(() => {
    return (rhData || [])
      .filter(emp => String(getProp(emp, "Service") || "").trim() === selectedService)
      .sort((a, b) => {
        const nomA = String(getProp(a, "Nom") || "");
        const nomB = String(getProp(b, "Nom") || "");
        return nomA.localeCompare(nomB);
      });
  }, [rhData, selectedService]);

  // --- Contrôles et calculs des contrats ---
  const contractStats = useMemo(() => {
    let cdi = 0, cdd = 0, interim = 0, stage = 0;
    const upcomingExpirations: any[] = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    (rhData || []).forEach(emp => {
      // Exclude departed employees
      const depDate = getProp(emp, "Date_départ") || getProp(emp, "Date_depart");
      if (hasDepartureDate(depDate)) return;

      const contratRaw = String(getProp(emp, "Contrat") || "").toLowerCase().trim();
      let type = "Autre";
      if (contratRaw.includes("cdi")) { cdi++; type = "CDI"; }
      else if (contratRaw.includes("cdd")) { cdd++; type = "CDD"; }
      else if (contratRaw.includes("intérim") || contratRaw.includes("interim")) { interim++; type = "Intérim"; }
      else if (contratRaw.includes("stage") || contratRaw.includes("stagiaire")) { stage++; type = "Stage"; }

      // Check upcoming expirations for non-CDI
      if (type !== "CDI" && type !== "Autre") {
        const finContratRaw = getProp(emp, "Fin_Contrat") || getProp(emp, "Date_fin_contrat") || getProp(emp, "Date_fin");
        if (finContratRaw) {
          const finDate = parseRobustDate(finContratRaw);
          if (finDate && finDate >= today && finDate <= thirtyDaysFromNow) {
            upcomingExpirations.push({
              emp,
              type,
              finDate,
              displayDate: formatDisplayDate(finContratRaw)
            });
          }
        }
      }
    });

    upcomingExpirations.sort((a, b) => a.finDate.getTime() - b.finDate.getTime());

    const total = cdi + cdd + interim + stage;
    return {
      cdi, cdd, interim, stage,
      total,
      upcomingExpirations: upcomingExpirations.slice(0, 4)
    };
  }, [rhData]);

  const cdiPercentage = contractStats.total > 0 ? Math.round((contractStats.cdi / contractStats.total) * 100) : 0;
  const cddPercentage = contractStats.total > 0 ? Math.round((contractStats.cdd / contractStats.total) * 100) : 0;
  const interimPercentage = contractStats.total > 0 ? Math.round((contractStats.interim / contractStats.total) * 100) : 0;
  const stagePercentage = contractStats.total > 0 ? Math.round((contractStats.stage / contractStats.total) * 100) : 0;

  const circleCircumference = 2 * Math.PI * 44; // r=44
  const cdiStrokeDashoffset = circleCircumference - (cdiPercentage / 100) * circleCircumference;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* VUE D'ENSEMBLE DES CONTRATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-3xs space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display">Distribution des Contrats</h4>
            <p className="text-xs text-slate-400">Nature des accords d'embauche actifs</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex items-center justify-center w-28 h-28 shrink-0">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="44" stroke="#f1f5f9" strokeWidth="10" fill="none"></circle>
                <circle cx="56" cy="56" r="44" stroke="#10b981" strokeWidth="10" strokeDasharray={circleCircumference} strokeDashoffset={cdiStrokeDashoffset} strokeLinecap="round" fill="none"></circle>
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-base font-bold text-slate-800 font-display">{cdiPercentage}%</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">CDI</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 text-xs font-bold text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(16, 185, 129)' }}></span>
                  <span>CDI</span>
                </span>
                <span className="text-slate-500">{contractStats.cdi} ({cdiPercentage}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(59, 130, 246)' }}></span>
                  <span>CDD</span>
                </span>
                <span className="text-slate-500">{contractStats.cdd} ({cddPercentage}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(245, 158, 11)' }}></span>
                  <span>Intérim</span>
                </span>
                <span className="text-slate-500">{contractStats.interim} ({interimPercentage}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(139, 92, 246)' }}></span>
                  <span>Stage</span>
                </span>
                <span className="text-slate-500">{contractStats.stage} ({stagePercentage}%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-3xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display">Fin de Contrat Proche</h4>
              <p className="text-xs text-slate-400">Renouvellements obligatoires sous 30 j.</p>
            </div>
            <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {contractStats.upcomingExpirations.length > 0 ? "Alertes" : "À jour"}
            </span>
          </div>
          
          <div className="divide-y divide-slate-100">
            {contractStats.upcomingExpirations.length === 0 ? (
               <div className="py-4 text-center text-xs text-slate-500">Aucune expiration prévue dans les 30 prochains jours.</div>
            ) : (
               contractStats.upcomingExpirations.map((exp, idx) => {
                 const nom = String(getProp(exp.emp, "Nom") || "");
                 const prenom = String(getProp(exp.emp, "Prénom") || "");
                 const initials = `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase();
                 
                 return (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center font-bold font-display text-[11px]">
                        {initials}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{nom} {prenom}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Type : {exp.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-rose-600">{exp.displayDate}</p>
                      <p className="text-[9px] text-slate-400 font-bold">Expire bientôt</p>
                    </div>
                  </div>
                 )
               })
            )}
          </div>
        </div>
      </div>

      {/* HEADER / FILTERS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {serviceStats.map((srv) => (
          <div 
            key={srv.name} 
            onClick={() => setSelectedService(srv.name)}
            className={`p-4 rounded-xl border transition-all cursor-pointer group ${
              selectedService === srv.name 
                ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" 
                : "bg-white border-slate-200 hover:border-primary/30 hover:bg-slate-50"
            }`}
          >
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 line-clamp-1">{srv.name}</p>
            <div className="text-xl font-black">{srv.total}</div>
          </div>
        ))}
      </div>

      {/* DATA TABLE */}
      <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Effectif : {selectedService}
          </CardTitle>
          <div className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border shadow-sm">
            {employeesInService.length} employé(s)
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {employeesInService.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Aucun employé trouvé pour le service {selectedService}.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Employé</th>
                    <th className="px-4 py-3 font-semibold">Fonction</th>
                    <th className="px-4 py-3 font-semibold">Contrat</th>
                    <th className="px-4 py-3 font-semibold">Date d'Embauche</th>
                    <th className="px-4 py-3 font-semibold">Ancienneté</th>
                    <th className="px-4 py-3 font-semibold">Âge</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesInService.map((emp, index) => {
                    const matricule = String(getProp(emp, "Matricule") || "-");
                    const nom = String(getProp(emp, "Nom") || "");
                    const prenom = String(getProp(emp, "Prénom") || "");
                    const fonction = String(getProp(emp, "Fonction") || "-");
                    const contrat = String(getProp(emp, "Contrat") || "-");
                    const embaucheRaw = getProp(emp, "Date_Embauche");
                    const embauche = formatDisplayDate(embaucheRaw);
                    const ancienneteCalculee = calculateAnciennetePrecise(embaucheRaw);
                    const age = getProp(emp, "AGE");
                    
                    const depDate = getProp(emp, "Date_départ") || getProp(emp, "Date_depart");
                    const isDeparted = hasDepartureDate(depDate);

                    return (
                      <tr 
                        key={matricule + index} 
                        className={`transition-colors border-b border-slate-100 last:border-0 ${
                          isDeparted ? "bg-rose-50/50 hover:bg-rose-100/50" : "hover:bg-slate-50/50"
                        }`}
                      >
                        <td className="px-4 py-3 text-sm font-semibold">
                          <div className="flex flex-col">
                            <span className={isDeparted ? "text-rose-700" : "text-slate-700"}>{nom} {prenom}</span>
                            <span className={`text-[10px] font-normal ${isDeparted ? "text-rose-400" : "text-slate-400"}`}>{matricule}</span>
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-xs ${isDeparted ? "text-rose-600" : "text-slate-600"}`}>{fonction}</td>
                        <td className={`px-4 py-3 text-xs ${isDeparted ? "text-rose-600" : "text-slate-600"}`}>{contrat}</td>
                        <td className={`px-4 py-3 text-xs ${isDeparted ? "text-rose-600" : "text-slate-600"}`}>{embauche}</td>
                        <td className={`px-4 py-3 text-xs font-medium ${isDeparted ? "text-rose-700" : "text-emerald-700"}`}>
                          {ancienneteCalculee}
                        </td>
                        <td className={`px-4 py-3 text-xs ${isDeparted ? "text-rose-600" : "text-slate-600"}`}>
                          {age ? `${age} ans` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
