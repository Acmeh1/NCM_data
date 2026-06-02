import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useProductionStore } from "@/hooks/useProductionStore";
import { useStatsLineaStore, type StatsLineaEntry } from "@/hooks/useStatsLineaStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BarChart3, ChevronDown, ChevronRight, Eye, Info, Plus, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { JsonImport } from "@/components/JsonImport";
import refProduit from "@/data/REF_PRODUIT.json";
import formatData from "@/data/Format.json";
import StatsLineaTable from "@/components/StatsLineaTable";

type NumericField = number | "";

type FormValues = {
  production_id: string;

  choix1_pieces: NumericField;
  choix2_pieces: NumericField;
  choix3_pieces: NumericField;
  // Qualité par choix
  choix1_operateur_pieces: NumericField;
  choix1_planar_pieces: NumericField;
  choix1_calibre_pieces: NumericField;
  choix2_operateur_pieces: NumericField;
  choix2_planar_pieces: NumericField;
  choix2_calibre_pieces: NumericField;
  choix3_operateur_pieces: NumericField;
  choix3_planar_pieces: NumericField;
  choix3_calibre_pieces: NumericField;

  minutes_absence_alimentation: NumericField;
  minutes_urgence_manuelle: NumericField;
  minutes_machine_saturee: NumericField;

  vitesse_moyenne_pieces_min: NumericField;
  machine_allumee: NumericField;
  machine_en_marche: NumericField;
  production_reelle_m2: NumericField;
  statut_donnees: string;
  motif_incomplet: string;
};

export default function StatsLinea() {
  const { entries: prodEntries, isLoaded } = useProductionStore();
  const { entries: statsEntries, addEntry, updateEntry, deleteEntry } = useStatsLineaStore();
  const [editingEntry, setEditingEntry] = useState<StatsLineaEntry | null>(null);
  const navigate = useNavigate();

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      production_id: "",
      choix1_pieces: "",
      choix2_pieces: "",
      choix3_pieces: "",
      choix1_operateur_pieces: "",
      choix1_planar_pieces: "",
      choix1_calibre_pieces: "",
      choix2_operateur_pieces: "",
      choix2_planar_pieces: "",
      choix2_calibre_pieces: "",
      choix3_operateur_pieces: "",
      choix3_planar_pieces: "",
      choix3_calibre_pieces: "",
      minutes_absence_alimentation: "",
      minutes_urgence_manuelle: "",
      minutes_machine_saturee: "",
      vitesse_moyenne_pieces_min: "",
      machine_allumee: "",
      machine_en_marche: "",
      production_reelle_m2: "",
      statut_donnees: "Complet",
      motif_incomplet: "",
    },
  });

  const statutDonnees = watch("statut_donnees");

  const selectedProductionId = watch("production_id");
  const selectedProduction = useMemo(
    () => prodEntries.find((p) => p.id === selectedProductionId),
    [prodEntries, selectedProductionId]
  );

  // Build a set of "done" date+groupe+horaire combos (any production in that combo already has stats)
  const doneKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const s of statsEntries) {
      const prod = prodEntries.find((p) => p.id === s.production_id);
      if (prod) {
        keys.add(`${prod.Date}||${prod.Groupe}||${prod.Horaire}`);
      }
    }
    // If editing, remove that key so those entries stay available
    if (editingEntry) {
      const editProd = prodEntries.find((p) => p.id === editingEntry.production_id);
      if (editProd) {
        keys.delete(`${editProd.Date}||${editProd.Groupe}||${editProd.Horaire}`);
      }
    }
    return keys;
  }, [prodEntries, statsEntries, editingEntry]);

  // Filter: keep only productions whose date+groupe+horaire combo is NOT done
  // Then group by date+groupe+horaire to show all models
  const availableProductions = useMemo(() => {
    const filtered = prodEntries.filter(
      (p) => !doneKeys.has(`${p.Date}||${p.Groupe}||${p.Horaire}`)
    );
    
    const groupsMap = new Map<string, any>();
    filtered.forEach((p) => {
      const key = `${p.Date}||${p.Groupe}||${p.Horaire}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          ...p,
          modelesList: [p.Modele],
          couleursList: [p.Couleur],
          formatsList: [p.Format],
        });
      } else {
        const existing = groupsMap.get(key);
        if (!existing.modelesList.includes(p.Modele)) {
          existing.modelesList.push(p.Modele);
          existing.Modele = existing.modelesList.join(", ");
        }
        if (!existing.couleursList.includes(p.Couleur)) {
          existing.couleursList.push(p.Couleur);
          existing.Couleur = existing.couleursList.join(", ");
        }
        if (!existing.formatsList.includes(p.Format)) {
          existing.formatsList.push(p.Format);
          existing.Format = existing.formatsList.join(", ");
        }
      }
    });

    return Array.from(groupsMap.values());
  }, [prodEntries, doneKeys]);

  // Surface CAR m² depuis Format.json (Priorité) ou REF_PRODUIT.json
  const surfaceCAR = useMemo(() => {
    if (!selectedProduction) return 0;
    
    const firstFormat = (selectedProduction as any).formatsList?.[0] || selectedProduction.Format;
    
    // PRIORITY 1: Format.json rules
    const fmtMatch = (formatData as any[]).find(f => f.Format_Nominal === firstFormat);
    if (fmtMatch && fmtMatch.Surface_CAR_m2 && Number(fmtMatch.Surface_CAR_m2) > 0) {
      return Number(fmtMatch.Surface_CAR_m2);
    }

    // PRIORITY 2: REF_PRODUIT.json fallback
    const firstModel = (selectedProduction as any).modelesList?.[0] || selectedProduction.Modele;
    const firstColor = (selectedProduction as any).couleursList?.[0] || selectedProduction.Couleur;

    const match = (refProduit as any[]).find(
      (p) =>
        p.Nom_Commercial === firstModel &&
        (!firstColor || p.Couleur === firstColor) &&
        p.Format_Nominal === firstFormat
    );
    return match ? Number(match.Surface_CAR_m2) : 0;
  }, [selectedProduction]);

  // Section 2 calculs
  const choix1_pieces = Number(watch("choix1_pieces")) || 0;
  const choix2_pieces = Number(watch("choix2_pieces")) || 0;
  const choix3_pieces = Number(watch("choix3_pieces")) || 0;
  const choix1_surface_m2 = surfaceCAR * choix1_pieces;
  const choix2_surface_m2 = surfaceCAR * choix2_pieces;
  const choix3_surface_m2 = surfaceCAR * choix3_pieces;
  const totalPieces = choix1_pieces + choix2_pieces + choix3_pieces;
  const totalSurface = choix1_surface_m2 + choix2_surface_m2 + choix3_surface_m2;

  const pct = (value: number, total: number) =>
    total > 0 ? (value / total) * 100 : 0;

  const choix1_pct = pct(choix1_pieces, totalPieces);
  const choix2_pct = pct(choix2_pieces, totalPieces);
  const choix3_pct = pct(choix3_pieces, totalPieces);

  // Section 3 calculs – Qualité par choix
  const c1_op_pieces = Number(watch("choix1_operateur_pieces")) || 0;
  const c1_planar_pieces = Number(watch("choix1_planar_pieces")) || 0;
  const c1_calibre_pieces = Number(watch("choix1_calibre_pieces")) || 0;
  const c2_op_pieces = Number(watch("choix2_operateur_pieces")) || 0;
  const c2_planar_pieces = Number(watch("choix2_planar_pieces")) || 0;
  const c2_calibre_pieces = Number(watch("choix2_calibre_pieces")) || 0;
  const c3_op_pieces = Number(watch("choix3_operateur_pieces")) || 0;
  const c3_planar_pieces = Number(watch("choix3_planar_pieces")) || 0;
  const c3_calibre_pieces = Number(watch("choix3_calibre_pieces")) || 0;

  // Totaux globaux par type de défaut (tous choix confondus)
  const total_op_defauts = c1_op_pieces + c2_op_pieces + c3_op_pieces;
  const total_planar_defauts = c1_planar_pieces + c2_planar_pieces + c3_planar_pieces;
  const total_calibre_defauts = c1_calibre_pieces + c2_calibre_pieces + c3_calibre_pieces;

  // Taux par type de défaut, calculés sur le total global de ce défaut
  const c1_op_pct = pct(c1_op_pieces, total_op_defauts);
  const c2_op_pct = pct(c2_op_pieces, total_op_defauts);
  const c3_op_pct = pct(c3_op_pieces, total_op_defauts);

  const c1_planar_pct = pct(c1_planar_pieces, total_planar_defauts);
  const c2_planar_pct = pct(c2_planar_pieces, total_planar_defauts);
  const c3_planar_pct = pct(c3_planar_pieces, total_planar_defauts);

  const c1_calibre_pct = pct(c1_calibre_pieces, total_calibre_defauts);
  const c2_calibre_pct = pct(c2_calibre_pieces, total_calibre_defauts);
  const c3_calibre_pct = pct(c3_calibre_pieces, total_calibre_defauts);

  // Section 4 calculs
  const minutes_absence = Number(watch("minutes_absence_alimentation")) || 0;
  const minutes_urgence = Number(watch("minutes_urgence_manuelle")) || 0;
  const minutes_saturee = Number(watch("minutes_machine_saturee")) || 0;
  const minutes_total =
    minutes_absence + minutes_urgence + minutes_saturee;

  // Section 5 calculs
  const user_prod_reelle = watch("production_reelle_m2");
  const production_reelle_m2 = user_prod_reelle !== "" ? Number(user_prod_reelle) : totalSurface;
  const machine_allumee = Number(watch("machine_allumee")) || 0;
  const machine_en_marche = Number(watch("machine_en_marche")) || 0;

  // Hydrate form when editing an existing stats entry
  useEffect(() => {
    if (!editingEntry) return;
    reset({
      production_id: editingEntry.production_id,
      choix1_pieces: editingEntry.choix1_pieces,
      choix2_pieces: editingEntry.choix2_pieces,
      choix3_pieces: editingEntry.choix3_pieces,
      choix1_operateur_pieces: editingEntry.choix1_operateur_pieces,
      choix1_planar_pieces: editingEntry.choix1_planar_pieces,
      choix1_calibre_pieces: editingEntry.choix1_calibre_pieces,
      choix2_operateur_pieces: editingEntry.choix2_operateur_pieces,
      choix2_planar_pieces: editingEntry.choix2_planar_pieces,
      choix2_calibre_pieces: editingEntry.choix2_calibre_pieces,
      choix3_operateur_pieces: editingEntry.choix3_operateur_pieces,
      choix3_planar_pieces: editingEntry.choix3_planar_pieces,
      choix3_calibre_pieces: editingEntry.choix3_calibre_pieces,
      minutes_absence_alimentation: editingEntry.minutes_absence_alimentation,
      minutes_urgence_manuelle: editingEntry.minutes_urgence_manuelle,
      minutes_machine_saturee: editingEntry.minutes_machine_saturee,
      vitesse_moyenne_pieces_min: editingEntry.vitesse_moyenne_pieces_min,
      machine_allumee: editingEntry.machine_allumee,
      machine_en_marche: editingEntry.machine_en_marche,
      production_reelle_m2: editingEntry.production_reelle_m2,
      statut_donnees: editingEntry.statut_donnees || "Complet",
      motif_incomplet: editingEntry.motif_incomplet || "",
    });
  }, [editingEntry, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (!selectedProduction) {
        toast.error("Sélectionnez d'abord une production.");
        return;
      }

      if (values.statut_donnees === "Incomplet" && !values.motif_incomplet.trim()) {
        toast.error("Veuillez saisir un motif pour le statut Incomplet.");
        return;
      }

      const payload = {
        production_id: selectedProduction.id,
        production_date: selectedProduction.Date,

        choix1_pieces,
        choix1_surface_m2,
        choix1_pourcentage: choix1_pct,
        choix2_pieces,
        choix2_surface_m2,
        choix2_pourcentage: choix2_pct,
        choix3_pieces,
        choix3_surface_m2,
        choix3_pourcentage: choix3_pct,
        total_pieces: totalPieces,
        total_surface_m2: totalSurface,

        choix1_operateur_pieces: c1_op_pieces,
        choix1_operateur_pourcentage: c1_op_pct,
        choix1_planar_pieces: c1_planar_pieces,
        choix1_planar_pourcentage: c1_planar_pct,
        choix1_calibre_pieces: c1_calibre_pieces,
        choix1_calibre_pourcentage: c1_calibre_pct,

        choix2_operateur_pieces: c2_op_pieces,
        choix2_operateur_pourcentage: c2_op_pct,
        choix2_planar_pieces: c2_planar_pieces,
        choix2_planar_pourcentage: c2_planar_pct,
        choix2_calibre_pieces: c2_calibre_pieces,
        choix2_calibre_pourcentage: c2_calibre_pct,

        choix3_operateur_pieces: c3_op_pieces,
        choix3_operateur_pourcentage: c3_op_pct,
        choix3_planar_pieces: c3_planar_pieces,
        choix3_planar_pourcentage: c3_planar_pct,
        choix3_calibre_pieces: c3_calibre_pieces,
        choix3_calibre_pourcentage: c3_calibre_pct,

        minutes_absence_alimentation: minutes_absence,
        minutes_urgence_manuelle: minutes_urgence,
        minutes_machine_saturee: minutes_saturee,
        minutes_total_machine: minutes_total,

        vitesse_moyenne_pieces_min: Number(values.vitesse_moyenne_pieces_min) || 0,
        machine_allumee,
        machine_en_marche,
        production_reelle_m2,
        statut_donnees: values.statut_donnees,
        motif_incomplet: values.motif_incomplet,
      };

      if (editingEntry) {
        const result = await updateEntry({ id: editingEntry.id, ...payload });
        if (result) {
          toast.success("Statistiques Linea mises à jour");
          setEditingEntry(null);
          reset();
        } else {
          toast.error("Mise à jour échouée (voir message d'erreur).");
        }
      } else {
        const result = await addEntry(payload);
        if (result) {
          toast.success("Statistiques Linea enregistrées");
          reset();
        } else {
          toast.error("Enregistrement échoué (voir message d'erreur).");
        }
      }
    } catch (e: any) {
      console.error("StatsLinea submit error:", e);
      toast.error("Erreur inattendue lors de l'enregistrement.");
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    const tagName = target.tagName;

    const isInputLike =
      tagName === "INPUT" ||
      tagName === "SELECT" ||
      tagName === "TEXTAREA" ||
      target.getAttribute("role") === "combobox";

    // Ctrl+S / Cmd+S => validation explicite uniquement
    if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSubmit(onSubmit)();
      return;
    }

    if (!isInputLike) return;

    // Entrée => se comporte comme Tab (focus suivant) et ne soumet jamais le formulaire
    if (e.key === "Enter") {
      e.preventDefault();
      const formEl = e.currentTarget;
      const focusables = Array.from(
        formEl.querySelectorAll<HTMLElement>(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          el.getAttribute("aria-hidden") !== "true"
      );

      const currentIndex = focusables.indexOf(target);
      if (currentIndex !== -1) {
        const next = focusables[currentIndex + 1];
        if (next) {
          next.focus();
        }
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold">Statistiques Linea</h1>
        <p className="text-sm text-muted-foreground">
          Analyse de performance et de qualité par rapport à une production journalier.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={handleFormKeyDown}
        className="space-y-6"
      >
        {/* 1. Identification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identification</CardTitle>
            <CardDescription>
              Sélectionnez un rapport de production pour saisir les statistiques associées.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Rapport de production
                </Label>
                <Controller
                  control={control}
                  name="production_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProductions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.Date} — {p.Groupe} — {p.Horaire}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {selectedProduction && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input value={selectedProduction.Date} readOnly className="bg-muted text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Quart</Label>
                  <Input value={selectedProduction.Horaire} readOnly className="bg-muted text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Équipe</Label>
                  <Input value={selectedProduction.Groupe} readOnly className="bg-muted text-xs" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Statut données</Label>
                <Controller
                  control={control}
                  name="statut_donnees"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le statut..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Complet">Complet (8h de données)</SelectItem>
                        <SelectItem value="Incomplet">Incomplet (Moins de 8h)</SelectItem>
                        <SelectItem value="Non saisi">Non saisi (Quart non renseigné)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {statutDonnees === "Incomplet" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                  <Label className="text-xs font-medium text-destructive">Motif de saisie incomplète</Label>
                  <Controller
                    control={control}
                    name="motif_incomplet"
                    render={({ field }) => (
                      <Input 
                        {...field} 
                        placeholder="Ex: manque de saisie, pas une perte..." 
                        className="border-destructive/50 focus-visible:ring-destructive"
                      />
                    )}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {statutDonnees === "Incomplet" && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Données Incomplètes</AlertTitle>
            <AlertDescription>
              Cette saisie est marquée comme incomplète : {watch("motif_incomplet") || "aucun motif renseigné."}
            </AlertDescription>
          </Alert>
        )}

        {/* 2. Statistiques Production & Tri + Qualité */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Production & Tri – Choix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left">Choix</th>
                    <th className="px-2 py-1 text-right">Total Pièces</th>
                    <th className="px-2 py-1 text-right">Surface (m²)</th>
                    <th className="px-2 py-1 text-right">% du Total</th>
                    <th className="px-2 py-1 text-right">Opérateur (pcs)</th>
                    <th className="px-2 py-1 text-right">Opérateur %</th>
                    <th className="px-2 py-1 text-right">Planar (pcs)</th>
                    <th className="px-2 py-1 text-right">Planar %</th>
                    <th className="px-2 py-1 text-right">Calibre (pcs)</th>
                    <th className="px-2 py-1 text-right">Calibre %</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "1er Choix", field: "choix1" as const },
                    { label: "2ème Choix", field: "choix2" as const },
                    { label: "3ème Choix", field: "choix3" as const },
                  ].map((row) => {
                    const piecesName = `${row.field}_pieces` as const;
                    const surfaceName = `${row.field}_surface_m2` as const;
                    const pieces = watch(piecesName) || 0;
                    const opName = `${row.field}_operateur_pieces` as const;
                    const planarName = `${row.field}_planar_pieces` as const;
                    const calibreName = `${row.field}_calibre_pieces` as const;
                    const opVal = Number(watch(opName)) || 0;
                    const planarVal = Number(watch(planarName)) || 0;
                    const calibreVal = Number(watch(calibreName)) || 0;
                    const pctValue =
                      row.field === "choix1"
                        ? choix1_pct
                        : row.field === "choix2"
                          ? choix2_pct
                          : choix3_pct;
                    return (
                      <tr key={row.field} className="border-t">
                        <td className="px-2 py-1">{row.label}</td>
                        <td className="px-2 py-1 text-right">
                          <Controller
                            control={control}
                            name={piecesName}
                            render={({ field }) => (
                              <Input
                                type="number"
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                className="h-7 text-right"
                              />
                            )}
                          />
                        </td>
                        <td className="px-2 py-1 text-right">
                          {surfaceCAR > 0 ? (surfaceCAR * pieces).toFixed(4) : "—"}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {pctValue.toFixed(2)} %
                        </td>
                        <td className="px-2 py-1 text-right">
                          <Controller
                            control={control}
                            name={opName}
                            render={({ field }) => (
                              <Input
                                type="number"
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                className="h-7 text-right"
                              />
                            )}
                          />
                        </td>
                        <td className="px-2 py-1 text-right">
                          {(
                            row.field === "choix1"
                              ? c1_op_pct
                              : row.field === "choix2"
                                ? c2_op_pct
                                : c3_op_pct
                          ).toFixed(2)} %
                        </td>
                        <td className="px-2 py-1 text-right">
                          <Controller
                            control={control}
                            name={planarName}
                            render={({ field }) => (
                              <Input
                                type="number"
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                className="h-7 text-right"
                              />
                            )}
                          />
                        </td>
                        <td className="px-2 py-1 text-right">
                          {(
                            row.field === "choix1"
                              ? c1_planar_pct
                              : row.field === "choix2"
                                ? c2_planar_pct
                                : c3_planar_pct
                          ).toFixed(2)} %
                        </td>
                        <td className="px-2 py-1 text-right">
                          <Controller
                            control={control}
                            name={calibreName}
                            render={({ field }) => (
                              <Input
                                type="number"
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                className="h-7 text-right"
                              />
                            )}
                          />
                        </td>
                        <td className="px-2 py-1 text-right">
                          {(
                            row.field === "choix1"
                              ? c1_calibre_pct
                              : row.field === "choix2"
                                ? c2_calibre_pct
                                : c3_calibre_pct
                          ).toFixed(2)} %
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/40 font-semibold">
                    <td className="px-2 py-1 text-right">Totaux</td>
                    <td className="px-2 py-1 text-right">{totalPieces.toFixed(0)}</td>
                    <td className="px-2 py-1 text-right">{totalSurface.toFixed(2)}</td>
                    <td className="px-2 py-1 text-right">100 %</td>
                    <td className="px-2 py-1 text-right" colSpan={6}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 4. Comptage Minutes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comptage Minutes – Performance Ligne</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Absence alimentation", field: "minutes_absence_alimentation" },
                { label: "Urgence / Manuelle", field: "minutes_urgence_manuelle" },
                { label: "Machine saturée", field: "minutes_machine_saturee" },
              ].map((m) => (
                <div key={m.field} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{m.label} (min)</Label>
                  <Controller
                    control={control}
                    name={m.field as any}
                    render={({ field }) => (
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="h-8"
                      />
                    )}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 5. Enquêtes Statistiques – Rendement */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Enquêtes Statistiques – Rendement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Vitesse moyenne (pièces / min)
                </Label>
                <Controller
                  control={control}
                  name="vitesse_moyenne_pieces_min"
                  render={({ field }) => (
                    <Input
                      type="number"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Machine allumée (min)
                </Label>
                <Controller
                  control={control}
                  name="machine_allumee"
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Machine en marche (min)
                </Label>
                <Controller
                  control={control}
                  name="machine_en_marche"
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Production réelle (m²)
                </Label>
                <Controller
                  control={control}
                  name="production_reelle_m2"
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={totalSurface > 0 ? totalSurface.toFixed(2) : "0"}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          {editingEntry && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingEntry(null);
                reset();
              }}
            >
              Annuler l'édition
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || !selectedProduction}>
            {editingEntry ? "Mettre à jour" : "Enregistrer les statistiques"}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Statistiques enregistrées</CardTitle>
          <div className="flex gap-2">
            <JsonImport onImport={async (data) => {
              let successCount = 0;
              let errorCount = 0;
              for (const item of data) {
                const formatHour = (h: any) => {
                  if (typeof h === "number") return `${Math.floor(h).toString().padStart(2, '0')}:00`;
                  if (typeof h === "string" && !h.includes(':') && h.trim() !== "") return `${h.padStart(2, '0')}:00`;
                  return h;
                };

                // Determine production_id
                let prodId = item.production_id || item.Production_id || item.id_production;
                
                // If the provided ID doesn't exist in our actual database (e.g. LLM generated "2026-05-10_matin"), we ignore it.
                if (prodId && !prodEntries.some(p => p.id === prodId)) {
                  prodId = null;
                }
                
                if (!prodId) {
                  const date = item.date || item.Date || item.production_date || item.journal_date;
                  const heure_debut = formatHour(item.heure_debut || item.Heure_Debut);
                  const heure_fin = formatHour(item.heure_fin || item.Heure_Fin);
                  
                  // Try to find by exact matching hour (e.g. "06:00" and "14:00")
                  if (date && heure_debut && heure_fin) {
                    const match = prodEntries.find(p => p.Date === date && p.Heure_Debut === heure_debut && p.Heure_Fin === heure_fin);
                    if (match) prodId = match.id;
                  }

                  // Fallback: Use horaire if hours don't perfectly match
                  if (!prodId) {
                    let horaire = item.horaire || item.Horaire || "";
                    let altHoraire = horaire;
                    
                    const horLower = horaire.toLowerCase().trim();
                    if (horLower === "matin" || horLower === "6 h-14 h" || horLower === "6 h - 14 h") { 
                      horaire = "Matin"; 
                      altHoraire = "6 h-14 h"; 
                    } else if (horLower === "soir" || horLower === "14 h-22 h" || horLower === "14 h - 22 h") { 
                      horaire = "Soir"; 
                      altHoraire = "14 h-22 h"; 
                    } else if (horLower === "nuit" || horLower === "22 h-6 h" || horLower === "22 h - 6 h") { 
                      horaire = "Nuit"; 
                      altHoraire = "22 h-6 h"; 
                    }

                    if (date) {
                      const match = prodEntries.find(p => p.Date === date && (p.Horaire === horaire || p.Horaire === altHoraire || p.Horaire?.toLowerCase() === horLower));
                      if (match) prodId = match.id;
                    }
                  }
                }

                if (!prodId) {
                  console.error("Aucune production trouvée pour:", item);
                  errorCount++;
                  continue;
                }

                const mappedItem = {
                  production_id: prodId,
                  production_date: item.production_date || item.date || item.Date || "",

                  choix1_pieces: Number(item.choix1_pieces) || 0,
                  choix1_surface_m2: Number(item.choix1_surface_m2) || 0,
                  choix1_pourcentage: Number(item.choix1_pourcentage) || 0,
                  choix2_pieces: Number(item.choix2_pieces) || 0,
                  choix2_surface_m2: Number(item.choix2_surface_m2) || 0,
                  choix2_pourcentage: Number(item.choix2_pourcentage) || 0,
                  choix3_pieces: Number(item.choix3_pieces) || 0,
                  choix3_surface_m2: Number(item.choix3_surface_m2) || 0,
                  choix3_pourcentage: Number(item.choix3_pourcentage) || 0,
                  total_pieces: Number(item.total_pieces) || 0,
                  total_surface_m2: Number(item.total_surface_m2) || 0,

                  choix1_operateur_pieces: Number(item.choix1_operateur_pieces) || 0,
                  choix1_operateur_pourcentage: Number(item.choix1_operateur_pourcentage) || 0,
                  choix1_planar_pieces: Number(item.choix1_planar_pieces) || 0,
                  choix1_planar_pourcentage: Number(item.choix1_planar_pourcentage) || 0,
                  choix1_calibre_pieces: Number(item.choix1_calibre_pieces) || 0,
                  choix1_calibre_pourcentage: Number(item.choix1_calibre_pourcentage) || 0,

                  choix2_operateur_pieces: Number(item.choix2_operateur_pieces) || 0,
                  choix2_operateur_pourcentage: Number(item.choix2_operateur_pourcentage) || 0,
                  choix2_planar_pieces: Number(item.choix2_planar_pieces) || 0,
                  choix2_planar_pourcentage: Number(item.choix2_planar_pourcentage) || 0,
                  choix2_calibre_pieces: Number(item.choix2_calibre_pieces) || 0,
                  choix2_calibre_pourcentage: Number(item.choix2_calibre_pourcentage) || 0,

                  choix3_operateur_pieces: Number(item.choix3_operateur_pieces) || 0,
                  choix3_operateur_pourcentage: Number(item.choix3_operateur_pourcentage) || 0,
                  choix3_planar_pieces: Number(item.choix3_planar_pieces) || 0,
                  choix3_planar_pourcentage: Number(item.choix3_planar_pourcentage) || 0,
                  choix3_calibre_pieces: Number(item.choix3_calibre_pieces) || 0,
                  choix3_calibre_pourcentage: Number(item.choix3_calibre_pourcentage) || 0,

                  minutes_absence_alimentation: Number(item.minutes_absence_alimentation) || 0,
                  minutes_urgence_manuelle: Number(item.minutes_urgence_manuelle) || 0,
                  minutes_machine_saturee: Number(item.minutes_machine_saturee) || 0,
                  minutes_total_machine: Number(item.minutes_total_machine) || 0,

                  vitesse_moyenne_pieces_min: Number(item.vitesse_moyenne_pieces_min) || 0,
                  machine_allumee: Number(item.machine_allumee) || 0,
                  machine_en_marche: Number(item.machine_en_marche) || 0,
                  production_reelle_m2: Number(item.production_reelle_m2) || 0,
                  statut_donnees: item.statut_donnees || "Complet",
                  motif_incomplet: item.motif_incomplet || "",
                };

                const res = await addEntry(mappedItem);
                if (res) successCount++;
                else errorCount++;
              }
              if (successCount > 0) toast.success(`${successCount} importations réussies`);
              if (errorCount > 0) toast.error(`${errorCount} importations échouées (vérifiez la production_id)`);
            }} />
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/production/stats-linea/view")}>
              <Eye className="h-4 w-4" /> Aperçu
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <StatsLineaTable
            stats={statsEntries}
            productions={prodEntries}
            onEdit={(entry) => setEditingEntry(entry)}
            onDelete={deleteEntry}
          />
        </CardContent>
      </Card>
    </div>
  );
}
