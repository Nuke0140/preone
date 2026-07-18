/**
 * @preone/ui — ClipboardButton Component
 *
 * A button that copies text to the clipboard on click, providing
 * visual feedback by switching to a check icon temporarily.
 *
 * Features:
 * - **Copy to clipboard**: Uses the Clipboard API
 * - **Visual feedback**: Check icon after successful copy, reverts to Clipboard icon
 * - **Customizable duration**: How long the success state is shown
 * - **Variants**: default, secondary, outline, ghost
 * - **Sizes**: sm, default, lg, icon
 * - **Disabled / Loading**: Full state support
 * - **forwardRef**: Full ref forwarding to the button element
 * - **ARIA**: Live region for screen reader feedback
 * - **Design tokens**: All styling via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * Design Rules:
 * - Very large whitespace (generous padding)
 * - Rounded corners (var(--radius-lg))
 * - Soft shadows only
 * - NO heavy borders, NO glossy, NO gradients
 * - Premium minimal
 *
 * @example
 * ```tsx
 * import { ClipboardButton } from '@preone/ui';
 *
 * <ClipboardButton text="npm install @preone/ui" />
 * <ClipboardButton text="Hello world" copyDuration={3000} variant="outline" />
 * <ClipboardButton text="API Key" size="sm" onCopied={() => toast('Copied!')} />
 * ```
 *
 * @module clipboard-button
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Clipboard, Check, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Visual style variant for the ClipboardButton. */
export type ClipboardButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost';

/** Size variant for the ClipboardButton. */
export type ClipboardButtonSize = 'sm' | 'default' | 'lg' | 'icon';

/**
 * ClipboardButton variant definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--primary` / `--primary-foreground` — default action colour
 * - `--secondary` / `--secondary-foreground` — secondary action colour
 * - `--accent` / `--accent-foreground` — accent / hover colour
 * - `--muted-foreground` — muted text colour
 * - `--border` — border colour
 * - `--ring` — focus ring colour
 * - `--radius-lg` — border radius
 * - `--shadow-sm` — shadow token
 * - `--duration-fast` — transition duration
 * - `--ease-default` — transition easing
 */
export const clipboardButtonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap',
    'font-medium',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Primary filled button. */
        default: [
          'bg-[var(--primary)] text-[var(--primary-foreground)]',
          'shadow-[var(--shadow-sm)]',
          'hover:bg-[var(--primary)]/90',
          'focus-visible:ring-[var(--ring)]',
          'active:bg-[var(--primary)]/80',
        ].join(' '),

        /** Secondary filled button. */
        secondary: [
          'bg-[var(--secondary)] text-[var(--secondary-foreground)]',
          'shadow-[var(--shadow-sm)]',
          'hover:bg-[var(--secondary)]/80',
          'focus-visible:ring-[var(--ring)]',
          'active:bg-[var(--secondary)]/70',
        ].join(' '),

        /** Outlined button with no fill. */
        outline: [
          'border border-[var(--border)] bg-transparent text-[var(--foreground)]',
          'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
          'focus-visible:ring-[var(--ring)]',
          'active:bg-[var(--accent)]/70',
        ].join(' '),

        /** Ghost button with no border or fill. */
        ghost: [
          'bg-transparent text-[var(--foreground)]',
          'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
          'focus-visible:ring-[var(--ring)]',
          'active:bg-[var(--accent)]/70',
        ].join(' '),
      },

      size: {
        /** Small — compact padding. */
        sm: 'h-8 px-3 text-[var(--text-sm)] rounded-[var(--radius-md)]',

        /** Default — standard size. */
        default: 'h-10 px-6 text-[var(--text-sm)] rounded-[var(--radius-lg)]',

        /** Large — prominent button. */
        lg: 'h-12 px-8 text-[var(--text-base)] rounded-[var(--radius-lg)]',

        /** Icon — square button for icon-only display. */
        icon: 'h-10 w-10 rounded-[var(--radius-lg)]',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the ClipboardButton component. */
export interface ClipboardButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onCopy'>,
    VariantProps<typeof clipboardButtonVariants> {
  /** The text content to copy to the clipboard when clicked. */
  text: string;
  /**
   * Duration in milliseconds to show the "copied" check icon
   * before reverting to the clipboard icon.
   * @default 2000
   */
  copyDuration?: number;
  /**
   * Optional label shown next to the icon.
   * When provided, the button renders in text+icon mode.
   * When omitted, only the icon is shown.
   */
  label?: string;
  /**
   * Callback fired after text is successfully copied to the clipboard.
   */
  onCopied?: () => void;
  /**
   * Callback fired when copying fails.
   */
  onError?: (error: unknown) => void;
  /**
   * When `true`, the button shows a loading spinner and is non-interactive.
   * @default false
   */
  loading?: boolean;
  /**
   * Visual variant.
   * @default 'default'
   */
  variant?: ClipboardButtonVariant;
  /**
   * Size preset.
   * @default 'default'
   */
  size?: ClipboardButtonSize;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ClipboardButton — Copies text to the clipboard with visual feedback.
 *
 * On click, the button uses the Clipboard API (`navigator.clipboard.writeText`)
 * to copy the `text` prop. On success, it displays a Check icon for
 * `copyDuration` milliseconds, then reverts to the Clipboard icon.
 *
 * **Accessibility:**
 * - `aria-label` dynamically updates to reflect the current state
 * - `aria-live="polite"` region announces copy status to screen readers
 * - `aria-busy` is set during loading state
 * - `aria-disabled` when loading or disabled
 *
 * @param props - {@link ClipboardButtonProps}
 * @param ref - Forwarded ref to the underlying button element.
 * @returns The rendered clipboard button.
 */
export const ClipboardButton = React.forwardRef<
  HTMLButtonElement,
  ClipboardButtonProps
>(
  (
    {
      className,
      text,
      copyDuration = 2000,
      label,
      onCopied,
      onError,
      loading = false,
      disabled,
      variant = 'default',
      size = 'default',
      ...props
    },
    ref,
  ) => {
    const [copied, setCopied] = React.useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Clean up timeout on unmount
    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const handleCopy = React.useCallback(async () => {
      if (copied || disabled || loading) return;

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        onCopied?.();

        timeoutRef.current = setTimeout(() => {
          setCopied(false);
        }, copyDuration);
      } catch (err) {
        onError?.(err);
      }
    }, [text, copied, disabled, loading, copyDuration, onCopied, onError]);

    const isDisabled = disabled || loading;

    // Determine the appropriate aria-label
    const getAriaLabel = () => {
      if (loading) return 'Loading';
      if (copied) return 'Copied to clipboard';
      return label ? `Copy: ${label}` : 'Copy to clipboard';
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          clipboardButtonVariants({ variant, size }),
          copied && 'text-[var(--primary)]',
          className,
        )}
        disabled={isDisabled}
        aria-label={getAriaLabel()}
        aria-busy={loading || undefined}
        aria-disabled={loading ? 'true' : undefined}
        aria-live="polite"
        onClick={handleCopy}
        {...props}
      >
        {loading ? (
          <Loader2
            className="h-4 w-4 animate-spin"
            aria-hidden="true"
          />
        ) : copied ? (
          <Check
            className={cn(
              'h-4 w-4',
              'transition-all',
              'duration-[var(--duration-fast,150ms)]',
              'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
            )}
            aria-hidden="true"
          />
        ) : (
          <Clipboard
            className={cn(
              'h-4 w-4',
              'transition-all',
              'duration-[var(--duration-fast,150ms)]',
              'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
            )}
            aria-hidden="true"
          />
        )}
        {label && <span>{copied ? 'Copied!' : label}</span>}
      </button>
    );
  },
);

ClipboardButton.displayName = 'ClipboardButton';
