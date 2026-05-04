import { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext.tsx';

export function useAsyncAction() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();

    const run = useCallback(async (
        action: () => Promise<void>,
        fallbackErrorMsg?: string,
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            await action();
            return true;
        } catch (err: any) {
            const msg = err?.message || fallbackErrorMsg || 'An error occurred.';
            setError(msg);
            showToast({ message: msg, type: 'error' });
            return false;
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    return { run, loading, error };
}
