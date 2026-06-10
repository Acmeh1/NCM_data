import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  STATUT_OPTIONS,
  ETAT_OPTIONS,
  ETAT_LABELS,
  type PointageRow,
  type PointageStatut,
} from "@/hooks/usePointageStore";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Clock, MessageSquare } from "lucide-react";

interface PointageDayCellProps {
  cellData: PointageRow;
  day: Date;
  onCycleStatut: () => void;
  onUpdateCell: (updates: Partial<PointageRow>) => void;
  isCompact?: boolean;
}

const STATUT_STYLES: Record<string, { bg: string; text: string; border: string; hoverBg: string }> = {
  PRESENT:           { bg: "bg-emerald-100",  text: "text-emerald-700", border: "border-emerald-200", hoverBg: "hover:bg-emerald-200" },
  ABS_AUTORISEE:     { bg: "bg-blue-100",     text: "text-blue-700",    border: "border-blue-200",    hoverBg: "hover:bg-blue-200" },
  ABS_NON_AUTORISEE: { bg: "bg-red-100",      text: "text-red-700",     border: "border-red-200",     hoverBg: "hover:bg-red-200" },
  WEEKEND:           { bg: "bg-slate-100",    text: "text-slate-400",   border: "border-slate-200",   hoverBg: "hover:bg-slate-200" },
  FERIE:             { bg: "bg-violet-100",   text: "text-violet-700",  border: "border-violet-200",  hoverBg: "hover:bg-violet-200" },
  DEBUT_CONTRAT:     { bg: "bg-amber-50/70",  text: "text-amber-700",   border: "border-amber-200 border-dashed", hoverBg: "hover:bg-amber-100/70" },
  FIN_CONTRAT:       { bg: "bg-orange-50/70", text: "text-orange-700",  border: "border-orange-200 border-dashed", hoverBg: "hover:bg-orange-100/70" },
  MISE_A_PIED:       { bg: "bg-green-100",    text: "text-green-700",   border: "border-green-200",   hoverBg: "hover:bg-green-200" },
  "":                { bg: "bg-white",        text: "text-slate-300",   border: "border-slate-100",   hoverBg: "hover:bg-slate-50" },
};

const STATUT_ICONS: Record<string, string> = {
  PRESENT: "P",
  ABS_AUTORISEE: "AA",
  ABS_NON_AUTORISEE: "AN",
  WEEKEND: "W",
  FERIE: "F",
  DEBUT_CONTRAT: "DC",
  FIN_CONTRAT: "FC",
  MISE_A_PIED: "MP",
  "": "·",
};

export default function PointageDayCell({
  cellData,
  day,
  onCycleStatut,
  onUpdateCell,
  isCompact = false,
}: PointageDayCellProps) {
  const [open, setOpen] = useState(false);
  const style = STATUT_STYLES[cellData.statut] || STATUT_STYLES[""];
  const hasDetails = (cellData.heures_supp && cellData.heures_supp > 0) ||
                     (cellData.retard && cellData.retard > 0) ||
                     cellData.commentaire ||
                     cellData.etat;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => {
            if (e.shiftKey || cellData.statut === "WEEKEND") {
              // Shift+click or weekend → open popover
              setOpen(true);
            } else {
              // Normal click → cycle statut
              onCycleStatut();
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          className={cn(
            "relative w-full h-full min-w-[32px] min-h-[28px] flex items-center justify-center",
            "text-[10px] font-bold rounded-md border transition-all duration-150",
            "cursor-pointer select-none",
            style?.bg ?? "bg-white",
            style?.text ?? "text-slate-300",
            style?.border ?? "border-slate-100",
            style?.hoverBg ?? "hover:bg-slate-50",
            "active:scale-95"
          )}
          title={`${format(day, "EEEE dd MMMM", { locale: fr })} — ${STATUT_OPTIONS.find(s => s.value === cellData.statut)?.label || "Non défini"}`}
        >
          {STATUT_ICONS[cellData.statut]}
          {hasDetails && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" side="bottom">
        <div className="p-3 border-b bg-slate-50/50">
          <h4 className="font-bold text-xs text-slate-700">
            {format(day, "EEEE dd MMMM yyyy", { locale: fr })}
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Matricule: {cellData.matricule}
          </p>
        </div>

        <div className="p-3 space-y-3">
          {/* Statut Selection */}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Statut
            </Label>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
              {STATUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdateCell({ statut: opt.value })}
                  className={cn(
                    "text-[9px] font-bold py-1.5 px-2 rounded-md border transition-all",
                    cellData.statut === opt.value
                      ? `${STATUT_STYLES[opt.value].bg} ${STATUT_STYLES[opt.value].border} ${STATUT_STYLES[opt.value].text} ring-2 ring-offset-1`
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  )}
                  style={cellData.statut === opt.value ? ({ "--tw-ring-color": opt.color } as React.CSSProperties) : {}}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Etat détaillé (only for certain statuts) */}
          {ETAT_OPTIONS[cellData.statut] && (
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Motif détaillé
              </Label>
              <Select
                value={cellData.etat || ""}
                onValueChange={(v) => onUpdateCell({ etat: v })}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Sélectionner un motif..." />
                </SelectTrigger>
                <SelectContent>
                  {ETAT_OPTIONS[cellData.statut].map((etat) => (
                    <SelectItem key={etat} value={etat} className="text-xs">
                      {ETAT_LABELS[etat] || etat.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Heures supp & récup */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> H. Supp
              </Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                className="mt-1 h-8 text-xs"
                value={cellData.heures_supp || ""}
                onChange={(e) =>
                  onUpdateCell({
                    heures_supp: e.target.value ? parseFloat(e.target.value) : 0,
                  })
                }
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> H. Retard
              </Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                className="mt-1 h-8 text-xs"
                value={cellData.retard || ""}
                onChange={(e) =>
                  onUpdateCell({
                    retard: e.target.value ? parseFloat(e.target.value) : 0,
                  })
                }
              />
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Commentaire
            </Label>
            <Textarea
              className="mt-1 text-xs min-h-[50px] resize-none"
              placeholder="Note optionnelle..."
              value={cellData.commentaire || ""}
              onChange={(e) => onUpdateCell({ commentaire: e.target.value })}
            />
          </div>

          <Button
            size="sm"
            className="w-full gap-1.5 text-xs h-8"
            onClick={() => setOpen(false)}
          >
            <Check className="h-3.5 w-3.5" />
            Appliquer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
