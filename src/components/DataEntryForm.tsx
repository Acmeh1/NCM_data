import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface DataEntryFormProps {
  columns: string[];
  onSubmit: (values: Record<string, string | number>) => void;
}

const DataEntryForm = ({ columns, onSubmit }: DataEntryFormProps) => {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed: Record<string, string | number> = {};
    columns.forEach((col) => {
      const val = values[col] ?? "";
      const num = Number(val);
      parsed[col] = val !== "" && !isNaN(num) ? num : val;
    });
    onSubmit(parsed);
    setValues({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {columns.map((col) => (
          <div key={col} className="space-y-1.5">
            <Label htmlFor={`field-${col}`} className="text-sm font-medium capitalize text-muted-foreground">
              {col}
            </Label>
            <Input
              id={`field-${col}`}
              placeholder={`Enter ${col}`}
              value={values[col] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [col]: e.target.value }))}
              className="bg-background"
            />
          </div>
        ))}
      </div>
      <Button type="submit" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Entry
      </Button>
    </form>
  );
};

export default DataEntryForm;
