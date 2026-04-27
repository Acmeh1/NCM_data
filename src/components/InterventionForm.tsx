import React, { useState, useMemo } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import configData from '@/data/config_data.json';
import equipementsDataRaw from '@/data/Liste_FINAL_de_codification_des_equipements .json';
import fileDataRaw from '@/data/pdrrrrr.json';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PDRSearchableInput } from './PDRSearchableInput';

// Parse raw equipment data to unique zones
const equipementsData = equipementsDataRaw as any[];
const uniqueZonesMap = new Map();
equipementsData.forEach((e) => {
  if (e.zone && e["code de la zone"]) {
    const id = e["code de la zone"].trim();
    const nom = e.zone.trim();
    if (!uniqueZonesMap.has(id)) {
      uniqueZonesMap.set(id, nom);
    }
  }
});

const zonesList = Array.from(uniqueZonesMap.entries()).map(([id, nom]) => ({ id, nom }));

const pdrList = Array.isArray(fileDataRaw) 
  ? fileDataRaw
      .filter((item: any) => item?.Intitule && item.Intitule !== 'Intitule')
      .map((item: any) => {
        return { 
          Intitule: item.Intitule,
          originalName: item.Intitule,
          ref: item.REF || ''
        };
      })
  : [];

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
  nom_demandeur: z.string().min(1, "Nom du demandeur requis"),
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
    })
  ).min(1, "Au moins un intervenant requis"),
  
  arret_cpmp: z.number().min(0).default(0),
  arret_cpr: z.number().min(0).default(0),
  arret_cle: z.number().min(0).default(0),
  arret_ccu: z.number().min(0).default(0),
  arret_csl: z.number().min(0).default(0),
  total_arret: z.number().min(0).default(0),

  pdr_utilisees: z.array(z.object({ nom: z.string().min(1), quantite: z.number().min(1) })),
  pdr_consommables: z.array(z.object({ nom: z.string().min(1), quantite: z.number().min(1) })),
});

type InterventionFormData = z.infer<typeof interventionSchema>;

interface Props {
  initialData?: any;
  onSuccess?: () => void;
}

export default function InterventionForm({ initialData, onSuccess }: Props) {
  const { toast } = useToast();
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [equipements, setEquipements] = useState<any[]>([]);
  const [numeroExistsWarning, setNumeroExistsWarning] = useState<string | null>(null);
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);

  React.useEffect(() => {
    const fetchNames = async () => {
      try {
        const { data: intervs } = await supabase
          .from('interventions')
          .select('intervenants, nom_demandeur')
          .order('id', { ascending: false })
          .limit(100);
        
        const namesSet = new Set<string>();

        if (intervs) {
          for (const row of intervs) {
            if (row.nom_demandeur && row.nom_demandeur.trim()) {
              namesSet.add(row.nom_demandeur.trim());
            }
            if (Array.isArray(row.intervenants)) {
              row.intervenants.forEach((i: any) => {
                if (i.nom && i.nom.trim()) namesSet.add(i.nom.trim());
              });
            }
          }
        }

        setSuggestedNames(Array.from(namesSet).filter(Boolean).slice(0, 4));
      } catch (err) {
        console.error("Error fetching names for autocomplete:", err);
      }
    };
    fetchNames();
  }, []);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<InterventionFormData>({
    resolver: zodResolver(interventionSchema),
    defaultValues: {
      numero: '',
      date_intervention: '',
      heure_demande: '',
      equipe: undefined,
      demandeur: '',
      nom_demandeur: '',
      urgence: '',
      nature: '',
      type: '',
      zone: '',
      equipement: '',
      description: '',
      heure_debut: '',
      heure_fin: '',
      intervenants: [{ nom: '' }],
      arret_cpmp: 0,
      arret_cpr: 0,
      arret_cle: 0,
      arret_ccu: 0,
      arret_csl: 0,
      total_arret: 0,
      pdr_utilisees: [],
      pdr_consommables: [],
    }
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        numero: initialData.numero || '',
        date_intervention: initialData.date_intervention || '',
        heure_demande: initialData.heure_demande || '',
        equipe: initialData.equipe || undefined,
        demandeur: initialData.demandeur || '',
        nom_demandeur: initialData.nom_demandeur || '',
        urgence: initialData.urgence || '',
        nature: initialData.nature || '',
        type: initialData.type || '',
        zone: initialData.zone_code || '',
        equipement: initialData.equipement_code || '',
        description: initialData.description || '',
        heure_debut: initialData.heure_debut ? new Date(initialData.heure_debut).toISOString().slice(0,16) : '',
        heure_fin: initialData.heure_fin ? new Date(initialData.heure_fin).toISOString().slice(0,16) : '',
        intervenants: initialData.intervenants?.length 
          ? initialData.intervenants.map((i: any) => ({ nom: i.nom })) 
          : [{ nom: '' }],
        arret_cpmp: initialData.arret_cpmp || 0,
        arret_cpr: initialData.arret_cpr || 0,
        arret_cle: initialData.arret_cle || 0,
        arret_ccu: initialData.arret_ccu || 0,
        arret_csl: initialData.arret_csl || 0,
        total_arret: initialData.total_arret || 0,
        pdr_utilisees: initialData.pdr_utilisees || [],
        pdr_consommables: initialData.pdr_consommables || []
      });

      if (initialData.zone_code) {
        setSelectedZone(initialData.zone_code);
        setEquipements(getEquipementsForZone(initialData.zone_code));
      }
    }
  }, [initialData, reset]);

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

  const numeroValue = watch('numero');
  const heureDebut = watch('heure_debut');
  const heureFin = watch('heure_fin');
  
  const arretCpmp = watch('arret_cpmp') || 0;
  const arretCpr = watch('arret_cpr') || 0;
  const arretCle = watch('arret_cle') || 0;
  const arretCcu = watch('arret_ccu') || 0;
  const arretCsl = watch('arret_csl') || 0;
  
  // Update total_arret automatically when sub-components change, 
  // but allow manual override in the field later.
  // Actually the user said "ne sera pas automatique". But usually they still want 
  // a calculation that they can override. Or strictly manual.
  // The request said "total temp arret ne sera pas automatique change la focntionalister".
  // I will stop the auto-calculation in the onSubmit as well.

  React.useEffect(() => {
    const checkNumero = async () => {
      if (!numeroValue || numeroValue.trim() === '') {
        setNumeroExistsWarning(null);
        return;
      }
      
      const { data, error } = await supabase
        .from('interventions')
        .select('id, numero')
        .eq('numero', numeroValue.trim())
        .limit(1);

      if (!error && data && data.length > 0) {
        if (initialData?.id && data[0].id === initialData.id) {
          setNumeroExistsWarning(null);
        } else {
          setNumeroExistsWarning("Ce numéro d'intervention existe déjà.");
        }
      } else {
        setNumeroExistsWarning(null);
      }
    };

    const debounce = setTimeout(checkNumero, 400);
    return () => clearTimeout(debounce);
  }, [numeroValue, initialData]);

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

    const selectedEquip = equipements.find(e => e.code === data.equipement);
    const zoneNom = zonesList.find(z => z.id === data.zone)?.nom || '';

    const insertData = {
      numero: data.numero,
      date_intervention: data.date_intervention,
      heure_demande: data.heure_demande,
      equipe: data.equipe,
      demandeur: data.demandeur,
      nom_demandeur: data.nom_demandeur,
      urgence: data.urgence,
      nature: data.nature,
      type: data.type,
      zone_code: data.zone,
      equipement_code: data.equipement,
      equipement: selectedEquip ? {
        nom: selectedEquip.nom,
        "code d'équipement": selectedEquip.code,
        "code de la zone": data.zone,
        zone: zoneNom
      } : data.equipement,
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
      total_arret: data.total_arret,

      pdr_utilisees: data.pdr_utilisees,
      pdr_consommables: data.pdr_consommables,
    };

    let error;
    if (initialData?.id) {
      const { error: updateError } = await supabase.from('interventions').update(insertData).eq('id', initialData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('interventions').insert(insertData);
      error = insertError;
    }

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      console.error("Supabase insert error:", error);
    } else {
      toast({ title: 'Succès', description: initialData?.id ? 'Intervention modifiée' : 'Demande d\'intervention créée' });
      if (!initialData) {
        reset();
        setSelectedZone('');
        setEquipements([]);
      }
      if (onSuccess) onSuccess();
    }
  };

  const dureeMinutes = heureDebut && heureFin 
    ? Math.floor((new Date(heureFin).getTime() - new Date(heureDebut).getTime()) / (1000 * 60)) 
    : null;

  return (
    <Card>
      <datalist id="suggested-names">
        {suggestedNames.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
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
                render={({ field }) => (
                  <Input 
                    {...field} 
                    placeholder="Ex: INT-2023-001" 
                    className={numeroExistsWarning ? "border-amber-500 focus-visible:ring-amber-500" : ""}
                  />
                )}
              />
              {errors.numero && <p className="text-red-500 text-xs mt-1">{errors.numero.message}</p>}
              {numeroExistsWarning && <p className="text-amber-500 font-semibold text-xs mt-1">{numeroExistsWarning}</p>}
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
              <Label>Nom Demandeur</Label>
              <Controller
                name="nom_demandeur"
                control={control}
                render={({ field }) => <Input {...field} placeholder="Saisir nom" list="suggested-names" autoComplete="off" />}
              />
              {errors.nom_demandeur && <p className="text-red-500 text-sm mt-1">{errors.nom_demandeur.message}</p>}
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
              <Label>Type</Label>
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
              <Label>Nature</Label>
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
                    render={({ field: inputField }) => <Input placeholder="Nom intervenant" {...inputField} list="suggested-names" autoComplete="off" />}
                  />
                  {errors.intervenants?.[index]?.nom && <p className="text-red-500 text-xs mt-1">{errors.intervenants[index]?.nom?.message}</p>}
                </div>
                {intervenantsFields.length > 1 && (
                  <Button type="button" variant="destructive" size="icon" onClick={() => removeIntervenant(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendIntervenant({ nom: '' })} className="mt-2">
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
                <Controller
                  name="total_arret"
                  control={control}
                  render={({ field }) => (
                    <Input type="number" min="0" className="font-bold" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  )}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Pièces de rechange utilisées</Label>
            {pdrUtiliseesFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 mb-2">
                <div className="flex-1">
                  <Controller
                    name={`pdr_utilisees.${index}.nom` as const}
                    control={control}
                    render={({ field: inputField }) => (
                      <PDRSearchableInput 
                        items={pdrList} 
                        value={inputField.value} 
                        onChange={inputField.onChange}
                        onManualEntry={inputField.onChange}
                        placeholder="Rechercher ou saisir un PDR"
                      />
                    )}
                  />
                </div>
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
                <div className="flex-1">
                  <Controller
                    name={`pdr_consommables.${index}.nom` as const}
                    control={control}
                    render={({ field: inputField }) => (
                      <PDRSearchableInput 
                        items={pdrList} 
                        value={inputField.value} 
                        onChange={inputField.onChange}
                        onManualEntry={inputField.onChange}
                        placeholder="Rechercher ou saisir un consommable"
                      />
                    )}
                  />
                </div>
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
          
          <Button type="submit" size="lg" className="w-full">
            {initialData ? "Mettre à jour l'intervention" : "Soumettre l'intervention"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}