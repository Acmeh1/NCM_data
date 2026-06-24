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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
