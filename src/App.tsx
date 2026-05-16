import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PWABadge } from "@/components/PWABadge";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import CalendarPage from "./pages/CalendarPage";
import StudentsPage from "./pages/StudentsPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import AttendancePage from "./pages/AttendancePage";
import PlansPage from "./pages/PlansPage";
import ReportsPage from "./pages/ReportsPage";
import PaymentsPage from "./pages/PaymentsPage";
import BirthdaysPage from "./pages/BirthdaysPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OnboardingPage from "./pages/OnboardingPage";
import SettingsPage from "./pages/SettingsPage";
import ModalitiesPage from "./pages/ModalitiesPage";
import GroupsPage from "./pages/GroupsPage";
import CommunicationPage from "./pages/CommunicationPage";
import ExpensesPage from "./pages/ExpensesPage";
import ProductsPage from "./pages/ProductsPage";
import SalesPage from "./pages/SalesPage";
import NotFound from "./pages/NotFound";
import CourtsPage from "./pages/CourtsPage";
import ArenaAgendaPage from "./pages/ArenaAgendaPage";
import ComandasPage from "./pages/ComandasPage";
import ContractsPage from "./pages/ContractsPage";
import EnrollmentPage from "./pages/EnrollmentPage";
import StudentPortalPage from "./pages/StudentPortalPage";
import OnlineBookingPage from "./pages/OnlineBookingPage";
import { useProfile } from "./hooks/queries/useProfile";
import { getAuthenticatedHomePath } from "./lib/authRouting";


const queryClient = new QueryClient();
function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function LoginRoute() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loadingProfile, isErrorProfile, errorProfile } = useProfile();

  if (isErrorProfile) {
    throw new Error(`Falha ao carregar o perfil: ${(errorProfile as any)?.message || 'Erro desconhecido'}`);
  }

  if (authLoading || (user && loadingProfile)) {
    return <FullScreenLoader />;
  }

  if (user) {
    return <Navigate to={getAuthenticatedHomePath(profile)} replace />;
  }

  return <LoginPage />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { profile, loadingProfile, isErrorProfile, errorProfile } = useProfile();

  if (isErrorProfile) {
    throw new Error(`Falha ao carregar o perfil: ${(errorProfile as any)?.message || 'Erro desconhecido'}`);
  }

  if (authLoading || (user && loadingProfile)) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login?mode=login" replace />;
  }

  const isOnboardingRoute = location.pathname === "/onboarding";
  const homePath = getAuthenticatedHomePath(profile);

  if (homePath === "/onboarding" && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (homePath !== "/onboarding" && isOnboardingRoute) {
    return <Navigate to={homePath} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Rota pública — landing page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/matricula" element={<EnrollmentPage />} />
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
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
