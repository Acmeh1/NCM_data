import { Wrench, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import InterventionForm from "@/components/InterventionForm";
import HistoriqueInterventions from "@/components/HistoriqueInterventions";
import InterventionExcelImport from "@/components/InterventionExcelImport";

export default function Maintenance() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Maintenance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion de la maintenance et import Excel
          </p>
          <Button 
            variant="outline" 
            className="mt-3 gap-2"
            onClick={() => navigate('/maintenance/view')}
          >
            <Eye className="h-4 w-4" />
            Aperçu complet & Export (Excel/CSV)
          </Button>
        </div>
        <div className="w-full md:w-auto">
          <InterventionExcelImport />
        </div>
      </div>

      <InterventionForm />
      <HistoriqueInterventions />
    </div>
  );
}
