import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Calendar as CalendarIcon, Clock, Users } from "lucide-react";
import { type ProductionEntry } from "@/hooks/useProductionStore";

interface SearchProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: ProductionEntry[];
  onSelect: (entry: ProductionEntry) => void;
}

const formatDateFrench = (dateString: string) => {
  if (!dateString) return "";
  const dateOnly = dateString.split("T")[0].split(" ")[0];
  const parts = dateOnly.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateOnly;
};

export default function SearchProductionDialog({ open, onOpenChange, entries, onSelect }: SearchProductionDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) {
      return entries.slice(0, 50); // Show recent 50 by default
    }
    const lowerSearch = searchTerm.toLowerCase();
    return entries.filter(e => {
      const dateOnly = (e.Date || "").split("T")[0].split(" ")[0];
      const frDate = formatDateFrench(dateOnly);
      return dateOnly.includes(lowerSearch) ||
        frDate.includes(lowerSearch) ||
        e.Modele?.toLowerCase().includes(lowerSearch) ||
        e.Format?.toLowerCase().includes(lowerSearch) ||
        e.Groupe?.toLowerCase().includes(lowerSearch) ||
        e.Horaire?.toLowerCase().includes(lowerSearch);
    }).slice(0, 50);
  }, [entries, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Rechercher une production</DialogTitle>
          <DialogDescription>
            Recherchez par date, modèle, format ou groupe pour modifier une saisie existante.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Ex: 03/05/2026, TERRE CUITE, 45*45..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 mt-4 border rounded-md h-[400px]">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aucune production trouvée.
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredEntries.map(entry => (
                <div 
                  key={entry.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    onSelect(entry);
                    onOpenChange(false);
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      {formatDateFrench(entry.Date)}
                      <span className="text-muted-foreground font-normal text-sm ml-2">
                        {entry.Modele} - {entry.Format}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {entry.Horaire} ({entry.Heure_Debut} - {entry.Heure_Fin})
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> Grp: {entry.Groupe} ({entry.Chef_Equipe})
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2 sm:mt-0">
                    Sélectionner
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
