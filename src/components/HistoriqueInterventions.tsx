import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("fr-FR");
  } catch (e) {
    return "-";
  }
};

export default function HistoriqueInterventions() {
  const [interventions, setInterventions] = useState<any[]>([]);

  const loadHistorique = async () => {
    const { data, error } = await supabase
      .from("interventions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
      
    if (!error && data) {
      setInterventions(data);
    }
  };

  useEffect(() => {
    loadHistorique();
    
    // Set up realtime subscription to auto-update
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interventions' },
        (payload) => {
          setInterventions((current) => [payload.new, ...current].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-lg">Historique des Interventions (10 dernières)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>N° Intervention</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Équipe</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Équipement</TableHead>
                <TableHead>Demandeur</TableHead>
                <TableHead className="text-center">Durée brute (min)</TableHead>
                <TableHead className="text-right">Arrêt total (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interventions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                    Aucune intervention enregistrée.
                  </TableCell>
                </TableRow>
              ) : (
                interventions.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.numero || "-"}</TableCell>
                    <TableCell>
                      {inv.date_intervention 
                        ? formatDate(inv.date_intervention) 
                        : (inv.created_at ? formatDate(inv.created_at) : "-")}
                    </TableCell>
                    <TableCell>{inv.equipe || "-"}</TableCell>
                    <TableCell>{inv.zone_code || "-"}</TableCell>
                    <TableCell>{inv.equipement_code || "-"}</TableCell>
                    <TableCell>{inv.demandeur || "-"}</TableCell>
                    <TableCell className="text-center">{inv.duree_intervention_minutes ?? "-"}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{inv.total_arret ?? "0"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
