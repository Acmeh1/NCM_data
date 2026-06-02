import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface JsonImportProps {
  onImport: (data: any[]) => void;
  label?: string;
}

export function JsonImport({ onImport, label = "Importer JSON" }: JsonImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [rawJson, setRawJson] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let jsonStr = event.target?.result as string;
        let json = JSON.parse(jsonStr);
        if (!Array.isArray(json)) {
          json = [json];
        }
        setPreviewData(json);
        setRawJson(JSON.stringify(json, null, 2));
        setIsOpen(true);
      } catch (err) {
        console.error("JSON parse error:", err);
        toast.error("Fichier JSON invalide");
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    try {
      const finalData = JSON.parse(rawJson);
      onImport(finalData);
      setPreviewData(null);
      setRawJson("");
      setIsOpen(false);
    } catch (err) {
      toast.error("Le JSON édité est invalide, veuillez corriger les erreurs de syntaxe.");
    }
  };

  const cancelImport = () => {
    setPreviewData(null);
    setRawJson("");
    setIsOpen(false);
  };

  const getHeaders = () => {
    if (!previewData || previewData.length === 0) return [];
    // Récupérer toutes les colonnes uniques
    const headers = new Set<string>();
    previewData.forEach(row => {
      Object.keys(row).forEach(key => headers.add(key));
    });
    return Array.from(headers);
  };

  return (
    <>
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
        <Upload className="h-4 w-4" /> {label}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Aperçu et Édition de l'importation</DialogTitle>
            <DialogDescription>
              Vérifiez ou modifiez les données ({previewData?.length || 0} lignes trouvées).
            </DialogDescription>
          </DialogHeader>
          
          <Tabs 
            defaultValue="table" 
            className="flex-1 flex flex-col min-h-0 mt-2"
            onValueChange={(val) => {
              if (val === 'table') {
                try {
                  const parsed = JSON.parse(rawJson);
                  setPreviewData(Array.isArray(parsed) ? parsed : [parsed]);
                } catch {
                  toast.error("JSON invalide. L'aperçu n'est pas mis à jour.");
                }
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table">Aperçu Tableau</TabsTrigger>
              <TabsTrigger value="json">Éditeur JSON</TabsTrigger>
            </TabsList>
            
            <TabsContent value="table" className="flex-1 flex flex-col min-h-0 data-[state=active]:flex">
              <ScrollArea className="flex-1 border rounded-md my-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {getHeaders().map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData?.map((row, index) => (
                      <TableRow key={index}>
                        {getHeaders().map((header) => (
                          <TableCell key={header} className="whitespace-nowrap">
                            {row[header] !== null && row[header] !== undefined ? String(row[header]) : ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="json" className="flex-1 flex flex-col min-h-0 data-[state=active]:flex">
              <Textarea 
                value={rawJson} 
                onChange={(e) => setRawJson(e.target.value)} 
                className="flex-1 font-mono text-sm my-2 resize-none"
                placeholder="Éditez votre JSON ici..."
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={cancelImport}>
              <X className="h-4 w-4 mr-2" /> Annuler
            </Button>
            <Button onClick={confirmImport}>
              <Check className="h-4 w-4 mr-2" /> Confirmer l'import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
