import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Clock, User, Sun, Moon } from "lucide-react";

export default function Layout() {
  const { user, signOut } = useAuth();
  const { isAdmin } = usePermissions();
  
  // Theme Toggle Logic
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setIsDarkMode(prev => !prev);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-[72px] shrink-0 flex items-center justify-between border-b border-slate-800 px-6 bg-slate-900 text-white shadow-md z-10">
            <div className="flex items-center">
              <SidebarTrigger className="text-slate-400 hover:text-white" />
              <div className="ml-4 flex flex-col">
                <span className="text-lg font-black tracking-tight leading-none">CERAMIC ERP</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Industrial System</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Tools */}
              <div className="flex items-center gap-4 border-r border-slate-700 pr-6">
                <div className="relative cursor-pointer text-slate-300 hover:text-white transition-colors">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900">
                    8
                  </span>
                </div>
                <div className="cursor-pointer text-slate-300 hover:text-white transition-colors">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="cursor-pointer text-slate-300 hover:text-white transition-colors" onClick={toggleTheme} title="Basculer le thème">
                  {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
                </div>
              </div>
              
              {/* Profile */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700 shadow-inner">
                  <User className="h-5 w-5 text-slate-300" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold leading-none capitalize">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Utilisateur"}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium mt-1">
                    {isAdmin ? "Admin" : "Opérateur"}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={signOut} className="ml-2 h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-full" title="Déconnexion">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto bg-background">
            <Outlet />
          </main>
          <footer className="shrink-0 flex items-center justify-center border-t border-border bg-card text-xs text-muted-foreground py-3">
            &copy; 2026 by SAIBI Asma
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
