import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Global Error Boundary — catches unhandled React rendering errors
 * and displays a recovery UI instead of a blank screen.
 *
 * Wrap around route content or the entire app.
 *
 * @example
 *   <ErrorBoundary>
 *     <Dashboard />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console in development — could forward to a service in production
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-dark to-green-primary p-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h2>

            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              An unexpected error occurred while rendering this page. You can try
              refreshing, or go back to a previous page.
            </p>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                  Error Details (dev only)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-red-700 overflow-auto max-h-40 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-primary text-white rounded-lg font-medium text-sm hover:bg-green-dark transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                onClick={() => (window.location.href = "/")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
