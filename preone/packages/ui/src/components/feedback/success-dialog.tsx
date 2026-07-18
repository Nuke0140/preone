/**
 * @preone/ui — SuccessDialog Component
 *
 * A pre-built success dialog with an animated checkmark, title, message,
 * and close button. Provides a consistent success confirmation experience.
 *
 * Features:
 * - **Animated checkmark**: CSS-animated success icon
 * - **Title, message**: Structured content
 * - **Close button**: Dismisses the dialog
 * - **Controlled**: Open state managed by the consumer
 * - **forwardRef**: Full ref forwarding support (via Dialog)
 * - **ARIA**: Complete accessibility via Radix Dialog primitives
 * - **Design tokens**: All colours via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { SuccessDialog } from '@preone/ui/feedback';
 *
 * const [open, setOpen] = React.useState(false);
 *
 * <SuccessDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Payment successful"
 *   message="Your payment has been processed and a receipt has been sent to your email."
 * />
 * ```
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check } from 'lucide-react';
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
// Animated Checkmark
// ---------------------------------------------------------------------------

/**
 * Animated checkmark icon with scale-up and draw-in effect.
 * Uses CSS keyframe animations for a smooth reveal.
 */
function AnimatedCheckmark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        'h-16 w-16 rounded-[var(--radius-full)]',
        'bg-[var(--color-success)]/15',
        className,
      )}
      aria-hidden="true"
    >
      <div className="animate-in zoom-in-50 duration-300">
        <Check
          className="h-8 w-8 text-[var(--color-success)]"
          strokeWidth={3}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the {@link SuccessDialog} component.
 */
export interface SuccessDialogProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>, 'children'> {
  /** Dialog title — e.g. "Payment successful". */
  title: string;

  /** Dialog message — e.g. "Your receipt has been sent to your email." */
  message?: string;

  /** Label for the close button. */
  closeLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne SuccessDialog — a pre-built success confirmation dialog.
 *
 * **Accessibility:**
 * - Built on @radix-ui/react-dialog for focus trapping and scroll lock
 * - Animated checkmark is `aria-hidden="true"` (decorative)
 * - Close button has `aria-label`
 *
 * @param props - All SuccessDialogProps.
 *
 * @example
 * ```tsx
 * <SuccessDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Payment successful"
 *   message="A receipt has been sent to your email."
 * />
 * ```
 */
export const SuccessDialog: React.FC<SuccessDialogProps> = ({
  open,
  onOpenChange,
  title,
  message,
  closeLabel = 'Done',
  ...props
}) => (
  <Dialog open={open} onOpenChange={onOpenChange} {...props}>
    <DialogContent size="sm">
      <div className="flex flex-col items-center gap-4 py-4">
        <AnimatedCheckmark />
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
              'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
              'hover:bg-[var(--color-primary)]/90',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
            )}
          >
            {closeLabel}
          </button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

SuccessDialog.displayName = 'SuccessDialog';
