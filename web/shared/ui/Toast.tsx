import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-l-[3px] border-l-success',
  error: 'border-l-[3px] border-l-error',
  info: 'border-l-[3px] border-l-gold',
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: number) => void }> = ({
  toast,
  onRemove,
}) => {
  const [exiting, setExiting] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={[
        'px-4 py-3 rounded-[var(--radius-input)] bg-elevated text-primary text-[15px]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        'transition-all duration-300',
        variantStyles[toast.variant],
        exiting ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0',
      ].join(' ')}
      style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
    >
      {toast.message}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed top-0 left-0 right-0 flex flex-col items-center gap-2 pt-[calc(env(safe-area-inset-top,0px)+12px)] px-4 pointer-events-none"
        style={{ zIndex: 'var(--z-toast)' as unknown as number }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
