/**
 * @preone/ui — ErrorDialog Component
 *
 * A pre-built error dialog with an error icon, title, message,
 * and retry/close buttons. Provides a consistent error feedback experience.
 *
 * Features:
 * - **Error icon**: Prominent destructive-coloured icon
 * - **Title, message**: Structured error content
 * - **Retry/Close buttons**: Optional retry action
 * - **Controlled**: Open state managed by the consumer
 * - **forwardRef**: Full ref forwarding support (via Dialog)
 * - **ARIA**: Complete accessibility via Radix Dialog primitives
 * - **Design tokens**: All colours via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { ErrorDialog } from '@preone/ui/feedback';
 *
 * const [open, setOpen] = React.useState(false);
 *
 * <ErrorDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Failed to save"
 *   message="An unexpected error occurred. Please try again."
 *   onRetry={handleRetry}
 *   retryLabel="Retry"
 * />
 * ```
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './dialog.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ErrorDialog} component.
 */
export interface ErrorDialogProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>, 'children'> {
  /** Dialog title — e.g. "Failed to save". */
  title: string;

  /** Dialog message — e.g. "An unexpected error occurred." */
  message?: string;

  /** Callback when the retry button is clicked. When provided, a retry button is shown. */
  onRetry?: () => void;

  /** Label for the retry button. */
  retryLabel?: string;

  /** Label for the close button. */
  closeLabel?: string;

  /**
   * When `true`, the retry button shows a loading spinner and is disabled.
   *
   * @default false
   */
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne ErrorDialog — a pre-built error feedback dialog.
 *
 * **Accessibility:**
 * - Built on @radix-ui/react-dialog for focus trapping and scroll lock
 * - Error icon is `aria-hidden="true"` (decorative)
 * - Dialog has `role="alertdialog"` via Radix
 *
 * @param props - All ErrorDialogProps.
 *
 * @example
 * ```tsx
 * <ErrorDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Failed to save"
 *   message="Please try again."
 *   onRetry={handleRetry}
 * />
 * ```
 */
export const ErrorDialog: React.FC<ErrorDialogProps> = ({
  open,
  onOpenChange,
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
  closeLabel = 'Close',
  loading = false,
  ...props
}) => (
  <Dialog open={open} onOpenChange={onOpenChange} {...props}>
    <DialogContent size="sm">
      <div className="flex flex-col items-center gap-4 py-4">
        {/* Error icon */}
        <div
          className={cn(
            'flex items-center justify-center',
            'h-16 w-16 rounded-[var(--radius-full)]',
            'bg-[var(--color-destructive)]/15',
          )}
          aria-hidden="true"
        >
          <AlertCircle
            className="h-8 w-8 text-[var(--color-destructive)]"
            strokeWidth={2}
          />
        </div>

        <DialogHeader className="items-center text-center">
          <DialogTitle>{title}</DialogTitle>
          {message && <DialogDescription>{message}</DialogDescription>}
        </DialogHeader>
      </div>

      <DialogFooter className="justify-center">
        <DialogClose asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center',
              'h-10 px-6',
              'text-sm font-medium',
              'rounded-[var(--radius-lg)]',
              'border border-[var(--color-border)]',
              'bg-transparent text-[var(--color-foreground)]',
              'hover:bg-[var(--color-muted)]',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
            )}
            disabled={loading}
          >
            {closeLabel}
          </button>
        </DialogClose>
        {onRetry && (
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center gap-2',
              'h-10 px-6',
              'text-sm font-medium',
              'rounded-[var(--radius-lg)]',
              'bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]',
              'hover:bg-[var(--color-destructive)]/90',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-destructive)]',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
            onClick={onRetry}
            disabled={loading}
            aria-busy={loading || undefined}
          >
            {loading && (
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {retryLabel}
          </button>
        )}
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

ErrorDialog.displayName = 'ErrorDialog';
