import { EmployeeForm } from "@/components/hr/EmployeeForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function EmployeeCreate() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/rh/employes")}>
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nouvelle Fiche Employé</h1>
          <p className="text-sm text-slate-500 mt-1">Créez un nouveau dossier technique pour un employé.</p>
        </div>
      </div>

      <EmployeeForm />
    </div>
  );
}
