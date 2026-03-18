import React, { useState, useMemo } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import configData from '@/data/config_data.json';
import equipementsDataRaw from '@/data/Liste_FINAL_de_codification_des_equipements .json';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Parse raw equipment data to unique zones
const equipementsData = equipementsDataRaw as any[];
const zonesList = Array.from(
  new Set(
    equipementsData
      .filter((e) => e.zone && e["code de la zone"])
      .map((e) => JSON.stringify({ id: e["code de la zone"], nom: e.zone }))
  )
).map((s) => JSON.parse(s));

const getEquipementsForZone = (zoneId: string) => {
  return equipementsData
    .filter((e) => e["code de la zone"] === zoneId && e["code d'équipement"])
    .map((e) => ({
      code: e["code d'équipement"],
      nom: e.Equipements,
    }));
};

const EQUIPES = ["A", "B", "C", "D"];

const interventionSchema = z.object({
  numero: z.string().min(1, "N° requis"),
  date_intervention: z.string().min(1, "Date requise"),
  heure_demande: z.string().min(1, "Heure requise"),
  equipe: z.enum(["A", "B", "C", "D"], { required_error: "Équipe requise" }),
  
  demandeur: z.string().min(1, "Demandeur requis"),
  visa_demandeur: z.string().min(1, "Visa demandeur requis"),
  urgence: z.string().min(1, "Urgence requise"),
  nature: z.string().min(1, "Nature requise"),
  type: z.string().min(1, "Type requis"),
  
  zone: z.string().min(1, "Zone requise"),
  equipement: z.string().min(1, "Équipement requis"),
  
  description: z.string().optional(),
  heure_debut: z.string().min(1, "Heure de début requise"),
  heure_fin: z.string().optional(),
  
  intervenants: z.array(
    z.object({
      nom: z.string().min(1, "Nom requis"),
      visa: z.string().min(1, "Visa requis"),
    })
  ).min(1, "Au moins un intervenant requis"),
  
  arret_cpmp: z.number().min(0).default(0),
  arret_cpr: z.number().min(0).default(0),
  arret_cle: z.number().min(0).default(0),
  arret_ccu: z.number().min(0).default(0),
  arret_csl: z.number().min(0).default(0),

  pdr_utilisees: z.array(z.object({ nom: z.string().min(1), quantite: z.number().min(1) })),
  pdr_consommables: z.array(z.object({ nom: z.string().min(1), quantite: z.number().min(1) })),
});

type InterventionFormData = z.infer<typeof interventionSchema>;

export default function InterventionForm() {
  const { toast } = useToast();
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [equipements, setEquipements] = useState<any[]>([]);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<InterventionFormData>({
    resolver: zodResolver(interventionSchema),
    defaultValues: {
      numero: '',
      date_intervention: '',
      heure_demande: '',
      equipe: undefined,
      demandeur: '',
      visa_demandeur: '',
      urgence: '',
      nature: '',
      type: '',
      zone: '',
      equipement: '',
      description: '',
      heure_debut: '',
      heure_fin: '',
      intervenants: [{ nom: '', visa: '' }],
      arret_cpmp: 0,
      arret_cpr: 0,
      arret_cle: 0,
      arret_ccu: 0,
      arret_csl: 0,
      pdr_utilisees: [],
      pdr_consommables: [],
    }
  });

  const { fields: intervenantsFields, append: appendIntervenant, remove: removeIntervenant } = useFieldArray({
    control,
    name: 'intervenants'
  });

  const { fields: pdrUtiliseesFields, append: appendPdrUtilisees, remove: removePdrUtilisees } = useFieldArray({
    control,
    name: 'pdr_utilisees'
  });

  const { fields: pdrConsommablesFields, append: appendPdrConsommables, remove: removePdrConsommables } = useFieldArray({
    control,
    name: 'pdr_consommables'
  });

  const heureDebut = watch('heure_debut');
  const heureFin = watch('heure_fin');
  
  const arretCpmp = watch('arret_cpmp') || 0;
  const arretCpr = watch('arret_cpr') || 0;
  const arretCle = watch('arret_cle') || 0;
  const arretCcu = watch('arret_ccu') || 0;
  const arretCsl = watch('arret_csl') || 0;
  const totalArret = arretCpmp + arretCpr + arretCle + arretCcu + arretCsl;

  const handleZoneChange = (zoneId: string) => {
    setSelectedZone(zoneId);
    setEquipements(getEquipementsForZone(zoneId));
    setValue('equipement', '');
  };

  const addPdr = (type: 'utilisees' | 'consommables') => {
    if (type === 'utilisees') {
      appendPdrUtilisees({ nom: '', quantite: 1 });
    } else {
      appendPdrConsommables({ nom: '', quantite: 1 });
    }
  };

  const removePdr = (type: 'utilisees' | 'consommables', index: number) => {
    if (type === 'utilisees') {
      removePdrUtilisees(index);
    } else {
      removePdrConsommables(index);
    }
  };

  const onSubmit = async (data: InterventionFormData) => {
    const duree = data.heure_debut && data.heure_fin 
      ? Math.floor((new Date(data.heure_fin).getTime() - new Date(data.heure_debut).getTime()) / (1000 * 60)) 
      : null;

    const insertData = {
      numero: data.numero,
      date_intervention: data.date_intervention,
      heure_demande: data.heure_demande,
      equipe: data.equipe,
      demandeur: data.demandeur,
      visa_demandeur: data.visa_demandeur,
      urgence: data.urgence,
      nature: data.nature,
      type: data.type,
      zone_code: data.zone,
      equipement_code: data.equipement,
      description: data.description,
      heure_debut: data.heure_debut,
      heure_fin: data.heure_fin,
      duree_intervention_minutes: duree,
      
      intervenants: data.intervenants,
      arret_cpmp: data.arret_cpmp,
      arret_cpr: data.arret_cpr,
      arret_cle: data.arret_cle,
      arret_ccu: data.arret_ccu,
      arret_csl: data.arret_csl,
      total_arret: totalArret,

      pdr_utilisees: data.pdr_utilisees,
      pdr_consommables: data.pdr_consommables,
    };

    const { error } = await supabase.from('interventions').insert(insertData);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      console.error("Supabase insert error:", error);
    } else {
      toast({ title: 'Succès', description: 'Demande d\'intervention créée' });
      reset();
      setSelectedZone('');
      setEquipements([]);
    }
  };

  const dureeMinutes = heureDebut && heureFin 
    ? Math.floor((new Date(heureFin).getTime() - new Date(heureDebut).getTime()) / (1000 * 60)) 
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demande d'Intervention</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-md border">
            <div>
              <Label>N° Intervention</Label>
              <Controller
                name="numero"
                control={control}
                render={({ field }) => <Input {...field} placeholder="Ex: INT-2023-001" />}
              />
              {errors.numero && <p className="text-red-500 text-xs mt-1">{errors.numero.message}</p>}
            </div>
            <div>
              <Label>Date</Label>
              <Controller
                name="date_intervention"
                control={control}
                render={({ field }) => <Input type="date" {...field} />}
              />
              {errors.date_intervention && <p className="text-red-500 text-xs mt-1">{errors.date_intervention.message}</p>}
            </div>
            <div>
              <Label>Heure de demande</Label>
              <Controller
                name="heure_demande"
                control={control}
                render={({ field }) => <Input type="time" {...field} />}
              />
              {errors.heure_demande && <p className="text-red-500 text-xs mt-1">{errors.heure_demande.message}</p>}
            </div>
            <div>
              <Label>Équipe</Label>
              <Controller
                name="equipe"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {EQUIPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.equipe && <p className="text-red-500 text-xs mt-1">{errors.equipe.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Demandeur</Label>
              <Controller
                name="demandeur"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner demandeur" />
                    </SelectTrigger>
                    <SelectContent>
                      {configData.roles_demandeurs.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.demandeur && <p className="text-red-500 text-sm mt-1">{errors.demandeur.message}</p>}
            </div>
            <div>
              <Label>Visa Demandeur</Label>
              <Controller
                name="visa_demandeur"
                control={control}
                render={({ field }) => <Input {...field} placeholder="Saisir visa" />}
              />
              {errors.visa_demandeur && <p className="text-red-500 text-sm mt-1">{errors.visa_demandeur.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Urgence</Label>
              <Controller
                name="urgence"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner urgence" />
                    </SelectTrigger>
                    <SelectContent>
                      {configData.urgences.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.urgence && <p className="text-red-500 text-sm mt-1">{errors.urgence.message}</p>}
            </div>
            <div>
              <Label>Nature</Label>
              <Controller
                name="nature"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner nature" />
                    </SelectTrigger>
                    <SelectContent>
                      {configData.natures_intervention.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.nature && <p className="text-red-500 text-sm mt-1">{errors.nature.message}</p>}
            </div>
            <div>
              <Label>Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner type" />
                    </SelectTrigger>
                    <SelectContent>
                      {configData.types_intervention.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <Label>Zone</Label>
              <Controller
                name="zone"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(value) => { field.onChange(value); handleZoneChange(value); }} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zonesList.map(z => (
                        <SelectItem key={z.id} value={z.id}>{z.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.zone && <p className="text-red-500 text-sm mt-1">{errors.zone.message}</p>}
            </div>
            <div>
              <Label>Équipement</Label>
              <Controller
                name="equipement"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedZone || equipements.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner équipement" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipements.map(e => (
                        <SelectItem key={e.code} value={e.code}>{e.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.equipement && <p className="text-red-500 text-sm mt-1">{errors.equipement.message}</p>}
            </div>
            <div>
              <Label>Code d'Équipement</Label>
              <Input value={watch('equipement') || ''} readOnly className="bg-muted" placeholder="Code (auto)" />
            </div>
          </div>
          
          <div>
            <Label>Description</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <Textarea {...field} placeholder="Description de l'intervention" />}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Heure de début</Label>
              <Controller
                name="heure_debut"
                control={control}
                render={({ field }) => <Input type="datetime-local" {...field} />}
              />
              {errors.heure_debut && <p className="text-red-500 text-sm mt-1">{errors.heure_debut.message}</p>}
            </div>
            <div>
              <Label>Heure de fin</Label>
              <Controller
                name="heure_fin"
                control={control}
                render={({ field }) => <Input type="datetime-local" {...field} />}
              />
            </div>
            <div>
              <Label>Durée brute (minutes)</Label>
              <Input value={dureeMinutes !== null ? dureeMinutes : ''} readOnly className="bg-muted" />
            </div>
          </div>

          <div className="border p-4 rounded-md">
            <h3 className="font-semibold mb-3">Intervenants et Visas</h3>
            {intervenantsFields.map((field, index) => (
              <div key={field.id} className="flex gap-4 mb-2">
                <div className="flex-1">
                  <Controller
                    name={`intervenants.${index}.nom`}
                    control={control}
                    render={({ field: inputField }) => <Input placeholder="Nom intervenant" {...inputField} />}
                  />
                  {errors.intervenants?.[index]?.nom && <p className="text-red-500 text-xs mt-1">{errors.intervenants[index]?.nom?.message}</p>}
                </div>
                <div className="flex-1">
                  <Controller
                    name={`intervenants.${index}.visa`}
                    control={control}
                    render={({ field: inputField }) => <Input placeholder="Visa / Signature" {...inputField} />}
                  />
                  {errors.intervenants?.[index]?.visa && <p className="text-red-500 text-xs mt-1">{errors.intervenants[index]?.visa?.message}</p>}
                </div>
                {intervenantsFields.length > 1 && (
                  <Button type="button" variant="destructive" size="icon" onClick={() => removeIntervenant(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendIntervenant({ nom: '', visa: '' })} className="mt-2">
              <Plus className="h-4 w-4 mr-2" /> Ajouter un intervenant
            </Button>
            {errors.intervenants && !Array.isArray(errors.intervenants) && <p className="text-red-500 text-sm mt-1">{errors.intervenants.message}</p>}
          </div>

          <div className="border p-4 rounded-md">
            <h3 className="font-semibold mb-3">Temps d'arrêt par zone (minutes)</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <Label className="text-xs">Prép. Mat. Prem. (CPMP)</Label>
                <Controller
                  name="arret_cpmp"
                  control={control}
                  render={({ field }) => (
                    <Input type="number" min="0" value={field.value} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  )}
                />
              </div>
              <div>
                <Label className="text-xs">Presse (CPR)</Label>
                <Controller
                  name="arret_cpr"
                  control={control}
                  render={({ field }) => (
                    <Input type="number" min="0" value={field.value} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  )}
                />
              </div>
              <div>
                <Label className="text-xs">Ligne Émail. (CLE)</Label>
                <Controller
                  name="arret_cle"
                  control={control}
                  render={({ field }) => (
                    <Input type="number" min="0" value={field.value} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  )}
                />
              </div>
              <div>
                <Label className="text-xs">Cuisson (CCU)</Label>
                <Controller
                  name="arret_ccu"
                  control={control}
                  render={({ field }) => (
                    <Input type="number" min="0" value={field.value} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  )}
                />
              </div>
              <div>
                <Label className="text-xs">Sélection (CSL)</Label>
                <Controller
                  name="arret_csl"
                  control={control}
                  render={({ field }) => (
                    <Input type="number" min="0" value={field.value} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  )}
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-primary">Total Temps Arrêt</Label>
                <Input className="bg-muted font-bold" value={totalArret} readOnly />
              </div>
            </div>
          </div>

          <div>
            <Label>Pièces de rechange utilisées</Label>
            {pdrUtiliseesFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 mb-2">
                <Controller
                  name={`pdr_utilisees.${index}.nom` as const}
                  control={control}
                  render={({ field: inputField }) => (
                    <Input placeholder="Nom" {...inputField} />
                  )}
                />
                <Controller
                  name={`pdr_utilisees.${index}.quantite` as const}
                  control={control}
                  render={({ field: inputField }) => (
                    <Input type="number" placeholder="Quantité" {...inputField} onChange={(e) => inputField.onChange(parseInt(e.target.value) || 1)} />
                  )}
                />
                <Button type="button" variant="destructive" size="sm" onClick={() => removePdr('utilisees', index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addPdr('utilisees')}><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
          </div>
          <div>
            <Label>Pièces de rechange consommables</Label>
            {pdrConsommablesFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 mb-2">
                <Controller
                  name={`pdr_consommables.${index}.nom` as const}
                  control={control}
                  render={({ field: inputField }) => (
                    <Input placeholder="Nom" {...inputField} />
                  )}
                />
                <Controller
                  name={`pdr_consommables.${index}.quantite` as const}
                  control={control}
                  render={({ field: inputField }) => (
                    <Input type="number" placeholder="Quantité" {...inputField} onChange={(e) => inputField.onChange(parseInt(e.target.value) || 1)} />
                  )}
                />
                <Button type="button" variant="destructive" size="sm" onClick={() => removePdr('consommables', index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addPdr('consommables')}><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
          </div>
          
          <Button type="submit" size="lg" className="w-full">Soumettre l'intervention</Button>
        </form>
      </CardContent>
    </Card>
  );
}