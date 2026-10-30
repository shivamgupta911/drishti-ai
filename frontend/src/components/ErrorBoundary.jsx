import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

/**
 * Enterprise React Error Boundary
 * Prevents application-wide white screen by catching render-phase and lifecycle exceptions
 * in child components and rendering a clean, actionable fallback state.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Drishti AI ErrorBoundary caught exception]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-8 sm:p-12 max-w-3xl mx-auto my-8 rounded-2xl bg-white border border-[#DDE3E1] shadow-xs text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-[#FDF6E2] border border-[#F5D698] text-[#A96512] flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#202B35] tracking-tight">
              {this.props.title || 'Component Encountered an Unexpected Issue'}
            </h2>
            <p className="text-xs sm:text-sm text-[#65717D] max-w-lg mx-auto leading-relaxed">
              {this.props.description || 'An unexpected rendering error occurred in this view. Your session data remains safe.'}
            </p>
          </div>

          {this.state.error && (
            <div className="p-3.5 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1] text-[11px] font-mono text-[#BD4148] text-left overflow-x-auto max-h-32">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>

            {this.props.onNavigateHome && (
              <button
                onClick={this.props.onNavigateHome}
                className="px-4 py-2 rounded-lg bg-white hover:bg-[#F5F6F3] border border-[#DDE3E1] text-[#202B35] text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#65717D]" />
                <span>Return to Match Studio</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
