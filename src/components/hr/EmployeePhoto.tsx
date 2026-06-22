import { useState } from "react";
import { User, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EmployeePhotoProps {
  matricule: string | undefined;
  photoUrl: string | null;
  onPhotoUploaded: (url: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function EmployeePhoto({ matricule, photoUrl, onPhotoUploaded, readOnly, className }: EmployeePhotoProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = matricule || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const filePath = `employee-photos/${fileName}.${fileExt}`;
    
    setUploading(true);
    try {
      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("rh")
        .upload(filePath, file, { upsert: true, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data } = supabase.storage.from("rh").getPublicUrl(filePath);
      const newPhotoUrl = `${data.publicUrl}?t=${new Date().getTime()}`; // cache buster

      // 3. Callback to update form/database
      onPhotoUploaded(newPhotoUrl);

      toast({
        title: "Succès",
        description: "Photo mise à jour avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'upload.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-slate-100 shadow-md bg-slate-50 flex items-center justify-center">
        {photoUrl ? (
          <img 
            src={photoUrl} 
            alt="Photo" 
            className="w-full h-full object-cover" 
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <User className={`w-16 h-16 text-slate-300 ${photoUrl ? 'hidden' : ''}`} />
        
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="relative">
          <Button variant="outline" size="sm" className="relative z-10" disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Upload..." : "Changer la photo"}
          </Button>
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            title="Choisir une photo"
          />
        </div>
      )}
    </div>
  );
}
