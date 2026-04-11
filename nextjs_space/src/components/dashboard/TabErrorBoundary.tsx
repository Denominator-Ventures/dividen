'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  tabName: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[TabErrorBoundary] ${this.props.tabName} crashed:`, error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-heading font-bold text-[var(--text-primary)] mb-2">
              {this.props.tabName} hit an error
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Something went wrong rendering this tab. Your other tabs are unaffected.
            </p>
            {this.state.error && (
              <pre className="text-xs text-red-400/70 bg-red-500/5 rounded-lg p-3 mb-4 text-left overflow-auto max-h-32 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/25 transition-colors"
            >
              🔄 Reload this tab
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
