import { useState } from "react";
import { useEmployees, useServices } from "@/hooks/useEmployees";
import { EmployeeCard } from "@/components/hr/EmployeeCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Loader2, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EmployeeList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  
  const { data: employees, isLoading } = useEmployees(searchTerm, serviceFilter);
  const { data: services } = useServices();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Fiches Employés</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez les dossiers techniques et informations du personnel.</p>
        </div>
        
        <Button onClick={() => navigate("/rh/employes/nouveau")}>
          <UserPlus className="w-4 h-4 mr-2" />
          Nouvelle Fiche
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            className="pl-10 bg-white shadow-sm border-slate-200 focus-visible:ring-primary/20"
            placeholder="Rechercher par matricule, nom ou prénom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="w-full sm:w-64">
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="bg-white">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Tous les services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les services</SelectItem>
              {services?.map((srv) => (
                <SelectItem key={srv} value={srv}>{srv}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : employees && employees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {employees.map((emp) => (
            <EmployeeCard key={emp.Matricule} employee={emp} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed">
          <p className="text-lg font-medium text-slate-700">Aucun employé trouvé.</p>
          <p className="text-sm text-slate-500 mt-1">Modifiez votre recherche ou créez une nouvelle fiche.</p>
        </div>
      )}
    </div>
  );
}
