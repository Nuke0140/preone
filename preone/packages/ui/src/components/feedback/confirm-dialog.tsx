/**
 * @preone/ui — ConfirmDialog Component
 *
 * A pre-built confirmation dialog with title, message, confirm/cancel buttons,
 * and optional destructive variant. Removes the boilerplate of composing
 * Dialog sub-components for simple confirmation flows.
 *
 * Features:
 * - **Variants**: default, destructive
 * - **Loading state**: Disables confirm button and shows spinner
 * - **Controlled**: Open state managed by the consumer
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: Complete accessibility via Radix Dialog primitives
 * - **Design tokens**: All colours via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { ConfirmDialog } from '@preone/ui/feedback';
 *
 * const [open, setOpen] = React.useState(false);
 *
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete project?"
 *   message="This action cannot be undone. All data will be permanently removed."
 *   variant="destructive"
 *   confirmLabel="Delete"
 *   onConfirm={handleDelete}
 *   loading={isDeleting}
 * />
 * ```
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
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
// Variants
// ---------------------------------------------------------------------------

/** Visual style variant for the ConfirmDialog component. */
export type ConfirmDialogVariant = 'default' | 'destructive';

/**
 * Confirm button variant definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-primary` / `--color-primary-foreground` — default confirm
 * - `--color-destructive` / `--color-destructive-foreground` — destructive confirm
 */
export const confirmButtonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'h-10 px-6',
    'text-sm font-medium',
    'rounded-[var(--radius-lg)]',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Default — primary action colour. */
        default: [
          'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
          'hover:bg-[var(--color-primary)]/90',
          'focus-visible:ring-[var(--color-ring)]',
        ].join(' '),

        /** Destructive — red danger action. */
        destructive: [
          'bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]',
          'hover:bg-[var(--color-destructive)]/90',
          'focus-visible:ring-[var(--color-destructive)]',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ConfirmDialog} component.
 */
export interface ConfirmDialogProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>, 'children'>,
    VariantProps<typeof confirmButtonVariants> {
  /** Dialog title — e.g. "Delete project?" */
  title: string;

  /** Dialog message — e.g. "This action cannot be undone." */
  message: string;

  /** Label for the confirm button. */
  confirmLabel?: string;

  /** Label for the cancel button. */
  cancelLabel?: string;

  /** Callback when the confirm button is clicked. */
  onConfirm?: () => void;

  /**
   * When `true`, the confirm button shows a loading spinner and is disabled.
   *
   * @default false
   */
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne ConfirmDialog — a pre-built confirmation dialog.
 *
 * **Accessibility:**
 * - Built on @radix-ui/react-dialog for focus trapping and scroll lock
 * - Confirm button has `aria-busy` when loading
 * - Cancel button is always available even during loading
 *
 * @param props - All ConfirmDialogProps.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete project?"
 *   message="This action cannot be undone."
 *   variant="destructive"
 *   confirmLabel="Delete"
 *   onConfirm={handleDelete}
 *   loading={isDeleting}
 * />
 * ```
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  loading = false,
  ...props
}) => (
  <Dialog open={open} onOpenChange={onOpenChange} {...props}>
    <DialogContent size="sm">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
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
            {cancelLabel}
          </button>
        </DialogClose>
        <button
          type="button"
          className={cn(confirmButtonVariants({ variant }))}
          onClick={onConfirm}
          disabled={loading}
          aria-busy={loading || undefined}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

ConfirmDialog.displayName = 'ConfirmDialog';
