'use client';
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  tabName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: '24px', background: '#1a202c', borderRadius: '8px', border: '1px solid #e53e3e', color: '#fc8181' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
            {this.props.tabName ? `Error in ${this.props.tabName}` : 'Something went wrong'}
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#a0aec0', margin: 0 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '12px', padding: '6px 16px', background: '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
