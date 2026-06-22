import { useState, useEffect } from "react";
import { EmployeeData, useSaveEmployee } from "@/hooks/useEmployees";
import { EmployeePhoto } from "./EmployeePhoto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmployeeFormProps {
  initialData?: EmployeeData;
  isEditMode?: boolean;
}

const emptyEmployee: EmployeeData = {
  Matricule: "",
  Nom: "",
  Prénom: "",
  Date_de_Naissance: "",
  AGE: null,
  "Tranche_d'age": "",
  Situation_F: "",
  Niveau: "",
  Spécialité: "",
  Experience: "",
  Formation: "",
  Formation_NCM: "",
  Sexe: "",
  Fonction: "",
  Service: "",
  Contrat: "",
  Date_Embauche: "",
  Anciennete: null,
  "Tranche_Ancienneté": "",
  "Cause Recrutement": "",
  "Raison Création poste": "",
  "Cause Vacance Poste": "",
  Date_départ: "",
  "Cause_Départ": "",
  "Rémunération Total": "",
  Affectation: "",
  Photo_URL: null,
};

export function EmployeeForm({ initialData, isEditMode = false }: EmployeeFormProps) {
  const [formData, setFormData] = useState<EmployeeData>(initialData || emptyEmployee);
  const saveMutation = useSaveEmployee();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (field: keyof EmployeeData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatDateForInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    // If already yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    // If dd/mm/yyyy
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // parts: dd, mm, yyyy
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    
    // If dd-mm-yyyy
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 2) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    return dateStr;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Matricule) return;

    // Convert strings back to numbers if needed
    const payload = { ...formData };
    if (payload.AGE === "" as any) payload.AGE = null;
    if (payload.Anciennete === "" as any) payload.Anciennete = null;

    saveMutation.mutate(payload, {
      onSuccess: (data) => {
        navigate(`/rh/employes/${data.Matricule}`);
      }
    });
  };

  const isSaving = saveMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Photo Section */}
        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle className="text-lg">Photo de profil</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <EmployeePhoto 
              matricule={formData.Matricule} 
              photoUrl={formData.Photo_URL} 
              onPhotoUploaded={(url) => handleChange("Photo_URL", url)}
              readOnly={isEditMode && false} // Or completely remove readOnly if you never want it completely read-only
            />
          </CardContent>
        </Card>

        {/* Identity Section */}
        <Card className="w-full md:w-2/3">
          <CardHeader>
            <CardTitle className="text-lg">Identité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="Matricule">Matricule <span className="text-red-500">*</span></Label>
                <Input 
                  id="Matricule" 
                  value={formData.Matricule} 
                  onChange={(e) => handleChange("Matricule", e.target.value)} 
                  disabled={isEditMode}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="Sexe">Sexe</Label>
                <Select value={formData.Sexe || ""} onValueChange={(val) => handleChange("Sexe", val)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Féminin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="Nom">Nom</Label>
                <Input id="Nom" value={formData.Nom || ""} onChange={(e) => handleChange("Nom", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="Prénom">Prénom</Label>
                <Input id="Prénom" value={formData.Prénom || ""} onChange={(e) => handleChange("Prénom", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="Date_de_Naissance">Date de Naissance</Label>
                <Input id="Date_de_Naissance" type="date" value={formatDateForInput(formData.Date_de_Naissance)} onChange={(e) => handleChange("Date_de_Naissance", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="AGE">Âge</Label>
                <Input id="AGE" type="number" value={formData.AGE || ""} onChange={(e) => handleChange("AGE", parseInt(e.target.value))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="Situation_F">Situation Familiale</Label>
                <Input id="Situation_F" value={formData.Situation_F || ""} onChange={(e) => handleChange("Situation_F", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="Tranche_d'age">Tranche d'âge</Label>
                <Input id="Tranche_d'age" value={formData["Tranche_d'age"] || ""} onChange={(e) => handleChange("Tranche_d'age", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Poste & Contrat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Poste & Contrat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="Service">Service</Label>
              <Input id="Service" value={formData.Service || ""} onChange={(e) => handleChange("Service", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Fonction">Fonction</Label>
              <Input id="Fonction" value={formData.Fonction || ""} onChange={(e) => handleChange("Fonction", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Affectation">Affectation</Label>
              <Input id="Affectation" value={formData.Affectation || ""} onChange={(e) => handleChange("Affectation", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="Contrat">Contrat</Label>
              <Input id="Contrat" value={formData.Contrat || ""} onChange={(e) => handleChange("Contrat", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Date_Embauche">Date d'Embauche</Label>
              <Input id="Date_Embauche" type="date" value={formatDateForInput(formData.Date_Embauche)} onChange={(e) => handleChange("Date_Embauche", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Anciennete">Ancienneté (jours/mois)</Label>
              <Input id="Anciennete" type="number" value={formData.Anciennete || ""} onChange={(e) => handleChange("Anciennete", parseInt(e.target.value))} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="Tranche_Ancienneté">Tranche Ancienneté</Label>
              <Input id="Tranche_Ancienneté" value={formData["Tranche_Ancienneté"] || ""} onChange={(e) => handleChange("Tranche_Ancienneté", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Rémunération Total">Rémunération Totale</Label>
              <Input id="Rémunération Total" value={formData["Rémunération Total"] || ""} onChange={(e) => handleChange("Rémunération Total", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Qualifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Qualifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="Niveau">Niveau d'études</Label>
              <Input id="Niveau" value={formData.Niveau || ""} onChange={(e) => handleChange("Niveau", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Spécialité">Spécialité</Label>
              <Input id="Spécialité" value={formData.Spécialité || ""} onChange={(e) => handleChange("Spécialité", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Experience">Expérience</Label>
              <Input id="Experience" value={formData.Experience || ""} onChange={(e) => handleChange("Experience", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Formation">Formation initiale</Label>
              <Input id="Formation" value={formData.Formation || ""} onChange={(e) => handleChange("Formation", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Formation_NCM">Formation NCM</Label>
              <Input id="Formation_NCM" value={formData.Formation_NCM || ""} onChange={(e) => handleChange("Formation_NCM", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique & Départ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique Recrutement & Départ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="Cause Recrutement">Cause du Recrutement</Label>
              <Input id="Cause Recrutement" value={formData["Cause Recrutement"] || ""} onChange={(e) => handleChange("Cause Recrutement", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Raison Création poste">Raison Création de poste</Label>
              <Input id="Raison Création poste" value={formData["Raison Création poste"] || ""} onChange={(e) => handleChange("Raison Création poste", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Cause Vacance Poste">Cause Vacance de Poste</Label>
              <Input id="Cause Vacance Poste" value={formData["Cause Vacance Poste"] || ""} onChange={(e) => handleChange("Cause Vacance Poste", e.target.value)} />
            </div>
            <div className="space-y-2"></div>
            
            <div className="space-y-2">
              <Label htmlFor="Date_départ">Date de Départ</Label>
              <Input id="Date_départ" type="date" value={formatDateForInput(formData.Date_départ || (formData as any).Date_depart)} onChange={(e) => handleChange("Date_départ", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Cause_Départ">Cause du Départ</Label>
              <Input id="Cause_Départ" value={formData.Cause_Départ || ""} onChange={(e) => handleChange("Cause_Départ", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 sticky bottom-6 z-10 bg-white/80 backdrop-blur-sm p-4 border rounded-lg shadow-sm">
        <Button variant="outline" type="button" onClick={() => navigate(-1)} disabled={isSaving}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
