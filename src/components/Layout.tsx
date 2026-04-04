import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b bg-card px-4">
            <div className="flex items-center">
              <SidebarTrigger />
              <span className="ml-3 text-sm font-medium text-muted-foreground">
                Production Management
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 h-8">
                <LogOut className="h-3.5 w-3.5" />
                Déconnexion
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
          <footer className="shrink-0 flex items-center justify-center border-t bg-card text-xs text-muted-foreground py-3">
            &copy; 2026 by SAIBI Asma
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
