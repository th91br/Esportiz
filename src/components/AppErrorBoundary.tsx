import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  hasAttemptedAppRecovery,
  isDynamicImportLoadError,
  recoverAppRuntime,
} from '@/lib/appRecovery';
import { reportError } from '@/lib/observability';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorId: string | null;
  isRecovering: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, errorId: null, isRecovering: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const event = reportError('react.render_failed', error, {
      componentStack: info.componentStack,
    });
    this.setState({ errorId: event.id });

    if (isDynamicImportLoadError(error) && !hasAttemptedAppRecovery()) {
      this.setState({ isRecovering: true });
      void recoverAppRuntime();
    }
  }

  handleRecovery = async () => {
    this.setState({ isRecovering: true });
    await recoverAppRuntime({ force: true });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const attempted = hasAttemptedAppRecovery();

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Não foi possível carregar esta tela
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {attempted 
              ? "Já tentamos recuperar o app automaticamente. Clique abaixo para limpar caches novamente e buscar a versão atual."
              : "Ocorreu um erro inesperado. Clique abaixo para tentar corrigir e atualizar o app."}
          </p>
          
          {this.state.errorId && (
            <p className="mt-3 text-xs text-muted-foreground">
              Código do erro: <span className="font-mono">{this.state.errorId}</span>
            </p>
          )}
          
          {!attempted ? (
            <Button
              className="mt-5 w-full btn-primary-gradient gap-2"
              onClick={() => void this.handleRecovery()}
              disabled={this.state.isRecovering}
            >
              <RefreshCw className="h-4 w-4" />
              {this.state.isRecovering ? 'Corrigindo...' : 'Corrigir e atualizar app'}
            </Button>
          ) : (
            <Button
              className="mt-5 w-full btn-primary-gradient gap-2"
              onClick={() => void this.handleRecovery()}
              disabled={this.state.isRecovering}
            >
              <RefreshCw className="h-4 w-4" />
              {this.state.isRecovering ? 'Recarregando...' : 'Tentar recarregar'}
            </Button>
          )}
        </div>
      </div>
    );
  }
}
