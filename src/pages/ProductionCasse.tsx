import { useState, useMemo } from "react";
import { useProductionStore } from "@/hooks/useProductionStore";
import { useCasseStore, type CasseEntry } from "@/hooks/useCasseStore";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hammer, Trash2, Pencil, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { JsonImport } from "@/components/JsonImport";

export default function ProductionCasse() {
  const { entries: prodEntries, isLoaded: prodLoaded } = useProductionStore();
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useCasseStore();
  const { productionEdit } = usePermissions();

  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [editingEntry, setEditingEntry] = useState<CasseEntry | null>(null);

  const [form, setForm] = useState({
    press_kg: "",
    sortie_sechoir_kg: "",
    emaillage_kg: "",
    projecta_kg: "",
    entree_four_kg: "",
    casse_cuite_kg: "",
  });

  // Get unique shifts for the selected date that ARE NOT ALREADY RECORDED
  const availableShifts = useMemo(() => {
    const shifts = prodEntries.filter(e => e.Date === dateFilter);
    // Group by Date + Horaire + Groupe to avoid duplicates if multiple models were used in one shift
    const uniqueMap = new Map<string, typeof shifts[0]>();
    shifts.forEach(s => {
      const key = `${s.Horaire}||${s.Groupe}`;
      
      // Check if this shift already has a Casse entry
      const alreadyHasCasse = entries.some(ce => 
        ce.date === s.Date && ce.horaire === s.Horaire && ce.groupe === s.Groupe
      );

      if (!uniqueMap.has(key) && !alreadyHasCasse) {
        uniqueMap.set(key, s);
      }
    });
    return Array.from(uniqueMap.values());
  }, [prodEntries, dateFilter, entries]);

  const selectedShift = useMemo(() => {
    return availableShifts.find(s => s.id === selectedShiftId);
  }, [availableShifts, selectedShiftId]);

  const resetForm = () => {
    setForm({
      press_kg: "",
      sortie_sechoir_kg: "",
      emaillage_kg: "",
      projecta_kg: "",
      entree_four_kg: "",
      casse_cuite_kg: "",
    });
    setSelectedShiftId("");
    setEditingEntry(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift && !editingEntry) {
      toast.error("Veuillez sélectionner un horaire/quart");
      return;
    }

    const payload = {
      date: editingEntry ? editingEntry.date : selectedShift!.Date,
      horaire: editingEntry ? editingEntry.horaire : selectedShift!.Horaire,
      groupe: editingEntry ? editingEntry.groupe : selectedShift!.Groupe,
      chef_equipe: editingEntry ? editingEntry.chef_equipe : selectedShift!.Chef_Equipe,
      press_kg: Number(form.press_kg) || 0,
      sortie_sechoir_kg: Number(form.sortie_sechoir_kg) || 0,
      emaillage_kg: Number(form.emaillage_kg) || 0,
      projecta_kg: Number(form.projecta_kg) || 0,
      entree_four_kg: Number(form.entree_four_kg) || 0,
      casse_cuite_kg: Number(form.casse_cuite_kg) || 0,
    };

    if (editingEntry) {
      await updateEntry({ ...editingEntry, ...payload });
    } else {
      await addEntry(payload);
    }
    resetForm();
  };

  const handleEdit = (entry: CasseEntry) => {
    setEditingEntry(entry);
    setForm({
      press_kg: String(entry.press_kg),
      sortie_sechoir_kg: String(entry.sortie_sechoir_kg),
      emaillage_kg: String(entry.emaillage_kg),
      projecta_kg: String(entry.projecta_kg),
      entree_four_kg: String(entry.entree_four_kg),
      casse_cuite_kg: String(entry.casse_cuite_kg),
    });
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Hammer className="h-6 w-6 text-primary" />
          Suivi des Casses Céramiques
        </h1>
        <p className="text-sm text-muted-foreground">Enregistrement des pertes de production par étape (kg)</p>
      </div>

      {productionEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingEntry ? "Modifier la casse" : "Nouvelle saisie de casse"}
            </CardTitle>
            <CardDescription>
              Sélectionnez d'abord le quart de travail pour charger les informations de l'équipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!editingEntry ? (
                  <>
                    <div className="space-y-2">
                      <Label>Date de Production</Label>
                      <Input 
                        type="date" 
                        value={dateFilter} 
                        onChange={(e) => {
                          setDateFilter(e.target.value);
                          setSelectedShiftId("");
                        }} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sélectionner Horaire / Quart</Label>
                      <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                        <SelectTrigger>
                          <SelectValue placeholder={availableShifts.length > 0 ? "Choisir un horaire..." : "Aucune production ce jour"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableShifts.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.Horaire} — {s.Groupe} ({s.Chef_Equipe})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 bg-muted p-3 rounded-md flex justify-between items-center text-sm">
                    <span>
                      Modifiant : <strong>{editingEntry.date}</strong> | Quart <strong>{editingEntry.horaire}</strong> | Groupe <strong>{editingEntry.groupe}</strong>
                    </span>
                    <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>

              {(selectedShift || editingEntry) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-300">
                  {[
                    { id: "press_kg", label: "Casse Press (kg)" },
                    { id: "sortie_sechoir_kg", label: "Sortie Séchoir (kg)" },
                    { id: "emaillage_kg", label: "Emaillage (kg)" },
                    { id: "projecta_kg", label: "Projecta (kg)" },
                    { id: "entree_four_kg", label: "Entrée Four (kg)" },
                    { id: "casse_cuite_kg", label: "Casse Cuite (kg)" },
                  ].map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{field.label}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={(form as any)[field.id]}
                        onChange={(e) => setForm(prev => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder="0.00"
                        className="font-mono"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                {editingEntry && (
                  <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
                )}
                <Button type="submit" disabled={!selectedShift && !editingEntry} className="gap-2">
                  {editingEntry ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingEntry ? "Mettre à jour" : "Enregistrer la casse"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base text-destructive flex items-center gap-2 m-0">
            Historique des Pertes
          </CardTitle>
          <div className="flex items-center">
            <JsonImport onImport={async (data) => {
              for (const item of data) {
                await addEntry(item);
              }
            }} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date / Quart</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead className="text-right">Press</TableHead>
                  <TableHead className="text-right">Séchoir</TableHead>
                  <TableHead className="text-right">Emaill.</TableHead>
                  <TableHead className="text-right">Proj.</TableHead>
                  <TableHead className="text-right">E. Four</TableHead>
                  <TableHead className="text-right font-bold">Total (kg)</TableHead>
                  <TableHead className="text-right">C. Cuite</TableHead>
                  {productionEdit && <TableHead className="w-[100px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Aucune donnée enregistrée
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((e) => (
                    <TableRow key={e.id} className="group hover:bg-muted/30">
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="text-sm">{e.date}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">{e.horaire}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">G{e.groupe}</div>
                        <div className="text-[10px] text-muted-foreground whitespace-nowrap">{e.chef_equipe}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{e.press_kg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{e.sortie_sechoir_kg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{e.emaillage_kg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{e.projecta_kg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{e.entree_four_kg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold bg-muted/20">
                        {(e.press_kg + e.sortie_sechoir_kg + e.emaillage_kg + e.projecta_kg + e.entree_four_kg + e.casse_cuite_kg).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-destructive">{e.casse_cuite_kg.toFixed(2)}</TableCell>
                      {productionEdit && (
                        <TableCell>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(e)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteEntry(e.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
