// =============================================================================
// 📘 FILE: components/ErrorBoundary.tsx
// =============================================================================
// 🎯 PURPOSE: Catches JavaScript errors in the component tree below it, logs
//    them, and displays a fallback UI instead of crashing the whole app.
//
// 🧠 REACT CONCEPT: Error Boundaries (the ONLY place you need class components)
//    In React, if a component throws an error during rendering, the ENTIRE
//    app unmounts (white screen of death). Error boundaries catch these errors
//    and let you show a fallback UI instead.
//
//    IMPORTANT: React hooks (useState, useEffect) DON'T support error boundaries.
//    They're only available in CLASS COMPONENTS using `componentDidCatch` and
//    `getDerivedStateFromError`. These are the ONLY two lifecycle methods that
//    exist as class component holdouts — everything else can be done with hooks.
//
//    This is why ErrorBoundary is a class, not a function component.
//
// 💡 When an error is caught:
//    1. getDerivedStateFromError updates state → triggers re-render
//    2. render() checks hasError → shows fallback UI instead of children
//    3. User clicks "Retry" → resets error state → re-renders children
//
// 🔧 HOW TO ALTER:
//    - Change the fallback UI: modify the render() return when hasError is true
//    - Add error logging: add a componentDidCatch(error, info) method
//    - Make it show different fallbacks per error type: check error.message
// =============================================================================

'use client';
import { Component, ReactNode } from 'react';
// 🧠 Component — Base class for React class components. You extend it.
//    Think of it as: `class MyComponent extends Component<Props, State>`
//    The type parameters tell TypeScript what the props and state look like.

interface Props {
  children: ReactNode;
  fallback?: ReactNode;   // Optional custom fallback UI
  tabName?: string;        // Optional: name of the tab/section for the error message
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// 🧠 `class ErrorBoundary extends Component<Props, State>`
//    In a class component:
//    - `this.props` = the Props object
//    - `this.state` = the State object
//    - `this.setState()` = update state (triggers re-render, like the setter from useState)
//    - `render()` = returns JSX (like the return of a function component)
export default class ErrorBoundary extends Component<Props, State> {
  // 🧠 constructor(props) — Runs when the component is first created.
  //    Must call super(props) to set up the React internals.
  //    Then set the initial state.
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // 🧠 static getDerivedStateFromError(error) — A "static" lifecycle method.
  //    "static" means it doesn't have access to `this` (no props, no state
  //    directly). It just receives the error and returns the new state.
  //
  //    React calls this when a child component throws during rendering.
  //    You return the updated state object to tell React "show the fallback."
  //
  //    💡 This is like: useEffect's cleanup + setError combined, but for errors.
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // 🧠 render() — Returns JSX, just like a function component's return.
  //    If hasError is true, show the error fallback instead of children.
  render() {
    if (this.state.hasError) {
      // If a custom fallback was provided as a prop, use that
      if (this.props.fallback) return this.props.fallback;

      // Default fallback UI:
      return (
        <div style={{ padding: '24px', background: '#1a202c', borderRadius: '8px', border: '1px solid #e53e3e', color: '#fc8181' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
            {this.props.tabName ? `Error in ${this.props.tabName}` : 'Something went wrong'}
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#a0aec0', margin: 0 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          {/* 🧠 "Retry" button: resets hasError to false, which makes render()
              show children again. React will try to re-render them. If the error
              persists, getDerivedStateFromError will catch it again. */}
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '12px', padding: '6px 16px', background: '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
            Retry
          </button>
        </div>
      );
    }
    // No error — render children normally
    return this.props.children;
  }
}
