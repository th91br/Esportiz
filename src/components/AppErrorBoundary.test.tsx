import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

const recoveryMocks = vi.hoisted(() => ({
  hasAttemptedAppRecovery: vi.fn(),
  isDynamicImportLoadError: vi.fn(),
  recoverAppRuntime: vi.fn(),
}));

vi.mock('@/lib/appRecovery', () => recoveryMocks);

function ThrowingChild({ error }: { error: Error }) {
  throw error;
  return null;
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    recoveryMocks.hasAttemptedAppRecovery.mockReturnValue(false);
    recoveryMocks.isDynamicImportLoadError.mockReturnValue(false);
    recoveryMocks.recoverAppRuntime.mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('automatically starts recovery for a dynamic import loading error', async () => {
    recoveryMocks.isDynamicImportLoadError.mockReturnValue(true);

    render(
      <AppErrorBoundary>
        <ThrowingChild error={new Error('Failed to fetch dynamically imported module: /src/pages/Index.tsx')} />
      </AppErrorBoundary>,
    );

    await waitFor(() => {
      expect(recoveryMocks.recoverAppRuntime).toHaveBeenCalledWith();
    });

    expect(screen.getByRole('button', { name: 'Corrigindo...' })).toBeDisabled();
    expect(screen.queryByText(/Failed to fetch dynamically imported module/)).not.toBeInTheDocument();
    expect(screen.getByText(/Código do erro:/)).toBeInTheDocument();
  });

  it('lets the user force a full runtime recovery after an attempted recovery', async () => {
    recoveryMocks.hasAttemptedAppRecovery.mockReturnValue(true);

    render(
      <AppErrorBoundary>
        <ThrowingChild error={new Error('Falha ao carregar tela')} />
      </AppErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar recarregar' }));

    expect(recoveryMocks.recoverAppRuntime).toHaveBeenCalledWith({ force: true });
    expect(screen.getByRole('button', { name: 'Recarregando...' })).toBeDisabled();
  });
});
