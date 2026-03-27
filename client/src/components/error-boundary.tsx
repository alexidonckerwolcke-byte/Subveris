import React, { ReactNode, ReactElement } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component to catch React errors
 * Prevents the entire app from crashing when a component fails
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetCount = 0;
  private resetTimer: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Error Boundary] Caught error:', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Optional: Send error to logging service
    // logErrorToService(error, info);
  }

  handleRetry = () => {
    this.resetCount++;

    // Prevent infinite retry loops
    if (this.resetCount > 3) {
      console.error('[Error Boundary] Too many retry attempts');
      return;
    }

    // Reset with a timer to prevent rapid retries
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      this.setState({ hasError: false, error: null });
      this.resetCount = 0;
    }, 1000);
  };

  renderDefaultFallback = (error: Error) => (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full mx-auto p-6 space-y-4">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <h1 className="text-lg font-semibold text-destructive mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            An unexpected error occurred. Please try again.
          </p>
          <details className="text-xs text-muted-foreground mb-4 p-2 bg-muted rounded">
            <summary className="cursor-pointer font-medium mb-2">
              Error details (for debugging)
            </summary>
            <pre className="overflow-auto whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
          <button
            onClick={this.handleRetry}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full mt-2 px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );

  render(): ReactElement {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return <>{this.props.fallback(this.state.error, this.handleRetry)}</>;
      }
      return <>{this.renderDefaultFallback(this.state.error)}</>;
    }

    return <>{this.props.children}</>;
  }
}

/**
 * Hook to throw an error that will be caught by the nearest Error Boundary
 * Useful for handling errors in event handlers or async code
 */
export function useErrorHandler() {
  return (error: Error | string) => {
    throw typeof error === 'string' ? new Error(error) : error;
  };
}
