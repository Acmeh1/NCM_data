import React from "react";
import { Wrench, Clock } from "lucide-react";

export default function DashboardMaintenance() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="bg-primary/10 p-6 rounded-full">
        <Wrench className="h-16 w-16 text-primary animate-pulse" />
      </div>
      <div>
        <h1 className="text-4xl font-black tracking-tight uppercase mb-2">Maintenance</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium bg-muted px-4 py-1.5 rounded-full w-fit mx-auto">
          <Clock className="h-4 w-4" />
          <span>Coming Soon</span>
        </div>
      </div>
      <p className="max-w-md text-muted-foreground leading-relaxed">
        La vue consolidée de la maintenance préventive et curative est en cours de développement.
      </p>
    </div>
  );
}
