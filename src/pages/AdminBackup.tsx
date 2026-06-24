import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileJson, Upload, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// Tables complètes à exporter / importer de Supabase
const TABLES_TO_SYNC = [
  "production_globale",
  "production_emballage",
  "production_selection",
  "stats_linea",
  "casse_ceramique",
  "interventions",
  "employees",
  "pointage_rh",
  "pointage_rh_details",
  "kpi_config",
  "profiles",
  "user_roles",
  "user_permissions"
];

export default function AdminBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportJson = async () => {
    setIsExporting(true);
    toast.info("Préparation de l'export JSON depuis Supabase...");
    try {
      const exportData: { tables: Record<string, any[]>; counts: Record<string, number> } = { 
        tables: {}, 
        counts: {} 
      };

      for (const table of TABLES_TO_SYNC) {
        // Fetch toutes les données de la table
        // limit 10000 est une précaution au cas où Supabase limite les requêtes (par defaut 1000)
        // Vous pouvez ajuster si nécessaire, mais cela suffit pour la plupart des PME.
        const { data, error } = await supabase.from(table).select("*").limit(10000);
        
        if (error) {
          console.error(`Erreur d'export pour la table ${table}:`, error);
          continue;
        }

        if (data) {
          exportData.tables[table] = data;
          exportData.counts[table] = data.length;
        }
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_supabase_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const totalLines = Object.values(exportData.counts).reduce((a: number, b: number) => a + b, 0);
      toast.success(`Export JSON téléchargé avec succès (${totalLines} lignes au total).`);
    } catch (e: any) {
      toast.error("Erreur lors de l'export : " + (e.message || String(e)));
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };


  const importJson = async (file: File) => {
    setIsImporting(true);
    toast.info("Lecture du fichier JSON pour l'import...");
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      if (!jsonData.tables) {
        toast.error("Format JSON invalide: propriété 'tables' manquante.");
        return;
      }

      const results: Record<string, { inserted: number; errors: string[] }> = {};
      let hasGlobalError = false;

      // Importation table par table
      for (const table of Object.keys(jsonData.tables)) {
        if (!TABLES_TO_SYNC.includes(table)) {
          console.warn(`Table ${table} ignorée car non reconnue.`);
          continue;
        }

        const rows = jsonData.tables[table];
        if (!rows || rows.length === 0) continue;

        results[table] = { inserted: 0, errors: [] };

        // On procède à un upsert (mise à jour si l'id existe déjà, sinon insertion)
        const { data, error } = await supabase.from(table).upsert(rows);
        
        if (error) {
          hasGlobalError = true;
          results[table].errors.push(error.message);
          console.error(`Erreur lors de l'import pour la table ${table}:`, error);
        } else {
          results[table].inserted = rows.length;
        }
      }

      if (hasGlobalError) {
        toast.error("L'import s'est terminé avec des erreurs. Consultez la console.");
      } else {
        const summary = Object.entries(results)
          .filter(([_, r]) => r.inserted > 0)
          .map(([table, r]) => `${table}: ${r.inserted}`)
          .join(" | ");
        toast.success(`Import terminé avec succès! (${summary})`);
      }
    } catch (e: any) {
      toast.error("Erreur générale lors de l'import : " + (e.message || String(e)));
      console.error(e);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-[800px]">
      <div>
        <h1 className="text-2xl font-bold">Administration — Backups & Migrations</h1>
        <p className="text-sm text-muted-foreground">
          Gestions des sauvegardes JSON en temps réel avec Supabase
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Stockage Sécurisé Supabase
          </CardTitle>
          <CardDescription>
            Vos données sont désormais sauvegardées automatiquement par Supabase. L'outil ci-dessous vous permet d'exporter une copie JSON complète pour vos archives ou imports hors-ligne. (Les fonctions SQLite obsolètes ont été retirées).
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Export JSON Complet
          </CardTitle>
          <CardDescription>
            Exporte instantanément toutes les tables de votre base en un seul fichier JSON compact. 
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportJson} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            {isExporting ? "Création de l'export..." : "Télécharger mon archive JSON"}
          </Button>
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import / Restauration (JSON)
          </CardTitle>
          <CardDescription>
            Restaurez un fichier exporté précédemment. Les données existantes (avec les mêmes identifiants) seront automatiquement mises à jour pour éviter les doublons.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importJson(file);
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            variant="outline"
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? "Importation en cours..." : "Sélectionner un fichier JSON"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
