'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Aqui você pode enviar para um serviço de monitoramento
    // como Sentry, LogRocket, etc.
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-4">
          <div className="max-w-md w-full bg-neutral-900 rounded-lg border border-neutral-800 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-red-400 mb-4">
              Ops! Algo deu errado
            </h2>
            <p className="text-neutral-300 mb-4">
              Ocorreu um erro inesperado na aplicação.
            </p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-neutral-400 hover:text-neutral-200">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 text-xs bg-neutral-950 p-3 rounded border border-neutral-800 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
