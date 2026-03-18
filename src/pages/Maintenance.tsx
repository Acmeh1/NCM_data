import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import InterventionForm from "@/components/InterventionForm";

export default function Maintenance() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="h-6 w-6 text-primary" />
          Maintenance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestion de la maintenance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Section en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Cette section sera bientôt disponible. Elle permettra de gérer les interventions, le planning et le suivi de maintenance.
          </p>
        </CardContent>
      </Card>

      <InterventionForm />
    </div>
  );
}
