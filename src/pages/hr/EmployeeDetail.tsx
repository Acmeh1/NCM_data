import { useEmployee } from "@/hooks/useEmployees";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Edit, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col py-2 border-b border-slate-100 last:border-0">
    <span className="text-xs text-slate-500 mb-1">{label}</span>
    <span className="text-sm font-medium text-slate-900">{value || "—"}</span>
  </div>
);

export default function EmployeeDetail() {
  const { matricule } = useParams();
  const navigate = useNavigate();
  const { data: employee, isLoading, error } = useEmployee(matricule);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Erreur lors du chargement de la fiche ou employé introuvable.</p>
        <Button onClick={() => navigate("/rh/employes")} className="mt-4">Retour à la liste</Button>
      </div>
    );
  }

  const fullName = `${employee.Nom || ""} ${employee.Prénom || employee.Prenom || ""}`.trim();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/rh/employes")}>
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dossier Technique</h1>
        </div>
        <Button onClick={() => navigate(`/rh/employes/${matricule}/modifier`)}>
          <Edit className="w-4 h-4 mr-2" />
          Modifier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* En-tête / Profil Rapide */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-slate-100 shadow-md bg-slate-50 flex items-center justify-center mb-4">
              {employee.Photo_URL ? (
                <img src={employee.Photo_URL} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-slate-300" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{fullName || "Employé sans nom"}</h2>
            <p className="text-sm font-mono text-slate-500 mt-1">{employee.Matricule}</p>
            
            <div className="mt-4 space-y-2">
              {employee.Fonction && <Badge variant="outline" className="text-sm">{employee.Fonction}</Badge>}
              <br />
              {employee.Service && <Badge variant="secondary">{employee.Service}</Badge>}
            </div>
            {employee.Date_départ && (
              <Badge variant="destructive" className="mt-4">Parti le {employee.Date_départ}</Badge>
            )}
          </CardContent>
        </Card>

        {/* Détails */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Identité</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              <DetailRow label="Sexe" value={employee.Sexe === "M" ? "Masculin" : employee.Sexe === "F" ? "Féminin" : employee.Sexe} />
              <DetailRow label="Date de Naissance" value={employee.Date_de_Naissance} />
              <DetailRow label="Âge" value={employee.AGE ? `${employee.AGE} ans` : ""} />
              <DetailRow label="Situation Familiale" value={employee.Situation_F} />
              <DetailRow label="Tranche d'âge" value={employee["Tranche_d'age"]} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Poste & Contrat</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              <DetailRow label="Affectation" value={employee.Affectation} />
              <DetailRow label="Contrat" value={employee.Contrat} />
              <DetailRow label="Date d'Embauche" value={employee.Date_Embauche} />
              <DetailRow label="Ancienneté" value={employee.Anciennete ? `${employee.Anciennete} j/m` : ""} />
              <DetailRow label="Tranche Ancienneté" value={employee["Tranche_Ancienneté"]} />
              <DetailRow label="Rémunération Totale" value={employee["Rémunération Total"]} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Qualifications</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              <DetailRow label="Niveau d'études" value={employee.Niveau} />
              <DetailRow label="Spécialité" value={employee.Spécialité} />
              <DetailRow label="Expérience" value={employee.Experience} />
              <DetailRow label="Formation initiale" value={employee.Formation} />
              <DetailRow label="Formation NCM" value={employee.Formation_NCM} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historique Mouvements</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2">
              <DetailRow label="Cause Recrutement" value={employee["Cause Recrutement"]} />
              <DetailRow label="Raison Création de poste" value={employee["Raison Création poste"]} />
              <DetailRow label="Cause Vacance Poste" value={employee["Cause Vacance Poste"]} />
              <DetailRow label="Cause du Départ" value={employee.Cause_Départ} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
