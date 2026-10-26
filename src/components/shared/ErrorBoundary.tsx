import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** What to show instead of the broken part */
  fallback: (error: Error) => ReactNode;
  onError?: (error: Error) => void;
  children: ReactNode;
}
interface ErrorBoundaryState { error: Error | null }

/** Catches a crash inside its children so one broken part can't blank the whole page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
    this.props.onError?.(error);
  }

  render(): ReactNode {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}
