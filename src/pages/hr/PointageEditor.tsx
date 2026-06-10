import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter, Save, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PointageEditorProps {
  rhData: any[]; // Data from fichRH
}

const STATUTS = [
  { value: "PRESENT", label: "Présent" },
  { value: "ABS_AUTORISEE", label: "Absence Autorisée" },
  { value: "ABS_NON_AUTORISEE", label: "Absence Non Autorisée" },
];

const MOTIFS = [
  "CONGE_ANNUEL",
  "CONGE_MALADIE",
  "CONGE_DECES",
  "CONGE_MARIAGE",
  "FORMATION",
  "CONGE_SANS_SOLDE",
  "CONGE_CIRCONCISION",
  "RECUPERATION",
  "CONGE_NAISSANCE",
];

const getProp = (obj: any, key: string) => {
  if (!obj) return undefined;
  if (obj[key] !== undefined) return obj[key];
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_]/g, "");
  const target = normalize(key);
  const foundKey = Object.keys(obj).find(k => normalize(k) === target);
  return foundKey ? obj[foundKey] : undefined;
};

// Row Component for each employee to manage local state
const EmployeeRow = ({ emp, pointage, dateStr, onSave }: any) => {
  const matricule = String(getProp(emp, "Matricule"));
  const nom = String(getProp(emp, "Nom") || "");
  const prenom = String(getProp(emp, "Prénom") || "");
  const service = String(getProp(emp, "Service") || "—");

  const [statut, setStatut] = useState(pointage?.statut || "PRESENT");
  const [etat, setEtat] = useState(pointage?.etat || "");
  const [retard, setRetard] = useState(pointage?.retard?.toString() || "0");
  const [heuresSupp, setHeuresSupp] = useState(pointage?.heures_supp?.toString() || "0");
  const [isSaving, setIsSaving] = useState(false);

  const isAbsent = statut !== "PRESENT";

  // Check if modified compared to the prop
  const isModified = 
    statut !== (pointage?.statut || "PRESENT") ||
    etat !== (pointage?.etat || "") ||
    retard !== (pointage?.retard?.toString() || "0") ||
    heuresSupp !== (pointage?.heures_supp?.toString() || "0");

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      matricule,
      date: dateStr,
      statut,
      etat: isAbsent ? etat : null,
      retard: parseFloat(retard) || 0,
      heures_supp: parseFloat(heuresSupp) || 0
    });
    setIsSaving(false);
  };

  return (
    <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
      <td className="px-4 py-3 text-sm font-semibold text-slate-700">
        <div className="flex flex-col">
          <span>{nom} {prenom}</span>
          <span className="text-[10px] text-slate-400 font-normal">{matricule}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{service}</td>
      <td className="px-4 py-3">
        <select 
          value={statut} 
          onChange={e => {
            setStatut(e.target.value);
            if (e.target.value === "PRESENT") setEtat("");
          }}
          className={cn(
            "text-xs border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20",
            statut === "PRESENT" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
            statut === "ABS_AUTORISEE" ? "border-amber-200 bg-amber-50 text-amber-700" :
            "border-rose-200 bg-rose-50 text-rose-700"
          )}
        >
          {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <select 
          value={etat} 
          onChange={e => setEtat(e.target.value)}
          disabled={!isAbsent}
          className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white disabled:bg-slate-100 disabled:opacity-50 min-w-[140px]"
        >
          <option value="">Sélectionner un motif...</option>
          {MOTIFS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Input 
            type="number" 
            min="0" step="0.5" 
            value={retard} 
            onChange={e => setRetard(e.target.value)}
            disabled={isAbsent}
            className="w-16 h-7 text-xs px-2 disabled:opacity-50"
          />
          <span className="text-xs text-slate-400">h</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Input 
            type="number" 
            min="0" step="0.5" 
            value={heuresSupp} 
            onChange={e => setHeuresSupp(e.target.value)}
            className="w-16 h-7 text-xs px-2"
          />
          <span className="text-xs text-slate-400">h</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <Button 
          size="sm" 
          onClick={handleSave} 
          disabled={isSaving || !isModified}
          variant={isModified ? "default" : "secondary"}
          className={cn("h-7 px-3 text-xs", isModified ? "bg-primary text-white" : "text-slate-500 opacity-50")}
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : isModified ? "Sauvegarder" : "À jour"}
        </Button>
      </td>
    </tr>
  );
};

export default function PointageEditor({ rhData }: PointageEditorProps) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedService, setSelectedService] = useState<string>("Production");

  const servicesList = useMemo(() => {
    const svcs = new Set<string>();
    (rhData || []).forEach(emp => {
      const s = String(getProp(emp, "Service") || "").trim();
      if (s) svcs.add(s);
    });
    return Array.from(svcs).sort();
  }, [rhData]);

  // If selected service isn't in list but we have services, default to first
  useMemo(() => {
    if (servicesList.length > 0 && !servicesList.includes(selectedService)) {
      setSelectedService(servicesList[0]);
    }
  }, [servicesList, selectedService]);

  const employeesInService = useMemo(() => {
    return (rhData || [])
      .filter(emp => String(getProp(emp, "Service") || "").trim() === selectedService)
      .sort((a, b) => {
        const nomA = String(getProp(a, "Nom") || "");
        const nomB = String(getProp(b, "Nom") || "");
        return nomA.localeCompare(nomB);
      });
  }, [rhData, selectedService]);

  // Fetch pointage records for selected date
  const { data: pointages = [], isLoading: loadingPointages } = useQuery({
    queryKey: ["pointage_edit", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pointage_rh")
        .select("*")
        .eq("date", selectedDate);
      if (error) throw error;
      return data || [];
    }
  });

  const pointageMap = useMemo(() => {
    const map: Record<string, any> = {};
    pointages.forEach(p => {
      map[p.matricule] = p;
    });
    return map;
  }, [pointages]);

  // Mutation to save pointage
  const savePointageMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("pointage_rh")
        .upsert({
          matricule: payload.matricule,
          date: payload.date,
          statut: payload.statut,
          etat: payload.etat,
          retard: payload.retard,
          heures_supp: payload.heures_supp,
        }, {
          onConflict: 'matricule,date'
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pointage_edit"] });
      queryClient.invalidateQueries({ queryKey: ["vue_pointage_month"] }); // invalidate dashboard queries
      queryClient.invalidateQueries({ queryKey: ["pointage_retard"] });
      toast.success("Pointage enregistré", { description: "La base de données a été mise à jour." });
    },
    onError: (error: any) => {
      toast.error("Erreur de sauvegarde", { description: error.message });
    }
  });

  return (
    <div className="space-y-6">
      {/* HEADER / FILTERS */}
      <Card className="border border-slate-200/60 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Date du pointage
            </label>
            <Input 
              type="date" 
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-sm font-medium"
            />
          </div>
          
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Service / Département
            </label>
            <select
              value={selectedService}
              onChange={e => setSelectedService(e.target.value)}
              className="w-full flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {servicesList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            Saisie des pointages — {format(new Date(selectedDate), "dd/MM/yyyy")}
          </CardTitle>
          <div className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border shadow-sm">
            {employeesInService.length} employés affichés
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loadingPointages ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Chargement des données...</p>
            </div>
          ) : employeesInService.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <AlertCircle className="h-8 w-8 opacity-20" />
              <p className="text-sm">Aucun employé trouvé pour ce service.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b">
                  <th className="px-4 py-3">Employé</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Statut Présence</th>
                  <th className="px-4 py-3">Motif (si absent)</th>
                  <th className="px-4 py-3">Retard</th>
                  <th className="px-4 py-3">Heures Supp.</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {employeesInService.map((emp) => {
                  const matricule = String(getProp(emp, "Matricule"));
                  const pointage = pointageMap[matricule];
                  
                  return (
                    <EmployeeRow 
                      key={matricule} 
                      emp={emp} 
                      pointage={pointage} 
                      dateStr={selectedDate}
                      onSave={(payload: any) => savePointageMutation.mutateAsync(payload)}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
