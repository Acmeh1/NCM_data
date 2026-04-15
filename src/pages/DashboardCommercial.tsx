import React from "react";
import { ShoppingCart, Clock } from "lucide-react";

export default function DashboardCommercial() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="bg-primary/10 p-6 rounded-full">
        <ShoppingCart className="h-16 w-16 text-primary animate-pulse" />
      </div>
      <div>
        <h1 className="text-4xl font-black tracking-tight uppercase mb-2">Commercial</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium bg-muted px-4 py-1.5 rounded-full w-fit mx-auto">
          <Clock className="h-4 w-4" />
          <span>Coming Soon</span>
        </div>
      </div>
      <p className="max-w-md text-muted-foreground leading-relaxed">
        Le suivi des expéditions et des stocks est en cours de préparation.
      </p>
    </div>
  );
}
