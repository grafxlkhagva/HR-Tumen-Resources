'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class LegalErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  componentDidCatch(error: unknown) {
    console.error('[LegalErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-amber-900">
            {this.props.fallbackLabel ?? 'Хэсгийг ачаалахад алдаа гарлаа'}
          </p>
          {this.state.message && (
            <p className="text-xs text-amber-700 mt-1 font-mono">{this.state.message}</p>
          )}
          <button
            onClick={() => this.setState({ hasError: false, message: undefined })}
            className="mt-3 text-xs text-amber-700 underline hover:text-amber-900"
          >
            Дахин оролдох
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
