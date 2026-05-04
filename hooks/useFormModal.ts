import React, { useState, useCallback } from 'react';

/**
 * Shared modal form state: isSubmitting, error, and submit/action wrappers.
 *
 * handleSubmit(action) — wraps a <form onSubmit> handler. Prevents default,
 *   runs action (sync or async), auto-closes on success, sets error on throw.
 *
 * runAction(action, autoClose?) — wraps a click handler with the same
 *   loading/error lifecycle. autoClose defaults to true.
 */
export function useFormModal(onClose: () => void) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => setError(null), []);

    const handleSubmit = useCallback(
        (action: () => void | Promise<void>) =>
            async (e: React.FormEvent) => {
                e.preventDefault();
                setError(null);
                setIsSubmitting(true);
                try {
                    await action();
                    onClose();
                } catch (err: any) {
                    setError(err?.message ?? 'An unexpected error occurred.');
                } finally {
                    setIsSubmitting(false);
                }
            },
        [onClose],
    );

    const runAction = useCallback(
        (action: () => void | Promise<void>, autoClose = true) =>
            async () => {
                setError(null);
                setIsSubmitting(true);
                try {
                    await action();
                    if (autoClose) onClose();
                } catch (err: any) {
                    setError(err?.message ?? 'An unexpected error occurred.');
                } finally {
                    setIsSubmitting(false);
                }
            },
        [onClose],
    );

    return { isSubmitting, error, clearError, handleSubmit, runAction };
}
