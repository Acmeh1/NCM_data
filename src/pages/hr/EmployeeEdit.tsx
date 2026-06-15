import { EmployeeForm } from "@/components/hr/EmployeeForm";
import { useEmployee } from "@/hooks/useEmployees";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmployeeEdit() {
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
        <p className="text-red-500">Erreur lors du chargement de la fiche.</p>
        <Button onClick={() => navigate("/rh/employes")} className="mt-4">Retour à la liste</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/rh/employes/${matricule}`)}>
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Modifier la Fiche</h1>
          <p className="text-sm text-slate-500 mt-1">Édition du dossier technique de {employee.Nom} {employee.Prénom || employee.Prenom}</p>
        </div>
      </div>

      <EmployeeForm initialData={employee} isEditMode={true} />
    </div>
  );
}
