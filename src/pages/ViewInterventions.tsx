import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { exportToExcel, exportToCsvGeneric } from "@/lib/exportUtils";
import TableFilters, { useTableFilters } from "@/components/TableFilters";

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("fr-FR");
  } catch (e) {
    return "-";
  }
};

const formatArray = (arr: any[]) => {
  if (!arr || !Array.isArray(arr)) return "";
  return arr.map((item) => {
    if (item.nom && item.quantite) return `${item.quantite}x ${item.nom}`;
    if (item.nom) return item.nom;
    return JSON.stringify(item);
  }).join(", ");
};

const COLUMNS = [
  { key: "numero", label: "N° Intervention" },
  { key: "date_intervention", label: "Date" },
  { key: "heure_demande", label: "H. Demande" },
  { key: "equipe", label: "Équipe" },
  { key: "demandeur", label: "Demandeur" },
  { key: "visa_demandeur", label: "Visa" },
  { key: "urgence", label: "Urgence" },
  { key: "nature", label: "Type" },
  { key: "type", label: "Nature" },
  { key: "zone_code", label: "Zone" },
  { key: "equipement", label: "Équipement", isEquipJson: true },
  { key: "equipement_code", label: "Code Équipement" },
  { key: "description", label: "Description" },
  { key: "heure_debut", label: "H. Début" },
  { key: "heure_fin", label: "H. Fin" },
  { key: "duree_intervention_minutes", label: "Durée (min)", type: "number" },
  { key: "total_arret", label: "Arrêt Total", type: "number" },
  { key: "arret_cpmp", label: "Arrêt CPMP", type: "number" },
  { key: "arret_cpr", label: "Arrêt CPR", type: "number" },
  { key: "arret_cle", label: "Arrêt CLE", type: "number" },
  { key: "arret_ccu", label: "Arrêt CCU", type: "number" },
  { key: "arret_csl", label: "Arrêt CSL", type: "number" },
  { key: "intervenants", label: "Intervenants", isJson: true },
  { key: "pdr_utilisees", label: "PDR", isJson: true },
];

const FILTER_CONFIGS = [
  { key: "Date", label: "Date", type: "date" as const },
  { key: "Zone", label: "Zone", type: "select" as const },
  { key: "Équipement", label: "Équipement", type: "select" as const },
  { key: "Nature", label: "Nature", type: "select" as const },
  { key: "Type", label: "Type", type: "select" as const },
  { key: "Urgence", label: "Urgence", type: "select" as const },
];

export default function ViewInterventions() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: records, error } = await supabase
        .from("interventions")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (!error && records) {
        setData(records);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const rows = data.map((e) => {
    const row: Record<string, any> = { _id: e.id };
    COLUMNS.forEach((c) => { 
      if (c.isJson) {
        row[c.label] = formatArray(e[c.key]);
      } else if ((c as any).isEquipJson) {
        // Show equipment name from JSON object, fallback to equipement_code
        const eq = e[c.key];
        if (eq && typeof eq === 'object' && eq.nom) {
          row[c.label] = eq.nom;
        } else if (typeof eq === 'string') {
          row[c.label] = eq;
        } else {
          row[c.label] = e["equipement_code"] || "-";
        }
      } else if (c.key === "date_intervention" || c.key.includes("heure_")) {
        row[c.label] = e[c.key] ? String(e[c.key]).split('T')[0] : "-";
        if (c.key === "date_intervention") row[c.label] = formatDate(e[c.key]);
        if (c.key === "heure_demande") row[c.label] = e[c.key] ? String(e[c.key]).substring(0, 5) : "-"; 
      } else {
        row[c.label] = e[c.key];
      }
    });

    // Keys expected by TableFilters dynamically
    row["Date"] = e.date_intervention ? e.date_intervention : "";
    row["Zone"] = e.zone_code || "";
    // For filter: use nom from equipement JSON, or fallback
    const eq = e.equipement;
    row["Équipement"] = (eq && typeof eq === 'object' && eq.nom) ? eq.nom : (e.equipement_code || "");
    row["Nature"] = e.type || "";
    row["Type"] = e.nature || "";
    row["Urgence"] = e.urgence || "";

    return row;
  });

  const { filteredData, filterValues, setFilter, clearFilters, hasActiveFilters, uniqueValues } =
    useTableFilters(rows, FILTER_CONFIGS);

  if (loading) return <p className="text-muted-foreground p-8">Chargement…</p>;

  const headers = COLUMNS.map((c) => c.label);
  const exportData = filteredData.map(({ _id, Date, Zone, Équipement, Type, Urgence, ...r }) => {
    const out: Record<string, any> = {};
    headers.forEach((h) => { out[h] = r[h]; });
    return out;
  });

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/maintenance")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Aperçu Complet — Interventions</h1>
            <p className="text-sm text-muted-foreground">{filteredData.length} enregistrements</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToCsvGeneric(exportData, "historique_interventions")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportToExcel(exportData, "historique_interventions")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <TableFilters
        filterConfigs={FILTER_CONFIGS}
        filterValues={filterValues}
        uniqueValues={uniqueValues}
        onSetFilter={setFilter}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="rounded-lg border overflow-auto" style={{ maxHeight: "calc(100vh - 250px)" }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {headers.map((h) => (
                <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, idx) => (
              <TableRow key={idx}>
                {headers.map((h) => (
                  <TableCell key={h} className="font-mono text-xs whitespace-nowrap max-w-[200px] truncate" title={String(row[h] ?? "—")}>
                    {typeof row[h] === "number" ? row[h] : String(row[h] ?? "—")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
