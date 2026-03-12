import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { Toast, ToastProps } from '../components/Toast.tsx';

type ToastOptions = Omit<ToastProps, 'id' | 'onDismiss'>;

interface ToastContextType {
    showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const showToast = useCallback((options: ToastOptions) => {
        const id = Date.now();
        const onDismiss = () => {
            setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
        };
        setToasts(currentToasts => [...currentToasts, { ...options, id, onDismiss }]);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-5 right-5 z-[100] space-y-2">
                {toasts.map(toast => (
                    <Toast key={toast.id} {...toast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
