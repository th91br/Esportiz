import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { PWABadge } from "@/components/PWABadge";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/auth";
import { AppProvider } from "@/contexts/AppContext";
import { useProfile } from "./hooks/queries/useProfile";
import { getAuthenticatedHomePath } from "./lib/authRouting";
import { canAccessBusinessRoute } from "./lib/businessRouteAccess";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { canAccessPath as canAccessRolePath } from "./lib/rolePermissions";
import { shouldRevokeOrganizationSession } from "./lib/organizationAccess";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Index = lazy(() => import("./pages/Index"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const StudentProfilePage = lazy(() => import("./pages/StudentProfilePage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const PlansPage = lazy(() => import("./pages/PlansPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const BirthdaysPage = lazy(() => import("./pages/BirthdaysPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ModalitiesPage = lazy(() => import("./pages/ModalitiesPage"));
const GroupsPage = lazy(() => import("./pages/GroupsPage"));
const CommunicationPage = lazy(() => import("./pages/CommunicationPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CourtsPage = lazy(() => import("./pages/CourtsPage"));
const ArenaAgendaPage = lazy(() => import("./pages/ArenaAgendaPage"));
const ComandasPage = lazy(() => import("./pages/ComandasPage"));
const ContractsPage = lazy(() => import("./pages/ContractsPage"));
const EnrollmentUnavailablePage = lazy(() => import("./pages/EnrollmentUnavailablePage"));
const StudentPortalPage = lazy(() => import("./pages/StudentPortalPage"));
const OnlineBookingPage = lazy(() => import("./pages/OnlineBookingPage"));

const queryClient = new QueryClient();
function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

function LoginRoute() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loadingProfile, isErrorProfile, errorProfile } = useProfile();

  if (isErrorProfile) {
    throw new Error(`Falha ao carregar o perfil: ${getErrorMessage(errorProfile)}`);
  }

  if (authLoading || (user && loadingProfile)) {
    return <FullScreenLoader />;
  }

  if (user) {
    return <Navigate to={getAuthenticatedHomePath(profile)} replace />;
  }

  return <LoginPage />;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loadingProfile, isErrorProfile, errorProfile } = useProfile();
  const {
    businessType,
    organizationRole,
    hasActiveOrganizationAccess,
    isLoadingOrganizationRole,
    isRolePermissionFilterActive,
    isRoleKnown,
  } = useBusinessContext();

  const shouldRevokeSession = shouldRevokeOrganizationSession({
    isAuthenticated: Boolean(user),
    profileOrganizationId: profile?.organization_id,
    onboardingCompleted: profile?.onboarding_completed,
    isMembershipLoading: isLoadingOrganizationRole,
    isRoleKnown,
    hasActiveOrganizationAccess,
  });

  useEffect(() => {
    if (shouldRevokeSession) {
      void signOut();
    }
  }, [shouldRevokeSession, signOut]);

  if (isErrorProfile) {
    throw new Error(`Falha ao carregar o perfil: ${getErrorMessage(errorProfile)}`);
  }

  if (authLoading || (user && (loadingProfile || isLoadingOrganizationRole))) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login?mode=login" replace />;
  }

  if (shouldRevokeSession) {
    return <FullScreenLoader />;
  }

  const isOnboardingRoute = location.pathname === "/onboarding";
  const homePath = getAuthenticatedHomePath(profile);

  if (homePath === "/onboarding" && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (homePath !== "/onboarding" && isOnboardingRoute) {
    return <Navigate to={homePath} replace />;
  }

  if (!canAccessBusinessRoute(profile?.business_type, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (
    isRolePermissionFilterActive
    && !canAccessRolePath({
      role: organizationRole,
      businessType,
      pathname: location.pathname,
    })
  ) {
    return <Navigate to={homePath === location.pathname ? "/dashboard" : homePath} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
      {/* Rota pública — landing page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/matricula" element={<EnrollmentUnavailablePage />} />
      <Route path="/agendar" element={<OnlineBookingPage />} />
      <Route path="/agendamento" element={<OnlineBookingPage />} />
      <Route path="/portal-aluno" element={<StudentPortalPage />} />
      {/* Auth */}
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {/* App protegido */}
      <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/calendario" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/alunos" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
      <Route path="/alunos/:id" element={<ProtectedRoute><StudentProfilePage /></ProtectedRoute>} />
      <Route path="/presenca" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
      <Route path="/planos" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
      <Route path="/pagamentos" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
      <Route path="/despesas" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/produtos" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
      <Route path="/vendas" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
      <Route path="/aniversariantes" element={<ProtectedRoute><BirthdaysPage /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/comunicacao" element={<ProtectedRoute><CommunicationPage /></ProtectedRoute>} />
      <Route path="/contratos" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
      <Route path="/modalidades" element={<ProtectedRoute><ModalitiesPage /></ProtectedRoute>} />
      <Route path="/turmas" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      {/* Arena-specific routes */}
      <Route path="/quadras" element={<ProtectedRoute><CourtsPage /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><ArenaAgendaPage /></ProtectedRoute>} />
      <Route path="/reservantes" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
      <Route path="/comandas" element={<ProtectedRoute><ComandasPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <PWABadge />
          <AppErrorBoundary>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutes />
            </BrowserRouter>
          </AppErrorBoundary>
          <Analytics />
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
