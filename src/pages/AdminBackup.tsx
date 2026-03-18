import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { invokeCloudFunction } from "@/lib/cloudFunctions";

// Cloud project client for storage access (backups are stored on Cloud)
const cloudSupabase = createClient(
  `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Database, FileJson, Upload } from "lucide-react";
import { toast } from "sonner";

export default function AdminBackup() {
  const [isCreating, setIsCreating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createBackup = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await invokeCloudFunction("sqlite-mirror");
      if (error) throw error;
      toast.success(`Backup créé: ${data?.file ?? "OK"} (${data?.journalier_count ?? 0} journalier, ${data?.emballage_count ?? 0} emballage)`);
    } catch (e: any) {
      toast.error("Erreur backup: " + (e.message || String(e)));
    } finally {
      setIsCreating(false);
    }
  };

  const downloadLatest = async () => {
    setIsDownloading(true);
    try {
      // List files in bucket, sorted by name (descending = latest first)
      const { data: files, error: listError } = await cloudSupabase.storage
        .from("database-backups")
        .list("", { limit: 100, sortBy: { column: "name", order: "desc" } });

      if (listError) throw listError;
      if (!files || files.length === 0) {
        toast.error("Aucun backup disponible");
        return;
      }

      const latestFile = files[0].name;

      const { data, error } = await cloudSupabase.storage
        .from("database-backups")
        .download(latestFile);

      if (error) throw error;

      // Trigger browser download
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = latestFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Téléchargé: ${latestFile}`);
    } catch (e: any) {
      toast.error("Erreur téléchargement: " + (e.message || String(e)));
    } finally {
      setIsDownloading(false);
    }
  };

  const exportJson = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await invokeCloudFunction("export-json");
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Export JSON téléchargé (${Object.values(data.counts || {}).reduce((a: number, b: any) => a + Number(b), 0)} lignes au total)`);
    } catch (e: any) {
      toast.error("Erreur export JSON: " + (e.message || String(e)));
    } finally {
      setIsExporting(false);
    }
  };

  const importJson = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      if (!jsonData.tables) {
        toast.error("Format JSON invalide: propriété 'tables' manquante");
        return;
      }

      const { data, error } = await invokeCloudFunction("import-json", jsonData);
      if (error) throw error;

      if (data?.success) {
        const summary = Object.entries(data.results || {})
          .map(([table, r]: [string, any]) => `${table}: ${r.inserted}`)
          .join(", ");
        toast.success(`Import terminé! ${summary}`);
        
        const allErrors = Object.entries(data.results || {})
          .flatMap(([table, r]: [string, any]) => r.errors?.map((e: string) => `${table}: ${e}`) || []);
        if (allErrors.length > 0) {
          toast.warning(`${allErrors.length} erreur(s): ${allErrors[0]}`);
        }
      } else {
        toast.error("Erreur import: " + (data?.error || "Inconnu"));
      }
    } catch (e: any) {
      toast.error("Erreur import JSON: " + (e.message || String(e)));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-[800px]">
      <div>
        <h1 className="text-2xl font-bold">Administration — Backups</h1>
        <p className="text-sm text-muted-foreground">
          Gestion des sauvegardes et migration de données
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Backup SQLite Mirror
          </CardTitle>
          <CardDescription>
            Chaque sauvegarde crée un fichier SQLite complet contenant toutes les données de production.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={createBackup} disabled={isCreating} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isCreating ? "animate-spin" : ""}`} />
              {isCreating ? "Création en cours…" : "Créer un backup maintenant"}
            </Button>
            <Button variant="outline" onClick={downloadLatest} disabled={isDownloading} className="gap-2">
              <Download className="h-4 w-4" />
              {isDownloading ? "Téléchargement…" : "Télécharger le dernier backup (.db)"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Les backups sont aussi créés automatiquement à chaque insertion ou modification de données.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Export JSON (Migration)
          </CardTitle>
          <CardDescription>
            Exporte toutes les tables en un seul fichier JSON, idéal pour migrer vers un autre projet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportJson} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            {isExporting ? "Export en cours…" : "Télécharger l'export JSON complet"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import JSON (Restauration / Migration)
          </CardTitle>
          <CardDescription>
            Importe un fichier JSON exporté précédemment. Les données existantes avec le même ID seront mises à jour (upsert).
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
            {isImporting ? "Import en cours…" : "Sélectionner un fichier JSON à importer"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Le fichier doit avoir le format généré par l'export JSON (avec la propriété "tables").
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
