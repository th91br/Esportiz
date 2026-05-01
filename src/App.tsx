import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PWABadge } from "@/components/PWABadge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import NotFound from "./pages/NotFound";
import { useProfile } from "./hooks/queries/useProfile";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loadingProfile } = useProfile();

  if (authLoading || (user && loadingProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not completed and not already on onboarding
  if (!profile?.onboarding_completed && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect to dashboard if onboarding is completed but user tries to access onboarding
  if (profile?.onboarding_completed && window.location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Rota pública — landing page */}
      <Route path="/" element={<LandingPage />} />
      {/* Auth */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
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
      <Route path="/aniversariantes" element={<ProtectedRoute><BirthdaysPage /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/comunicacao" element={<ProtectedRoute><CommunicationPage /></ProtectedRoute>} />
      <Route path="/modalidades" element={<ProtectedRoute><ModalitiesPage /></ProtectedRoute>} />
      <Route path="/turmas" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
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
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRoutes />
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
