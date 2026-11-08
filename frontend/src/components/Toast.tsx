import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ToastItem {
  id: number;
  type: 'success' | 'error';
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((type: ToastItem['type'], message: string) => {
    const id = nextId.current++;
    setItems((current) => [...current, { id, type, message }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4000);
  }, []);

  const value = useMemo(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-4 top-4 z-70 flex flex-col items-end gap-2 sm:left-auto" aria-live="polite">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`animate-toast flex w-full max-w-sm items-start gap-2 rounded-lg border bg-white p-3 text-sm shadow-lg ${
              item.type === 'success' ? 'border-teal-300 text-teal-900' : 'border-red-300 text-red-900'
            }`}
          >
            {item.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-700" aria-hidden />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-red-700" aria-hidden />
            )}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
