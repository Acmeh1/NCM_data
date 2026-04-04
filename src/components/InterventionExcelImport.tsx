import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import equipementsDataRaw from '@/data/Liste_FINAL_de_codification_des_equipements .json';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseExcelDate = (dateStr: string | number | undefined | null): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // Handle Excel serial number (number OR numeric string like "46079")
  const asNum = typeof dateStr === 'number' ? dateStr : Number(dateStr);
  if (!isNaN(asNum) && asNum > 1000 && asNum < 100000) {
    // Valid Excel date serial range (roughly 1900–2173)
    const d = new Date(Math.round((asNum - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  const str = String(dateStr).trim();
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    let year = parts[2];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (_) { }
  return new Date().toISOString().split('T')[0];
};

// Handles "20 min", "2h30", "240 min", plain numbers
const parseMinutes = (val: string | number | undefined | null): number => {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') return Math.round(val);
  const str = String(val).trim();
  const minMatch = str.match(/(\d+)\s*min/i);
  if (minMatch) return parseInt(minMatch[1], 10);
  const hMatch = str.match(/(\d+)\s*h\s*(\d*)/i);
  if (hMatch) return parseInt(hMatch[1], 10) * 60 + (hMatch[2] ? parseInt(hMatch[2], 10) : 0);
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num);
};

// Finds a column value by trying multiple key variants (handles \xa0, trailing spaces)
const getCol = (row: any, ...keys: string[]): string => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return String(row[key]);
    const normalKey = key.trim().replace(/\xa0/g, ' ').trim().toLowerCase();
    const found = Object.keys(row).find(
      k => k.trim().replace(/\xa0/g, ' ').trim().toLowerCase() === normalKey
    );
    if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') {
      return String(row[found]);
    }
  }
  return '';
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function InterventionExcelImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const processExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setResults(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows.length === 0) throw new Error('Le fichier Excel semble vide ou mal formaté.');

      const formattedData = rows.map((row: any, index: number) => {
        try {
          // ── Description: 3 colonnes fusionnées ───────────────────────────
          const defaut = getCol(row, 'Défaut remarqué ', 'Défaut remarqué');
          const ops = getCol(row, ' Les opérations à effectuer\xa0: ', 'Les opérations à effectuer :', 'Les opérations à effectuer');
          const obs = getCol(row, 'Observation\xa0', 'Observation');
          let description = '';
          if (defaut) description += `Défaut: ${defaut}\n`;
          if (ops) description += `Opérations: ${ops}\n`;
          if (obs) description += `Observation: ${obs}`;

          // ── Intervenants colonnes 1 à 7 ──────────────────────────────────
          const intervenants: { nom: string; visa: string }[] = [];
          for (let i = 1; i <= 7; i++) {
            const key = i === 1 ? 'Intervenants et Visas' : `Intervenants et Visas${i}`;
            const val = getCol(row, key);
            if (val) intervenants.push({ nom: val, visa: 'Excel' });
          }
          if (intervenants.length === 0) intervenants.push({ nom: 'Système/Excel', visa: 'N/A' });

          // ── Pièces de rechange ────────────────────────────────────────────
          const pdrText = getCol(row, 'Pièces de rechange');
          const pdr_utilisees = pdrText ? [{ nom: pdrText, quantite: 1 }] : [];

          // ── Equipement + Zone: lookup dans le JSON de codification ─────────
          const equipStr = getCol(row, 'Equipement ', 'Equipement').trim();
          const excelZone = getCol(row, 'zone \xa0', 'zone ', 'zone').trim();
          const excelCode = getCol(row, 'code').trim();

          type EquipEntry = {
            Equipements: string | null;
            'code d\'équipement': string | null;
            'code de la zone': string | null;
            zone: string | null;
          };
          const equipements = equipementsDataRaw as EquipEntry[];
          const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

          // Match exact d'abord, puis partiel
          let foundEquip = equipements.find(
            eq => eq.Equipements && normalize(eq.Equipements) === normalize(equipStr)
          );
          if (!foundEquip && equipStr) {
            foundEquip = equipements.find(eq =>
              eq.Equipements && (
                normalize(equipStr).includes(normalize(eq.Equipements)) ||
                normalize(eq.Equipements).includes(normalize(equipStr))
              )
            );
          }

          // equipement_code depuis JSON, sinon colonne code Excel, sinon nom brut
          const equip_code = foundEquip?.['code d\'équipement']?.trim() || excelCode || equipStr;

          // zone_code depuis JSON, sinon colonne code Excel
          const zone_code = foundEquip?.['code de la zone']?.trim() || excelCode || excelZone;

          // ── Date — pass raw value to preserve Excel serial number type ──
          const rawDate = row['Date\xa0'] ?? row['Date'] ?? getCol(row, 'Date\xa0', 'Date');
          const parsedDate = parseExcelDate(rawDate);

          // ── Durées: gère "20 min", "2h30", nombres bruts ─────────────────
          const duree = parseMinutes(
            getCol(row, "Temps d\u2019arret intervention", "Temps d'arret intervention", 'Temps darret intervention')
          );
          const arretProd = parseMinutes(
            getCol(row, "Temps d\u2019arret production", "Temps d'arret production", 'Temps darret production')
          );

          return {
            numero: getCol(row, 'N° Intervention') || `EXCEL-${Date.now()}-${index}`,
            date_intervention: parsedDate,
            heure_demande: getCol(row, 'Heure de demande', 'Heure') || '08:00',
            equipe: getCol(row, 'Equipe') || null,
            demandeur: getCol(row, 'Operateur', 'Demandeur', 'Operateur ') || 'Import Excel',
            visa_demandeur: 'Excel',
            urgence: getCol(row, 'Urgence') || 'Moyenne',
            nature: getCol(row, 'Nature') || 'Corrective',
            type: getCol(row, 'Type') || 'Intervention',
            zone_code: zone_code || '',
            equipement_code: equip_code || '',
            equipement: foundEquip ? {
              nom: foundEquip.Equipements?.trim() || equipStr,
              "code d'équipement": foundEquip['code d\'équipement']?.trim() || equip_code,
              "code de la zone": foundEquip['code de la zone']?.trim() || zone_code,
              zone: foundEquip.zone?.trim() || excelZone,
            } : {
              nom: equipStr,
              "code d'équipement": equip_code,
              "code de la zone": zone_code,
              zone: excelZone,
            },
            description: description.trim() || '',
            heure_debut: `${parsedDate}T00:00:00+00:00`,
            heure_fin: `${parsedDate}T00:00:00+00:00`,
            duree_intervention_minutes: duree,
            total_arret: arretProd,
            intervenants,
            pdr_utilisees,
            pdr_consommables: [],
            arret_cpmp: 0,
            arret_cpr: 0,
            arret_cle: 0,
            arret_ccu: 0,
            arret_csl: 0,
          };
        } catch (err: any) {
          throw new Error(`Erreur Ligne ${index + 2}: ${err.message}`);
        }
      });

      // ── Batch upload ────────────────────────────────────────────────────────
      const batchSize = 100;
      let successCount = 0;
      let errorsCount = 0;
      const errorLogs: string[] = [];

      for (let i = 0; i < formattedData.length; i += batchSize) {
        const batch = formattedData.slice(i, i + batchSize);
        const { error } = await supabase.from('interventions').insert(batch);
        if (error) {
          console.error('Batch error:', error);
          errorsCount += batch.length;
          errorLogs.push(`Lot ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          successCount += batch.length;
        }
      }

      setResults({ success: successCount, failed: errorsCount, errors: errorLogs });
      toast(
        errorsCount === 0
          ? { title: 'Import réussi', description: `${successCount} enregistrements importés avec succès.` }
          : { title: 'Import partiel', description: `${successCount} réussis, ${errorsCount} échoués.`, variant: 'destructive' }
      );

    } catch (err: any) {
      console.error(err);
      toast({ title: "Erreur d'import", description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border-dashed bg-muted/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
          Importer des Interventions (Excel)
        </CardTitle>
        <CardDescription>
          Mettez en ligne un fichier <code>.xlsx</code> au format <strong>Fiche-ENRG-OT</strong> pour charger rapidement des données dans la base.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            ref={fileInputRef}
            className="hidden"
            onChange={processExcel}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
            {isProcessing
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Traitement...</>
              : <><Upload className="h-4 w-4 mr-2" /> Sélectionner un fichier</>
            }
          </Button>
          <span className="text-xs text-muted-foreground">Extensions supportées : .xlsx, .xls</span>
        </div>

        {results && (
          <div className="mt-4 flex flex-col gap-2">
            {results.success > 0 && (
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <CheckCircle2 className="h-4 w-4 stroke-green-600" />
                <AlertTitle className="text-green-800">Succès</AlertTitle>
                <AlertDescription>{results.success} ligne(s) importée(s) avec succès.</AlertDescription>
              </Alert>
            )}
            {results.failed > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Des erreurs sont survenues</AlertTitle>
                <AlertDescription>
                  {results.failed} ligne(s) échouée(s).
                  {results.errors.map((e, idx) => (
                    <div key={idx} className="mt-1 text-xs">{e}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}