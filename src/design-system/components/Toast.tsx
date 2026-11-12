'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'info' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container with ARIA live region positioned in top-right corner */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 md:top-6 right-4 md:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
            info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
            error: <XCircle className="w-5 h-5 text-red-600 shrink-0" />,
          };

          const variants = {
            success: 'border-emerald-300 border-l-4 border-l-emerald-600 bg-white text-charcoal',
            warning: 'border-amber-300 border-l-4 border-l-amber-600 bg-white text-charcoal',
            info: 'border-blue-300 border-l-4 border-l-blue-600 bg-white text-charcoal',
            error: 'border-red-300 border-l-4 border-l-red-600 bg-white text-charcoal',
          };

          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start justify-between gap-3 p-3.5 sm:p-4 rounded-xl border shadow-elevated transition-all duration-200 animate-in fade-in slide-in-from-top-2',
                variants[t.type]
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 shrink-0">{icons[t.type]}</div>
                <p className="text-xs sm:text-sm font-semibold text-charcoal leading-snug break-words">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-steel-grey-400 hover:text-charcoal p-1 rounded-lg hover:bg-steel-grey-100 transition-colors shrink-0 -mr-1 -mt-1"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

