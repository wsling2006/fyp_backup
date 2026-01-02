'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastType } from '@/components/Toast';

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [nextId, setNextId] = useState(0);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = nextId;
    setNextId((prev) => prev + 1);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, [nextId]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Only show the most recent toast in center */}
      {toasts.length > 0 && (
        <Toast
          message={toasts[toasts.length - 1].message}
          type={toasts[toasts.length - 1].type}
          onClose={() => removeToast(toasts[toasts.length - 1].id)}
        />
      )}
    </ToastContext.Provider>
  );
};
