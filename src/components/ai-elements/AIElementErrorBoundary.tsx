"use client";

import React, { Component, type ReactNode } from "react";

interface AIElementErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface AIElementErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for AI Elements
 * Catches and handles errors in AI component rendering
 */
export class AIElementErrorBoundary extends Component<
  AIElementErrorBoundaryProps,
  AIElementErrorBoundaryState
> {
  constructor(props: AIElementErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): AIElementErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("AI Element Error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="my-4 rounded-md border border-red-700/60 bg-red-900/20 p-4">
          <p className="text-sm text-red-400">
            Failed to render AI component. Please try again.
          </p>
          {this.state.error && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-red-400/80">
                Error details
              </summary>
              <pre className="mt-2 overflow-auto text-xs text-red-400/60">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
