import { User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmployeeData } from "@/hooks/useEmployees";
import { useNavigate } from "react-router-dom";

interface EmployeeCardProps {
  employee: EmployeeData;
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  const navigate = useNavigate();
  const prenom = employee["Prénom"] || employee["Prenom"] || "";
  const fullName = `${employee.Nom || ""} ${prenom}`.trim();
  const depart = employee["Date_départ"] || employee["Date_depart"];

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 overflow-hidden ${depart ? 'opacity-60' : ''}`}
      onClick={() => navigate(`/rh/employes/${employee.Matricule}`)}
    >
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden bg-slate-100 border flex items-center justify-center">
            {employee.Photo_URL ? (
              <img 
                src={employee.Photo_URL} 
                alt={fullName} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <User className={`w-8 h-8 text-slate-400 ${employee.Photo_URL ? 'hidden' : ''}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate text-slate-900" title={fullName}>
              {fullName || "Employé sans nom"}
            </h3>
            <p className="text-xs font-mono text-slate-500 mb-2">
              {employee.Matricule}
            </p>
            
            <div className="flex flex-col gap-1">
              {employee.Fonction && (
                <span className="text-sm text-slate-700 truncate block">
                  {employee.Fonction}
                </span>
              )}
              {employee.Service && (
                <Badge variant="secondary" className="w-fit text-xs font-normal">
                  {employee.Service}
                </Badge>
              )}
            </div>
            
            {depart && (
              <Badge variant="destructive" className="mt-2 w-fit text-[10px]">
                Parti le {depart}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
