import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import AuthGuard from "@/components/AuthGuard";
import ProductionJournalier from "@/pages/ProductionJournalier";
import ProductionEmballage from "@/pages/ProductionEmballage";
import ProductionSelection from "@/pages/ProductionSelection";
import StatsLinea from "@/pages/StatsLinea";
import ViewJournalier from "@/pages/ViewJournalier";
import ViewEmballage from "@/pages/ViewEmballage";
import ViewSelection from "@/pages/ViewSelection";
import ViewStatsLinea from "@/pages/ViewStatsLinea";
import AdminBackup from "@/pages/AdminBackup";
import AdminUsers from "@/pages/AdminUsers";
import AdminKpiConfig from "@/pages/AdminKpiConfig";
import Maintenance from "@/pages/Maintenance";
import ViewInterventions from "@/pages/ViewInterventions";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import DashboardProduction from "@/pages/DashboardProduction";
import DashboardDirection from "@/pages/DashboardDirection";
import DashboardGeneral from "@/pages/DashboardGeneral";
import DashboardMaintenance from "@/pages/DashboardMaintenance";
import DashboardQualite from "@/pages/DashboardQualite";
import DashboardRH from "@/pages/DashboardRH";
import DashboardCommercial from "@/pages/DashboardCommercial";
import ProductionCasse from "@/pages/ProductionCasse";
import RHPointage from "@/pages/RHPointage";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public route for password reset */}
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected routes */}
          <Route element={<AuthGuard />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/production/journalier" replace />} />
              <Route path="/production/journalier" element={<ProductionJournalier />} />
              <Route path="/production/emballage" element={<ProductionEmballage />} />
              <Route path="/production/selection" element={<ProductionSelection />} />
              <Route path="/production/stats-linea" element={<StatsLinea />} />
              <Route path="/production/casse" element={<ProductionCasse />} />
              <Route path="/production/journalier/view" element={<ViewJournalier />} />
              <Route path="/production/emballage/view" element={<ViewEmballage />} />
              <Route path="/production/selection/view" element={<ViewSelection />} />
              <Route path="/production/stats-linea/view" element={<ViewStatsLinea />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/dashboard/production" element={<DashboardProduction />} />
              <Route path="/dashboard/direction" element={<DashboardDirection />} />
              <Route path="/dashboard/general" element={<DashboardGeneral />} />
              <Route path="/dashboard/maintenance" element={<DashboardMaintenance />} />
              <Route path="/dashboard/qualite" element={<DashboardQualite />} />
              <Route path="/dashboard/rh" element={<DashboardRH />} />
              <Route path="/dashboard/commercial" element={<DashboardCommercial />} />
              <Route path="/rh/pointage" element={<RHPointage />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/maintenance/view" element={<ViewInterventions />} />
              <Route path="/admin/backup" element={<AdminBackup />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/kpi" element={<AdminKpiConfig />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
