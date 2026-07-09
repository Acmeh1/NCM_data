import { 
  Factory, 
  Wrench, 
  UserCog, 
  LayoutDashboard, 
  Database, 
  Users, 
  CalendarCheck, 
  ChartColumn, 
  ChartPie, 
  TrendingUp, 
  ShoppingCart, 
  Target,
  ChevronDown
} from "lucide-react";
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
  const { isAdmin, loading } = usePermissions();

  if (loading) return null;

  return (
    <Sidebar className="border-r bg-sidebar">
      <SidebarContent>
        {/* Logo Section */}
        <div className="p-4 border-b flex flex-col items-center">
          <img src="/favicon.png" alt="NCM Céramique" className="h-14 w-auto object-contain" />
          <p className="text-xs text-muted-foreground mt-1">Système de gestion</p>
        </div>

        {/* 1. Production */}
        <SidebarGroup className="p-2">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="h-8 shrink-0 text-xs font-medium text-sidebar-foreground/70 flex items-center justify-between w-full cursor-pointer hover:bg-sidebar-accent rounded-md px-2">
                <span className="flex items-center gap-2">
                  <Factory className="h-4 w-4" />
                  Production
                </span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1 mt-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/production/saisie-globale" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <LayoutDashboard className="h-4 w-4 text-primary" />
                        <span>Saisie Globale</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/production/journalier/view" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <Database className="h-4 w-4 text-primary" />
                        <span>Historique Four</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* 2. Maintenance */}
        <SidebarGroup className="p-2">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="h-8 shrink-0 text-xs font-medium text-sidebar-foreground/70 flex items-center justify-between w-full cursor-pointer hover:bg-sidebar-accent rounded-md px-2">
                <span className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Maintenance
                </span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1 mt-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/maintenance" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <Wrench className="h-4 w-4" />
                        <span>Demande intervention DI</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* 3. Ressources Humaines */}
        <SidebarGroup className="p-2">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="h-8 shrink-0 text-xs font-medium text-sidebar-foreground/70 flex items-center justify-between w-full cursor-pointer hover:bg-sidebar-accent rounded-md px-2">
                <span className="flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Ressources Humaines
                </span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1 mt-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/rh/employes" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <Users className="h-4 w-4" />
                        <span>Fiches Employés</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/rh/pointage" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <CalendarCheck className="h-4 w-4" />
                        <span>Pointage Mensuel</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/dashboard/rh" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <ChartColumn className="h-4 w-4" />
                        <span>Dashboard RH</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* 4. Tableaux de Bord */}
        <SidebarGroup className="p-2">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="h-8 shrink-0 text-xs font-medium text-sidebar-foreground/70 flex items-center justify-between w-full cursor-pointer hover:bg-sidebar-accent rounded-md px-2">
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Tableaux de Bord
                </span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1 mt-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/dashboard/general" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Vue Générale d'Usine</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/dashboard/direction" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <ChartPie className="h-4 w-4" />
                        <span>Vue Direction</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/dashboard/production" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span>Production</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/dashboard/qualite" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <ShoppingCart className="h-4 w-4" />
                        <span>Approvisionnement & Achat</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/dashboard/maintenance" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <Wrench className="h-4 w-4" />
                        <span>Maintenance</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/dashboard/rh-analytics" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <UserCog className="h-4 w-4" />
                        <span>Ressources Humaines</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 text-sm">
                      <NavLink to="/dashboard/commercial" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                        <ShoppingCart className="h-4 w-4" />
                        <span>Commercial</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* 5. Administration */}
        {isAdmin && (
          <SidebarGroup className="p-2">
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="h-8 shrink-0 text-xs font-medium text-sidebar-foreground/70 flex items-center justify-between w-full cursor-pointer hover:bg-sidebar-accent rounded-md px-2">
                  <span className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Administration
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1 mt-1">
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="h-8 text-sm">
                        <NavLink to="/admin/users" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                          <Users className="h-4 w-4" />
                          <span>Gestion Utilisateurs</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="h-8 text-sm">
                        <NavLink to="/admin/kpi" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                          <Target className="h-4 w-4" />
                          <span>Configuration KPI</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="h-8 text-sm">
                        <NavLink to="/admin/backup" activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                          <Database className="h-4 w-4" />
                          <span>Backups</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

      </SidebarContent>
    </Sidebar>
  );
}
