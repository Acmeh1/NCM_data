import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Loader2,
  Sparkles,
  Check,
  AlertCircle,
  FileText,
  Table as TableIcon,
  Copy,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

interface TargetField {
  key: string;
  label: string;
}

interface OcrImportDialogProps {
  open: boolean;
  onClose: () => void;
  onFieldAssign?: (key: string, value: string) => void;
  onTableAssign?: (rows: Record<string, string | number>[]) => void;
  targetFields?: TargetField[];
}

export default function OcrImportDialog({
  open,
  onClose,
  onFieldAssign,
  onTableAssign,
  targetFields = [],
}: OcrImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "table">("text");
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if OCR local server is running
  const checkServer = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/status");
      if (res.ok) {
        setServerStatus("online");
      } else {
        setServerStatus("offline");
      }
    } catch {
      setServerStatus("offline");
    }
  };

  useEffect(() => {
    if (open) {
      checkServer();
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      setExtractedData([]);
    }
  };

  const handleExtract = async () => {
    if (!file) {
      toast.warning("Veuillez sélectionner une image d'abord.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    try {
      const res = await fetch("http://127.0.0.1:8000/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Échec de l'extraction OCR.");
      }

      const responseData = await res.json();
      if (responseData.success) {
        setExtractedData(responseData.data);
        toast.success(`OCR complété avec succès !`);
      } else {
        toast.error("Le traitement OCR a échoué.");
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erreur de connexion avec le serveur OCR.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers");
  };

  const resetDialog = () => {
    setFile(null);
    setImagePreview(null);
    setExtractedData([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetDialog(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden bg-background border-border shadow-2xl rounded-xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                Extraction intelligente d'images (PaddleOCR)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Numérisez vos fiches, bordereaux ou rapports pour remplir les tables de données.
              </DialogDescription>
            </div>
            
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Serveur OCR :</span>
              {serverStatus === "checking" && (
                <span className="inline-flex items-center rounded-full bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-400/20">
                  Vérification...
                </span>
              )}
              {serverStatus === "online" && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
                  Connecté (127.0.0.1:8000)
                </span>
              )}
              {serverStatus === "offline" && (
                <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-500 ring-1 ring-inset ring-rose-500/20">
                  Hors ligne
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {serverStatus === "offline" ? (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Serveur OCR non détecté</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Le script FastAPI local n'est pas actif. Veuillez démarrer le serveur Python pour utiliser la reconnaissance d'images.
              </p>
            </div>
            
            <div className="w-full max-w-lg bg-zinc-950 text-zinc-100 rounded-lg p-4 font-mono text-xs text-left border border-zinc-800 shadow-inner">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                <span className="flex items-center gap-1.5 text-zinc-400 font-semibold">
                  <Terminal className="h-3.5 w-3.5" /> Démarrer le serveur
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:bg-zinc-800 text-zinc-400"
                  onClick={() => copyToClipboard("cd python_ocr && ocr_env\\Scripts\\activate && python app_server.py")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-emerald-400"># 1. Ouvrir un terminal dans le projet</p>
              <p className="text-zinc-300">cd python_ocr</p>
              <p className="text-emerald-400 mt-2"># 2. Créer et activer l'environnement virtuel</p>
              <p className="text-zinc-300">python -m venv ocr_env</p>
              <p className="text-zinc-300">ocr_env\Scripts\activate</p>
              <p className="text-emerald-400 mt-2"># 3. Installer les dépendances & lancer</p>
              <p className="text-zinc-300">pip install -r requirements.txt</p>
              <p className="text-zinc-300">python app_server.py</p>
            </div>

            <Button onClick={checkServer} variant="outline" className="gap-2 mt-2">
              <Loader2 className="h-4 w-4 animate-spin hidden" /> Réessayer la connexion
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            
            {/* LEFT SIDE: File upload and preview */}
            <div className="border rounded-lg bg-muted/20 flex flex-col overflow-hidden">
              <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Image Source</span>
                {file && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => { setFile(null); setImagePreview(null); setExtractedData([]); }}>
                    Changer d'image
                  </Button>
                )}
              </div>
              
              <div className="flex-1 p-4 flex flex-col justify-between overflow-hidden">
                {!imagePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors rounded-lg flex flex-col items-center justify-center p-6 text-center cursor-pointer bg-background"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="h-12 w-12 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-3">
                      <Upload className="h-6 w-6" />
                    </div>
                    <h4 className="font-semibold text-sm">Sélectionner un bordereau/image</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                      Glissez-déposez ou parcourez vos fichiers (PNG, JPG, WEBP)
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center overflow-hidden border rounded bg-zinc-900 relative">
                    <img
                      src={imagePreview}
                      alt="Aperçu OCR"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}

                {/* Configuration bar */}
                <div className="mt-4 grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Mode de lecture</Label>
                    <div className="flex rounded-md bg-muted p-1 gap-1">
                      <button
                        onClick={() => setMode("text")}
                        className={`flex-1 py-1 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                          mode === "text"
                            ? "bg-background shadow text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <FileText className="h-3 w-3" /> Lignes
                      </button>
                      <button
                        onClick={() => setMode("table")}
                        className={`flex-1 py-1 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                          mode === "table"
                            ? "bg-background shadow text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <TableIcon className="h-3 w-3" /> Tableau
                      </button>
                    </div>
                  </div>
                  <Button
                    onClick={handleExtract}
                    disabled={!file || isLoading}
                    className="w-full gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Lancer l'extraction
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Extracted details & mapping */}
            <div className="border rounded-lg bg-background flex flex-col overflow-hidden">
              <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Résultats Extraits</span>
                {extractedData.length > 0 && (
                  <span className="text-[11px] bg-indigo-500/10 text-indigo-500 font-medium px-2 py-0.5 rounded-full">
                    {extractedData.length} éléments trouvés
                  </span>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {extractedData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    <FileText className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm font-medium">Aucune donnée extraite pour le moment</p>
                    <p className="text-xs mt-1">
                      Sélectionnez une image et cliquez sur "Lancer l'extraction" ci-contre.
                    </p>
                  </div>
                ) : mode === "text" ? (
                  /* TEXT MODE: List of lines with click to assign to forms */
                  <div className="space-y-2">
                    {extractedData.map((line, idx) => (
                      <div
                        key={idx}
                        className="group flex flex-col p-2.5 rounded border border-border/60 bg-muted/10 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-foreground select-all leading-relaxed">
                            {line.text}
                          </span>
                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-muted"
                              title="Copier le texte"
                              onClick={() => copyToClipboard(line.text)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Interactive fields mapper */}
                        {targetFields.length > 0 && onFieldAssign && (
                          <div className="mt-2 flex flex-wrap gap-1.5 items-center border-t pt-2 border-border/40">
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Mapper vers :</span>
                            {targetFields.map((field) => (
                              <button
                                key={field.key}
                                onClick={() => {
                                  onFieldAssign(field.key, line.text);
                                  toast.success(`Affecté "${line.text}" à ${field.label}`);
                                }}
                                className="text-[10px] bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground font-medium px-2 py-0.5 rounded transition-colors flex items-center gap-1 border border-primary/20"
                              >
                                {field.label} <ArrowRight className="h-2 w-2" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* TABLE MODE: Structure preview */
                  <div className="space-y-4">
                    {extractedData.map((table, tIdx) => (
                      <div key={tIdx} className="space-y-2 border rounded p-3 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase">Tableau #{table.table_index + 1}</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => {
                              // If onTableAssign is provided, map cell bounding boxes into structured rows
                              if (onTableAssign) {
                                // Standard implementation of table row recovery
                                // Since layout depends on coordinates, we extract cells grouped by Y coordinate range
                                const rowsMap: Record<number, any[]> = {};
                                const threshold = 15; // px Y overlap
                                
                                table.cells.forEach((cell: any) => {
                                  const bbox = cell.cell_box;
                                  const text = cell.text;
                                  const cy = (bbox[1] + bbox[5]) / 2; // Y center
                                  
                                  // Find existing Y group
                                  let foundGroup = Object.keys(rowsMap).find(k => Math.abs(Number(k) - cy) < threshold);
                                  if (foundGroup) {
                                    rowsMap[Number(foundGroup)].push(cell);
                                  } else {
                                    rowsMap[cy] = [cell];
                                  }
                                });

                                // Convert Y groups to rows sorted by X coordinate
                                const sortedRows = Object.keys(rowsMap)
                                  .map(Number)
                                  .sort((a, b) => a - b)
                                  .map(y => {
                                    const rowCells = rowsMap[y].sort((a, b) => a.cell_box[0] - b.cell_box[0]);
                                    const rowObj: Record<string, string | number> = {};
                                    rowCells.forEach((c, cIdx) => {
                                      rowObj[`col_${cIdx}`] = c.text;
                                    });
                                    return rowObj;
                                  });
                                  
                                onTableAssign(sortedRows);
                                toast.success(`Tableau importé (${sortedRows.length} lignes)`);
                              }
                            }}
                          >
                            <Check className="h-3 w-3 text-emerald-500" /> Charger dans la table
                          </Button>
                        </div>
                        
                        {/* Display raw HTML table with Tailwind style adjustments */}
                        <div 
                          className="overflow-x-auto text-xs max-h-[300px] border rounded bg-background [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:p-1.5 [&_th]:bg-muted [&_td]:border [&_td]:p-1.5"
                          dangerouslySetInnerHTML={{ __html: table.html }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
