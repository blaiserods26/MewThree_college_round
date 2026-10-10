import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, CircleX, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToasts((prev) => {
      // Deduplicate recent identical messages
      if (prev.some((t) => t.message === message)) return prev;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return [...prev, { id, type, message }];
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.message !== message));
    }, 4500);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pw-toast-container">
        {toasts.map((toast) => {
          let Icon = Info;
          let iconColor = 'var(--pw-info)';
          if (toast.type === 'success') {
            Icon = CheckCircle2;
            iconColor = 'var(--pw-success)';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            iconColor = 'var(--pw-warning)';
          } else if (toast.type === 'error') {
            Icon = CircleX;
            iconColor = 'var(--pw-danger)';
          }

          return (
            <div key={toast.id} className="pw-toast">
              <Icon size={16} color={iconColor} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, wordBreak: 'break-word' }}>{toast.message}</div>
              <button
                onClick={() => dismiss(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--pw-text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
