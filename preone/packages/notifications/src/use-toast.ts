import { useToastContext, type ToastData, type ToastVariant } from './toast-provider.js';

/**
 * Return type of the useToast hook.
 */
export interface UseToastReturn {
  /** Show a toast notification */
  toast: (data: {
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
    actionLabel?: string;
    onAction?: () => void;
  }) => string;
  /** Dismiss a specific toast by ID */
  dismiss: (id: string) => void;
  /** Dismiss all active toasts */
  dismissAll: () => void;
  /** Update an existing toast */
  update: (id: string, data: Partial<ToastData>) => void;
  /** Current active toasts */
  toasts: ToastData[];
}

/**
 * PreOne useToast hook — primary interface for showing toast notifications.
 * Must be used within a ToastProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { toast, dismiss, toasts } = useToast();
 *
 *   const handleSave = () => {
 *     toast({
 *       title: 'Saved!',
 *       description: 'Your changes have been saved.',
 *       variant: 'success',
 *     });
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 */
export function useToast(): UseToastReturn {
  const { toast, dismiss, dismissAll, update, toasts } = useToastContext();

  return {
    toast,
    dismiss,
    dismissAll,
    update,
    toasts,
  };
}
