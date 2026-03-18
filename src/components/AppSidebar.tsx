import { Factory, ClipboardList, Package, ChevronDown, Database, CheckSquare, BarChart3, Wrench, Users, PieChart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePermissions } from "@/hooks/usePermissions";

export function AppSidebar() {
  const { production, maintenance, dashboard, isAdmin, loading } = usePermissions();

  if (loading) return null;

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <div className="p-4 border-b flex flex-col items-center">
          <img src="/favicon.png" alt="NCM Céramique" className="h-14 w-auto object-contain" />
          <p className="text-xs text-muted-foreground mt-1">Système de gestion</p>
        </div>

        {production && (
          <SidebarGroup>
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="flex items-center justify-between w-full cursor-pointer hover:bg-sidebar-accent rounded-md px-2">
                  <span className="flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    Production
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/production/journalier"
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-primary font-medium">
                          <ClipboardList className="h-4 w-4" />
                          Production Journalier
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/production/emballage"
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-primary font-medium">
                          <Package className="h-4 w-4" />
                          Production Emballage
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/production/selection"
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-primary font-medium">
                          <CheckSquare className="h-4 w-4" />
                          Sélection & Qualité
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/production/stats-linea"
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-primary font-medium">
                          <BarChart3 className="h-4 w-4" />
                          Statistiques Linea
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {maintenance && (
          <SidebarGroup>
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="flex items-center justify-between w-full cursor-pointer hover:bg-sidebar-accent rounded-md px-2">
                  <span className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Maintenance
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/maintenance"
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-primary font-medium">
                          <Wrench className="h-4 w-4" />
                          Demande intervention DI
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {(isAdmin || dashboard) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/analytics"
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-primary font-medium">
                      <PieChart className="h-4 w-4" />
                      Tableau de Bord
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <>

            <SidebarGroup>
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between w-full cursor-pointer hover:bg-sidebar-accent rounded-md px-2">
                    <span className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Administration
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/users"
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent"
                            activeClassName="bg-sidebar-accent text-primary font-medium">
                            <Users className="h-4 w-4" />
                            Gestion Utilisateurs
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/backup"
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent"
                            activeClassName="bg-sidebar-accent text-primary font-medium">
                            <Database className="h-4 w-4" />
                            Backups
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
