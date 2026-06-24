import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, LayoutDashboard, PackageSearch, PackageOpen, Hammer } from "lucide-react";
import { toast } from "sonner";
import ProductionForm from "@/components/ProductionForm";
import EmballageForm from "@/components/EmballageForm";
import StatLineaSimpleForm from "@/components/StatLineaSimpleForm";
import CasseForm from "@/components/CasseForm";
import { useProductionStore, type ProductionEntry } from "@/hooks/useProductionStore";
import { useEmballageStore } from "@/hooks/useEmballageStore";
import { useStatsLineaStore } from "@/hooks/useStatsLineaStore";
import { useCasseStore } from "@/hooks/useCasseStore";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import SearchProductionDialog from "@/components/SearchProductionDialog";
import { Search } from "lucide-react";

const STEPS = [
  { id: 0, title: "Journalier", icon: LayoutDashboard },
  { id: 1, title: "Emballage", icon: PackageOpen },
  { id: 2, title: "Stat Linea", icon: PackageSearch },
  { id: 3, title: "Casse", icon: Hammer },
];

export default function SaisieGlobale() {
  const [currentStep, setCurrentStep] = useState(0);
  const [createdJournalier, setCreatedJournalier] = useState<ProductionEntry | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const formContainerRef = useRef<HTMLDivElement>(null);

  const { addEntry: addJournalier, updateEntry: updateJournalier, entries: productionEntries } = useProductionStore();
  const { updateEntry: updateEmballage, entries: emballageEntries } = useEmballageStore();
  const { addEntry: addStatLinea } = useStatsLineaStore();
  const { addEntry: addCasse, updateEntry: updateCasse, entries: casseEntries } = useCasseStore();

  useKeyboardNavigation(formContainerRef);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  const handleJournalierSubmit = async (entry: Omit<ProductionEntry, "id">) => {
    const result = await addJournalier(entry) as any;
    if (result && result.duplicateEntry) {
      if (window.confirm("Cette production a déjà été saisie auparavant.\nVoulez-vous la charger et passer à l'étape suivante pour la modifier ?")) {
        setCreatedJournalier(result.duplicateEntry);
        toast.info("Production existante chargée");
        setCurrentStep(1);
      }
      return;
    }
    if (result) {
      setCreatedJournalier(result);
      toast.success("Production Journalière enregistrée");
      setCurrentStep(1);
    }
  };

  const handleEmballageSubmit = async (entry: any) => {
    const result = await updateEmballage(entry as any);
    if (result) {
      if (createdJournalier) {
        const c1 = entry.choix.find((c: any) => c.Choice_Type === "1er Choix");
        const c2 = entry.choix.find((c: any) => c.Choice_Type === "2ème Choix");
        const c3 = entry.choix.find((c: any) => c.Choice_Type === "3ème Choix");
        
        const updated = await updateJournalier({
          ...createdJournalier,
          Emballage_C1_Palettes: c1?.Nb_Palette || 0,
          Emballage_C1_Reste_m2: c1?.Reste_m2 || 0,
          Emballage_C1_Surface_m2: c1?.Surface_totale_m2 || 0,
          Emballage_C2_Palettes: c2?.Nb_Palette || 0,
          Emballage_C2_Reste_m2: c2?.Reste_m2 || 0,
          Emballage_C2_Surface_m2: c2?.Surface_totale_m2 || 0,
          Emballage_C3_Palettes: c3?.Nb_Palette || 0,
          Emballage_C3_Reste_m2: c3?.Reste_m2 || 0,
          Emballage_C3_Surface_m2: c3?.Surface_totale_m2 || 0,
        });
        if (updated) setCreatedJournalier(updated);
      }
      toast.success("Emballage enregistré");
      setCurrentStep(2);
    }
  };

  const handleStatLineaSubmit = async (entry: any) => {
    // Save to stats_linea for backward compatibility with Dashboards
    const result = await addStatLinea(entry);
    
    if (result) {
      if (createdJournalier) {
        // Also update production_globale with the stats linea fields!
        const updated = await updateJournalier({
          ...createdJournalier,
          Choix1_Pieces: entry.choix1_pieces,
          Choix2_Pieces: entry.choix2_pieces,
          Choix3_Pieces: entry.choix3_pieces,
          Scanner_Choix1_m2: entry.choix1_surface_m2,
          Scanner_Choix2_m2: entry.choix2_surface_m2,
          Scanner_Choix3_m2: entry.choix3_surface_m2,
        });
        if (updated) setCreatedJournalier(updated);
      }
      toast.success("Stat Linea enregistré");
      setCurrentStep(3);
    }
  };

  const handleCasseSubmit = async (entry: any) => {
    const result = await addCasse(entry);
    
    if (result) {
      if (createdJournalier) {
        // Also update production_globale with the casse fields!
        const updated = await updateJournalier({
          ...createdJournalier,
          Casse_Presse_Casse_kg: entry.presse_casse_kg,
          Casse_Sortie_Sechoir_kg: entry.sortie_sechoir_kg,
          Casse_Emaillage_kg: entry.emaillage_kg,
          Casse_Projecta_kg: entry.projecta_kg,
          Casse_Entree_Four_kg: entry.entree_four_kg,
          Casse_Cuite_kg: entry.cuite_kg,
        });
        if (updated) setCreatedJournalier(updated);
      }
      toast.success("Saisie Casse enregistrée avec succès. Cycle terminé !");
      setCreatedJournalier(null);
      setCurrentStep(0);
    }
  };

  const currentEmballageEntry = createdJournalier 
    ? emballageEntries.find(e => e.Linked_Journalier_ID === createdJournalier.id)
    : null;

  const currentCasseEntry = createdJournalier
    ? casseEntries.find(e => 
        e.date === createdJournalier.Date && 
        e.horaire === createdJournalier.Horaire && 
        e.groupe === createdJournalier.Groupe
      )
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12" ref={formContainerRef}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Saisie Globale de Production</h1>
          <p className="text-sm text-muted-foreground">
            Saisissez toutes les données de production en une seule fois et de manière fluide.
          </p>
        </div>
        <Button 
          variant="outline" 
          className="shrink-0 gap-2 font-medium"
          onClick={() => setIsSearchOpen(true)}
        >
          <Search className="h-4 w-4" /> Rechercher une saisie existante
        </Button>
      </div>

      <div className="flex items-center justify-between relative mb-12 mt-8 px-4 md:px-12">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-muted rounded-full overflow-hidden mx-8 md:mx-16 z-0">
           <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
        </div>
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          const Icon = step.icon;
          return (
            <div 
              key={step.id} 
              className="relative z-10 flex flex-col items-center gap-2 cursor-pointer group"
              onClick={() => {
                if (createdJournalier || idx === 0) {
                  setCurrentStep(idx);
                } else {
                  setIsSearchOpen(true);
                }
              }}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-[3px] group-hover:ring-4 ring-primary/20 ${
                isActive ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110' : 
                isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                (createdJournalier ? 'bg-background border-primary/50 text-primary hover:bg-primary/10' : 'bg-background border-muted text-muted-foreground')
              }`}>
                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs md:text-sm font-medium absolute -bottom-8 whitespace-nowrap transition-colors duration-300 ${
                isActive ? 'text-primary font-bold' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <Card className="border-primary/20 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-visible">
          <CardHeader className="bg-muted/30 border-b rounded-t-xl">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
               {STEPS[currentStep]?.title || "Étape"}
               {currentStep > 0 && <span className="text-sm font-normal text-muted-foreground bg-background px-2 py-0.5 rounded-md border">Étape {currentStep + 1} sur {STEPS.length}</span>}
            </CardTitle>
            <CardDescription className="text-sm">
              {currentStep === 0 && "Saisissez les informations de base de la production journalière."}
              {currentStep === 1 && "Vérifiez ou modifiez les choix d'emballage. Ils ont été générés automatiquement à partir de la saisie précédente."}
              {currentStep === 2 && "Saisissez les choix pour les statistiques Linea."}
              {currentStep === 3 && "Saisissez les informations concernant les pertes (casses). C'est la dernière étape !"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {currentStep === 0 && (
              <ProductionForm 
                onSubmit={handleJournalierSubmit} 
                editingEntry={createdJournalier}
                onUpdate={async (entry) => {
                  const result = await updateJournalier(entry);
                  if (result) {
                    setCreatedJournalier(result);
                    toast.success("Modification enregistrée");
                    setCurrentStep(1);
                  }
                }}
              />
            )}
            
            {currentStep === 1 && createdJournalier && (
              <div className="animate-in fade-in duration-300">
                <EmballageForm 
                  journalierEntries={[createdJournalier]} 
                  editingEntry={currentEmballageEntry}
                  onUpdate={handleEmballageSubmit} 
                  onSubmit={handleEmballageSubmit} 
                />
              </div>
            )}
            
            {currentStep === 2 && createdJournalier && (
              <div className="animate-in fade-in duration-300">
                <StatLineaSimpleForm 
                  journalierEntries={[createdJournalier]} 
                  onSubmit={handleStatLineaSubmit} 
                />
              </div>
            )}
            
            {currentStep === 3 && createdJournalier && (
              <div className="animate-in fade-in duration-300">
                <CasseForm 
                  initialData={{
                    date: createdJournalier.Date,
                    horaire: createdJournalier.Horaire,
                    groupe: createdJournalier.Groupe,
                    chef_equipe: createdJournalier.Chef_Equipe
                  }}
                  editingEntry={currentCasseEntry}
                  onSubmit={handleCasseSubmit} 
                  onUpdate={async (entry) => {
                    const result = await updateCasse(entry);
                    if (result) {
                      if (createdJournalier) {
                        const updated = await updateJournalier({
                          ...createdJournalier,
                          Casse_Presse_Casse_kg: entry.presse_casse_kg,
                          Casse_Sortie_Sechoir_kg: entry.sortie_sechoir_kg,
                          Casse_Emaillage_kg: entry.emaillage_kg,
                          Casse_Projecta_kg: entry.projecta_kg,
                          Casse_Entree_Four_kg: entry.entree_four_kg,
                          Casse_Cuite_kg: entry.cuite_kg,
                        });
                        if (updated) setCreatedJournalier(updated);
                      }
                      toast.success("Saisie Casse mise à jour avec succès. Cycle terminé !");
                      setCreatedJournalier(null);
                      setCurrentStep(0);
                    }
                  }}
                />
              </div>
            )}

            {currentStep > 0 && !createdJournalier && (
               <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-4">
                 <Hammer className="w-12 h-12 text-muted-foreground/30" />
                 <p>Aucune production journalière n'a été créée ou sélectionnée.</p>
                 <Button onClick={() => setCurrentStep(0)}>Retour à l'étape 1</Button>
               </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <SearchProductionDialog 
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        entries={productionEntries}
        onSelect={(entry) => {
          setCreatedJournalier(entry);
          toast.success(`Production du ${entry.Date} chargée.`);
          setCurrentStep(0);
        }}
      />
      
      {currentStep > 0 && currentStep < STEPS.length && createdJournalier && (
        <div className="flex justify-between items-center pt-2 animate-in fade-in duration-500">
           <Button variant="ghost" onClick={() => {
              if(confirm("Êtes-vous sûr de vouloir annuler toute la saisie en cours ?")) {
                setCreatedJournalier(null);
                setCurrentStep(0);
              }
           }} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
             Annuler le cycle
           </Button>
           <div className="flex gap-2">
             <Button variant="outline" onClick={() => setCurrentStep(c => Math.max(0, c - 1))}>
               Retour
             </Button>
             <Button 
               variant="outline" 
               onClick={() => {
                 if (currentStep === STEPS.length - 1) {
                   toast.success("Cycle terminé sans saisie de casse !");
                   setCreatedJournalier(null);
                   setCurrentStep(0);
                 } else {
                   setCurrentStep(c => Math.min(STEPS.length - 1, c + 1));
                 }
               }} 
               className="text-muted-foreground hover:text-foreground"
             >
               {currentStep === STEPS.length - 1 ? "Terminer le cycle" : "Passer cette étape"} <ChevronRight className="w-4 h-4 ml-1" />
             </Button>
           </div>
        </div>
      )}
    </div>
  );
}
