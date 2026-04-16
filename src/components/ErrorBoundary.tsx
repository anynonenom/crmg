import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const errObj = JSON.parse(this.state.error?.message || "{}");
        if (errObj.error) {
          message = `Firestore Error: ${errObj.error} (${errObj.operationType} on ${errObj.path})`;
        }
      } catch (e) {
        message = this.state.error?.message || message;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-cream p-4">
          <div className="card max-w-md w-full text-center space-y-4">
            <div className="text-coral text-4xl font-bold">!</div>
            <h1 className="text-xl font-bold text-ink">Application Error</h1>
            <p className="text-sm text-gray-500">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-coral w-full"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
