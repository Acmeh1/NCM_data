import React from "react";
import { Package, Clock } from "lucide-react";

export default function DashboardQualite() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="bg-primary/10 p-6 rounded-full">
        <Package className="h-16 w-16 text-primary animate-pulse" />
      </div>
      <div>
        <h1 className="text-4xl font-black tracking-tight uppercase mb-2">GESTION DES STOCKS & APPROVISIONNEMENT</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium bg-muted px-4 py-1.5 rounded-full w-fit mx-auto">
          <Clock className="h-4 w-4" />
          <span>Coming Soon</span>
        </div>
      </div>
        Le module de gestion des stocks et de l'approvisionnement est en cours de restructuration pour un suivi plus précis.
    </div>
  );
}
