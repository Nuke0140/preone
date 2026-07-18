'use client';

import { useToastContext } from '../components/ToastProvider';

/**
 * Hook to access toast functionality.
 * Must be used within a <ToastProvider>.
 */
export function useToast() {
  const ctx = useToastContext();

  return {
    /** Show an info toast */
    info: ctx.toast.info,
    /** Show a success toast */
    success: ctx.toast.success,
    /** Show a warning toast */
    warning: ctx.toast.warning,
    /** Show an error toast */
    error: ctx.toast.error,
    /** Dismiss a specific toast by ID */
    dismiss: ctx.dismiss,
    /** Dismiss all active toasts */
    dismissAll: ctx.dismissAll,
    /** Current toast list */
    toasts: ctx.toasts,
  };
}
