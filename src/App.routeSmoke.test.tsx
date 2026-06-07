import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { AppRoutes } from "./App";

const authMock = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  loading: false,
  signOut: vi.fn(),
}));

const profileMock = vi.hoisted(() => ({
  profile: {
    business_type: "arena",
    ct_name: "Arena Esportiz",
    onboarding_completed: true,
    organization_id: "org-1",
  },
  loadingProfile: false,
  isErrorProfile: false,
  errorProfile: null,
}));

vi.mock("@/contexts/auth", () => ({
  useAuth: () => authMock,
}));

vi.mock("./hooks/queries/useProfile", () => ({
  useProfile: () => profileMock,
}));

vi.mock("@/hooks/useBusinessContext", () => ({
  useBusinessContext: () => ({
    businessType: "arena",
    organizationRole: "owner",
    hasActiveOrganizationAccess: true,
    isLoadingOrganizationRole: false,
    isRolePermissionFilterActive: false,
    isRoleKnown: true,
  }),
}));

vi.mock("@/components/PWABadge", () => ({
  PWABadge: () => null,
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => null,
}));

vi.mock("./pages/LoginPage", () => ({
  default: () => <main data-testid="route-login">Login Esportiz</main>,
}));

vi.mock("./pages/Index", () => ({
  default: () => <main data-testid="route-dashboard">Dashboard Esportiz</main>,
}));

vi.mock("./pages/ArenaAgendaPage", () => ({
  default: () => <main data-testid="route-agenda">Agenda Esportiz</main>,
}));

vi.mock("./pages/ComandasPage", () => ({
  default: () => <main data-testid="route-comandas">Comandas Esportiz</main>,
}));

vi.mock("./pages/SettingsPage", () => ({
  default: () => <main data-testid="route-settings">Configuracoes Esportiz</main>,
}));

vi.mock("./pages/PaymentsPage", () => ({
  default: () => <main data-testid="route-payments">Pagamentos Esportiz</main>,
}));

function renderRoute(pathname: string) {
  return render(
    <AppErrorBoundary>
      <MemoryRouter initialEntries={[pathname]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </MemoryRouter>
    </AppErrorBoundary>,
  );
}

function expectNoAppErrorBoundary() {
  expect(screen.queryByText(/carregar esta tela/i)).not.toBeInTheDocument();
}

describe("critical route smoke tests", () => {
  beforeEach(() => {
    authMock.user = { id: "user-1" };
    authMock.loading = false;
    authMock.signOut.mockClear();
    profileMock.profile = {
      business_type: "arena",
      ct_name: "Arena Esportiz",
      onboarding_completed: true,
      organization_id: "org-1",
    };
    profileMock.loadingProfile = false;
    profileMock.isErrorProfile = false;
    profileMock.errorProfile = null;
  });

  it.each([
    ["/dashboard", "route-dashboard"],
    ["/agenda", "route-agenda"],
    ["/comandas", "route-comandas"],
    ["/configuracoes", "route-settings"],
    ["/pagamentos", "route-payments"],
  ])("renders protected critical route %s without the app error boundary", async (pathname, testId) => {
    renderRoute(pathname);

    expect(await screen.findByTestId(testId)).toBeInTheDocument();
    expectNoAppErrorBoundary();
  });

  it("renders login when the user is unauthenticated", async () => {
    authMock.user = null;

    renderRoute("/login");

    expect(await screen.findByTestId("route-login")).toBeInTheDocument();
    expectNoAppErrorBoundary();
  });

  it("redirects unauthenticated users from protected routes to login", async () => {
    authMock.user = null;

    renderRoute("/dashboard");

    expect(await screen.findByTestId("route-login")).toBeInTheDocument();
    expectNoAppErrorBoundary();
  });
});
