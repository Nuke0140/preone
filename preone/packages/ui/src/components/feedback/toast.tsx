/**
 * @preone/ui — Toast Component
 *
 * A headless toast notification system. Visual presentation only — state
 * management is handled by `@preone/notifications` or your own toast store.
 *
 * Features:
 * - **Sub-components**: Toast, ToastTitle, ToastDescription, ToastAction, ToastClose
 * - **Variants**: default, success, destructive, warning
 * - **Timer/progress bar**: Auto-dismiss visual indicator
 * - **forwardRef**: Full ref forwarding on all sub-components
 * - **ARIA**: `role="status"` with `aria-live="polite"` for non-intrusive announcements
 * - **Design tokens**: All colours via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { Toast, ToastTitle, ToastDescription, ToastClose } from '@preone/ui/feedback';
 *
 * <Toast variant="success">
 *   <ToastTitle>Saved!</ToastTitle>
 *   <ToastDescription>Your changes have been saved.</ToastDescription>
 *   <ToastClose />
 * </Toast>
 *
 * <Toast variant="destructive" duration={5000} onDurationEnd={() => dismiss()}>
 *   <ToastTitle>Error</ToastTitle>
 *   <ToastDescription>Failed to save.</ToastDescription>
 *   <ToastAction altText="Retry" onClick={retry}>Retry</ToastAction>
 *   <ToastClose />
 * </Toast>
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Toast Variants
// ---------------------------------------------------------------------------

/** Visual style variant for the Toast component. */
export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

/**
 * Toast variant definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-card` / `--color-card-foreground` — default toast surface
 * - `--color-success` / `--color-success-foreground` — success toast
 * - `--color-destructive` / `--color-destructive-foreground` — destructive toast
 * - `--color-warning` / `--color-warning-foreground` — warning toast
 * - `--color-border` — border colour
 * - `--radius-lg` — container radius
 * - `--shadow-lg` — elevation shadow
 */
export const toastVariants = cva(
  [
    'group relative flex items-start gap-3',
    'pointer-events-auto',
    'rounded-[var(--radius-lg)]',
    'border',
    'p-4',
    'shadow-[var(--shadow-lg)]',
    'transition-all',
    'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-bottom-4',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-right-full',
    'w-[380px] max-w-[calc(100vw-2rem)]',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Default — neutral surface. */
        default: [
          'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)]',
        ].join(' '),

        /** Success — green accent. */
        success: [
          'border-[var(--color-success)]/20 bg-[var(--color-card)] text-[var(--color-card-foreground)]',
        ].join(' '),

        /** Destructive — red accent. */
        destructive: [
          'border-[var(--color-destructive)]/20 bg-[var(--color-card)] text-[var(--color-card-foreground)]',
        ].join(' '),

        /** Warning — amber accent. */
        warning: [
          'border-[var(--color-warning)]/20 bg-[var(--color-card)] text-[var(--color-card-foreground)]',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/** Maps variant to progress bar colour. */
const progressColorMap: Record<ToastVariant, string> = {
  default: 'bg-[var(--color-primary)]',
  success: 'bg-[var(--color-success)]',
  destructive: 'bg-[var(--color-destructive)]',
  warning: 'bg-[var(--color-warning)]',
};

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Toast} component.
 *
 * Extends standard `<li>` attributes with PreOne toast features.
 */
export interface ToastProps
  extends React.LiHTMLAttributes<HTMLLIElement>,
    VariantProps<typeof toastVariants> {
  /**
   * Auto-dismiss duration in milliseconds.
   * When provided, a progress bar is shown and `onDurationEnd` is called.
   * Set to `0` or `Infinity` to disable auto-dismiss.
   */
  duration?: number;

  /** Callback when the duration timer completes. */
  onDurationEnd?: () => void;

  /** Toast open state — managed by the toast store. */
  open?: boolean;

  /** Callback when the toast should close. */
  onClose?: () => void;
}

/**
 * PreOne Toast — a non-intrusive notification banner.
 *
 * **Accessibility:**
 * - `role="status"` with `aria-live="polite"` for non-intrusive announcements
 * - `data-state` for open/closed animation states
 *
 * @param props - All ToastProps plus standard `<li>` HTML attributes.
 * @param ref - Forwarded ref to the underlying `<li>` element.
 */
export const Toast = React.forwardRef<HTMLLIElement, ToastProps>(
  (
    {
      className,
      variant,
      duration,
      onDurationEnd,
      open = true,
      onClose,
      children,
      ...props
    },
    ref,
  ) => {
    const [progress, setProgress] = React.useState(100);
    const [state, setState] = React.useState<'open' | 'closed'>(open ? 'open' : 'closed');

    // Update state when open prop changes
    React.useEffect(() => {
      setState(open ? 'open' : 'closed');
    }, [open]);

    // Auto-dismiss timer
    React.useEffect(() => {
      if (!duration || duration === Infinity || !open) return;

      const startTime = Date.now();
      const frameDuration = 1000 / 60; // 60fps

      const tick = () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);

        if (remaining <= 0) {
          onDurationEnd?.();
          return;
        }

        timer = window.setTimeout(tick, frameDuration);
      };

      let timer = window.setTimeout(tick, frameDuration);

      return () => {
        window.clearTimeout(timer);
      };
    }, [duration, onDurationEnd, open]);

    return (
      <li
        ref={ref}
        role="status"
        aria-live="polite"
        data-state={state}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        {/* Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>

        {/* Progress bar */}
        {duration != null && duration > 0 && duration !== Infinity && (
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-[var(--radius-lg)]"
            aria-hidden="true"
          >
            <div
              className={cn(
                'h-full transition-[width] duration-100 ease-linear',
                progressColorMap[(variant as ToastVariant) || 'default'],
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </li>
    );
  },
);
Toast.displayName = 'Toast';

// ---------------------------------------------------------------------------
// ToastTitle
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ToastTitle} component.
 */
export interface ToastTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

/**
 * PreOne ToastTitle — bold heading inside a toast.
 *
 * @param props - Standard `<h5>` HTML attributes.
 * @param ref - Forwarded ref to the underlying `<h5>` element.
 */
export const ToastTitle = React.forwardRef<HTMLHeadingElement, ToastTitleProps>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('text-sm font-semibold text-[var(--color-foreground)]', className)}
      {...props}
    />
  ),
);
ToastTitle.displayName = 'ToastTitle';

// ---------------------------------------------------------------------------
// ToastDescription
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ToastDescription} component.
 */
export interface ToastDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

/**
 * PreOne ToastDescription — muted text inside a toast.
 *
 * @param props - Standard `<p>` HTML attributes.
 * @param ref - Forwarded ref to the underlying `<p>` element.
 */
export const ToastDescription = React.forwardRef<HTMLParagraphElement, ToastDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-[var(--color-muted-foreground)] mt-0.5', className)}
      {...props}
    />
  ),
);
ToastDescription.displayName = 'ToastDescription';

// ---------------------------------------------------------------------------
// ToastAction
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ToastAction} component.
 */
export interface ToastActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label for the action (used when button text is not descriptive). */
  altText?: string;
}

/**
 * PreOne ToastAction — action button inside a toast.
 *
 * @param props - Standard `<button>` HTML attributes plus `altText`.
 * @param ref - Forwarded ref to the underlying `<button>` element.
 */
export const ToastAction = React.forwardRef<HTMLButtonElement, ToastActionProps>(
  ({ className, altText, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center',
        'h-7 px-3',
        'text-xs font-medium',
        'rounded-[var(--radius-md)]',
        'border border-[var(--color-border)]',
        'bg-transparent text-[var(--color-foreground)]',
        'hover:bg-[var(--color-muted)]',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        className,
      )}
      aria-label={altText}
      {...props}
    >
      {children}
    </button>
  ),
);
ToastAction.displayName = 'ToastAction';

// ---------------------------------------------------------------------------
// ToastClose
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ToastClose} component.
 */
export interface ToastCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

/**
 * PreOne ToastClose — dismiss button for a toast.
 *
 * @param props - Standard `<button>` HTML attributes.
 * @param ref - Forwarded ref to the underlying `<button>` element.
 */
export const ToastClose = React.forwardRef<HTMLButtonElement, ToastCloseProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'shrink-0',
        'inline-flex items-center justify-center',
        'h-6 w-6 rounded-[var(--radius-md)]',
        'text-[var(--color-muted-foreground)]',
        'hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        className,
      )}
      aria-label="Close"
      {...props}
    >
      <X className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  ),
);
ToastClose.displayName = 'ToastClose';

// ---------------------------------------------------------------------------
// ToastViewport (container for toast stack)
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ToastViewport} component.
 */
export interface ToastViewportProps extends React.HTMLAttributes<HTMLOListElement> {}

/**
 * PreOne ToastViewport — the fixed-position container for toast stack.
 *
 * Renders a `<ol>` in the bottom-right corner (typical toast position).
 *
 * @param props - Standard `<ol>` HTML attributes.
 * @param ref - Forwarded ref to the underlying `<ol>` element.
 */
export const ToastViewport = React.forwardRef<HTMLOListElement, ToastViewportProps>(
  ({ className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(
        'fixed bottom-0 right-0 z-[100]',
        'flex flex-col gap-2 p-4',
        'max-h-screen w-full',
        'pointer-events-none',
        className,
      )}
      aria-label="Notifications"
      tabIndex={-1}
      {...props}
    />
  ),
);
ToastViewport.displayName = 'ToastViewport';
