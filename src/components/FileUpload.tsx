import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { parseFile } from "@/lib/fileParser";
import { toast } from "sonner";

interface FileUploadProps {
  onImport: (rows: Record<string, string | number>[]) => void;
}

const FileUpload = ({ onImport }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setIsLoading(true);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast.warning("The file appears to be empty or has no data rows.");
        return;
      }
      onImport(rows);
      toast.success(`Imported ${rows.length} rows from ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={onFileChange}
        className="hidden"
      />
      <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground mb-3">
        Drag & drop a CSV or Excel file here, or
      </p>
      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        Browse Files
      </Button>
    </div>
  );
};

export default FileUpload;
