import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Terjadi kesalahan pada aplikasi.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F2744] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
            <h1 className="font-display text-xl font-bold text-[#0F2744]">
              Terjadi Gangguan Aplikasi
            </h1>
            <p className="text-sm text-[#475569] leading-relaxed">
              Aplikasi mengalami kesalahan saat memproses data. Muat ulang halaman untuk mencoba
              kembali.
            </p>
            {this.state.errorMessage && (
              <p className="text-xs font-mono text-[#B91C1C] bg-[#B91C1C]/5 border border-[#B91C1C]/20 rounded-lg p-3 break-words">
                {this.state.errorMessage}
              </p>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#0B1E36] rounded-lg transition-colors cursor-pointer"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
