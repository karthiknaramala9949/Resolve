import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, Download, RefreshCw, Trash2 } from 'lucide-react';
import { exportFullBackup } from '@/lib/utils/exportBackup';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isExporting: boolean;
  isResetting: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isExporting: false,
      isResetting: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RESOLVE-ONE Uncaught Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleExport = async () => {
    this.setState({ isExporting: true });
    try {
      await exportFullBackup();
    } catch (err) {
      console.error('Backup export failed during error recovery:', err);
      alert('Direct export failed. Please try reloading or clearing application cache.');
    } finally {
      this.setState({ isExporting: false });
    }
  };

  handleReset = async () => {
    if (
      window.confirm(
        'Are you sure you want to reset local storage? This will clear all dispute cases on this device. (Make sure you export a backup first).'
      )
    ) {
      this.setState({ isResetting: true });
      try {
        indexedDB.deleteDatabase('resolve-one-v2');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      } catch (err) {
        console.error('Failed to reset storage:', err);
        window.location.reload();
      }
    }
  };

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-light-ground dark:bg-surface-dark-ground text-neutral-900 dark:text-neutral-100 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white dark:bg-surface-dark rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-serif">Data Recovery & Self-Repair</h1>
                <p className="text-xs text-neutral-500">
                  RESOLVE-ONE encountered an unexpected storage or runtime interruption.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <p className="font-semibold text-sm mb-1">Your data is stored safely on your device</p>
              Your local database records have not been deleted. You can export a full JSON backup right now, retry loading, or reset storage if the database is corrupted.
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={this.handleExport}
                disabled={this.state.isExporting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors shadow-2xs"
              >
                <Download className="w-4 h-4" />
                <span>{this.state.isExporting ? 'Exporting...' : 'Export Full JSON Backup (Safe First Step)'}</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-medium text-xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Application</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleReset}
                  disabled={this.state.isResetting}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 font-medium text-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset / Repair DB</span>
                </button>
              </div>
            </div>

            {this.state.error && (
              <details className="text-xs text-neutral-500 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                <summary className="cursor-pointer font-medium hover:text-neutral-700 dark:hover:text-neutral-300">
                  Technical Diagnostic Details
                </summary>
                <pre className="mt-2 p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg overflow-x-auto font-mono text-[11px] text-red-600 dark:text-red-400">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

