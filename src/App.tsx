import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import AuthGuard from "@/components/AuthGuard";

// ── Lazy-loaded pages (each becomes its own JS chunk) ──────────────
const ViewJournalier        = lazy(() => import("@/pages/ViewJournalier"));
const ViewEmballage         = lazy(() => import("@/pages/ViewEmballage"));
const ViewSelection         = lazy(() => import("@/pages/ViewSelection"));
const ViewStatsLinea        = lazy(() => import("@/pages/ViewStatsLinea"));
const AdminBackup           = lazy(() => import("@/pages/AdminBackup"));
const AdminUsers            = lazy(() => import("@/pages/AdminUsers"));
const AdminKpiConfig        = lazy(() => import("@/pages/AdminKpiConfig"));
const Maintenance           = lazy(() => import("@/pages/Maintenance"));
const ViewInterventions     = lazy(() => import("@/pages/ViewInterventions"));
const AnalyticsDashboard    = lazy(() => import("@/pages/AnalyticsDashboard"));
const DashboardProduction   = lazy(() => import("@/pages/DashboardProduction"));
const DashboardDirection    = lazy(() => import("@/pages/DashboardDirection"));
const DashboardGeneral      = lazy(() => import("@/pages/DashboardGeneral"));
const DashboardMaintenance  = lazy(() => import("@/pages/DashboardMaintenance"));
const DashboardQualite      = lazy(() => import("@/pages/DashboardQualite"));
const DashboardRH           = lazy(() => import("@/pages/DashboardRH"));
const DashboardCommercial   = lazy(() => import("@/pages/DashboardCommercial"));
const RHPointage            = lazy(() => import("@/pages/RHPointage"));
const EmployeeList          = lazy(() => import("@/pages/hr/EmployeeList"));
const EmployeeDetail        = lazy(() => import("@/pages/hr/EmployeeDetail"));
const EmployeeCreate        = lazy(() => import("@/pages/hr/EmployeeCreate"));
const EmployeeEdit          = lazy(() => import("@/pages/hr/EmployeeEdit"));
const ResetPassword         = lazy(() => import("@/pages/ResetPassword"));
const NotFound              = lazy(() => import("./pages/NotFound"));
const SaisieGlobale         = lazy(() => import("@/pages/SaisieGlobale"));

// ── Minimal full-screen loading fallback ───────────────────────────
const PageLoader = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      width: "100vw",
      background: "#f8fafc",
      gap: "12px",
      flexDirection: "column",
    }}
  >
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6366f1"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: "spin 1s linear infinite" }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
    <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>
      Chargement…
    </span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep successful data fresh for 5 minutes before refetching
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Don't retry on error more than once
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public route for password reset */}
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route element={<AuthGuard />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/production/saisie-globale" replace />} />
                <Route path="/production/saisie-globale"   element={<SaisieGlobale />} />
                <Route path="/production/journalier/view"  element={<ViewJournalier />} />
                <Route path="/production/emballage/view"   element={<ViewEmballage />} />
                <Route path="/production/selection/view"   element={<ViewSelection />} />
                <Route path="/production/stats-linea/view" element={<ViewStatsLinea />} />
                <Route path="/analytics"                   element={<AnalyticsDashboard />} />
                <Route path="/dashboard/production"        element={<DashboardProduction />} />
                <Route path="/dashboard/direction"         element={<DashboardDirection />} />
                <Route path="/dashboard/general"           element={<DashboardGeneral />} />
                <Route path="/dashboard/maintenance"       element={<DashboardMaintenance />} />
                <Route path="/dashboard/qualite"           element={<DashboardQualite />} />
                <Route path="/dashboard/rh"                element={<DashboardRH />} />
                <Route path="/dashboard/commercial"        element={<DashboardCommercial />} />
                <Route path="/rh/pointage"                 element={<RHPointage />} />
                <Route path="/rh/employes"                 element={<EmployeeList />} />
                <Route path="/rh/employes/nouveau"         element={<EmployeeCreate />} />
                <Route path="/rh/employes/:matricule"      element={<EmployeeDetail />} />
                <Route path="/rh/employes/:matricule/modifier" element={<EmployeeEdit />} />
                <Route path="/maintenance"                 element={<Maintenance />} />
                <Route path="/maintenance/view"            element={<ViewInterventions />} />
                <Route path="/admin/backup"                element={<AdminBackup />} />
                <Route path="/admin/users"                 element={<AdminUsers />} />
                <Route path="/admin/kpi"                   element={<AdminKpiConfig />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
