import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EditColumn {
  key: string;
  label: string;
  type?: "text" | "number";
  readOnly?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  columns: EditColumn[];
  entry: Record<string, any> | null;
  onSave: (updated: Record<string, any>) => void;
  title?: string;
}

export default function EditEntryDialog({ open, onClose, columns, entry, onSave, title }: Props) {
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (entry) {
      const init: Record<string, any> = {};
      columns.forEach((c) => { init[c.key] = entry[c.key] ?? ""; });
      setForm(init);
    }
  }, [entry, columns]);

  if (!entry) return null;

  const handleChange = (key: string, value: string, type?: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: type === "number" ? (value === "" ? 0 : Number(value)) : value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title ?? "Modifier l'entrée"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-3 py-2">
            {columns.map((col) => (
              <div key={col.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{col.label}</Label>
                <Input
                  value={form[col.key] ?? ""}
                  type={col.type === "number" ? "number" : "text"}
                  readOnly={col.readOnly}
                  className={col.readOnly ? "bg-muted" : ""}
                  onChange={(e) => handleChange(col.key, e.target.value, col.type)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave({ ...entry, ...form })}>Mettre à jour</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
