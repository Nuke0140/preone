/**
 * @preone/ui — Textarea
 *
 * A multi-line text input with auto-resize, variants, sizes, character count,
 * and error state support.
 *
 * @example
 * ```tsx
 * <Textarea autoResize maxLength={500} charCount placeholder="Write something…" />
 * <Textarea variant="filled" error errorMessage="Too short" />
 * ```
 *
 * @module textarea
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const textareaVariants = cva(
  [
    'w-full',
    'outline-none',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'font-[family-name:var(--font-sans,Inter)]',
    'placeholder:text-[var(--muted-foreground)]',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'resize-y',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-transparent',
          'border',
          'border-[var(--input)]',
          'text-[var(--foreground)]',
          'hover:border-[var(--ring)]',
          'focus:border-[var(--ring)]',
          'focus:ring-2',
          'focus:ring-[var(--ring)]/20',
          'shadow-[var(--shadow-inner)]',
        ].join(' '),
        filled: [
          'bg-[var(--muted)]',
          'border',
          'border-transparent',
          'text-[var(--foreground)]',
          'hover:bg-[var(--accent)]',
          'focus:bg-transparent',
          'focus:border-[var(--ring)]',
          'focus:ring-2',
          'focus:ring-[var(--ring)]/20',
        ].join(' '),
        ghost: [
          'bg-transparent',
          'border',
          'border-transparent',
          'text-[var(--foreground)]',
          'hover:bg-[var(--accent)]',
          'focus:bg-[var(--accent)]',
          'focus:ring-2',
          'focus:ring-[var(--ring)]/20',
        ].join(' '),
      },
      size: {
        sm: [
          'px-[var(--spacing-2,0.5rem)]',
          'py-[var(--spacing-1.5,0.375rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
          'min-h-[var(--spacing-20,5rem)]',
        ].join(' '),
        default: [
          'px-[var(--spacing-3,0.75rem)]',
          'py-[var(--spacing-2,0.5rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
          'min-h-[var(--spacing-24,6rem)]',
        ].join(' '),
        lg: [
          'px-[var(--spacing-4,1rem)]',
          'py-[var(--spacing-3,0.75rem)]',
          'text-[var(--text-base,1rem)]',
          'rounded-[var(--radius-lg,0.75rem)]',
          'min-h-[var(--spacing-32,8rem)]',
        ].join(' '),
      },
      error: {
        true: [
          'border-[var(--destructive)]!',
          'focus:ring-[var(--destructive)]/20!',
          'focus:border-[var(--destructive)]!',
          'aria-invalid:border-[var(--destructive)]!',
        ].join(' '),
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      error: false,
    },
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the Textarea component. */
export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  /** Visual variant of the textarea. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset: sm, default, or lg. */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the textarea is in an error state. */
  error?: boolean;
  /** Error message displayed below the textarea. */
  errorMessage?: string;
  /** Enable auto-resize based on content. */
  autoResize?: boolean;
  /** Show character count below the textarea. Requires `maxLength`. */
  charCount?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Textarea — A multi-line text input with auto-resize, variants, sizes,
 * character count, and error state.
 *
 * - forwardRef compatible
 * - ARIA attributes for accessibility
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link TextareaProps}
 * @returns The rendered textarea element.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      errorMessage,
      autoResize = false,
      charCount = false,
      maxLength,
      disabled,
      value,
      defaultValue,
      onChange,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;
    const countId = `${id}-count`;

    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const [charLength, setCharLength] = React.useState(() => {
      const v = value ?? defaultValue ?? '';
      return String(v).length;
    });

    /** Keep character length in sync. */
    React.useEffect(() => {
      if (typeof value === 'string') {
        setCharLength(value.length);
      }
    }, [value]);

    /** Auto-resize handler. */
    const adjustHeight = React.useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoResize) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, [autoResize]);

    React.useEffect(() => {
      adjustHeight();
    }, [adjustHeight, charLength]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharLength(e.target.value.length);
      adjustHeight();
      onChange?.(e);
    };

    const mergedRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      },
      [ref]
    );

    const describedBy: string[] = [];
    if (error && errorMessage) describedBy.push(errorId);
    if (charCount) describedBy.push(countId);

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <textarea
          ref={mergedRef}
          id={id}
          aria-invalid={error || undefined}
          aria-describedby={describedBy.length > 0 ? describedBy.join(' ') : undefined}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          className={cn(
            textareaVariants({ variant, size, error }),
            autoResize && 'overflow-hidden resize-none',
            className
          )}
          {...props}
        />

        <div className="flex items-center justify-between">
          {error && errorMessage ? (
            <p
              id={errorId}
              role="alert"
              className={cn(
                'text-[var(--text-sm,0.875rem)]',
                'text-[var(--destructive)]',
                'pl-[var(--spacing-1,0.25rem)]'
              )}
            >
              {errorMessage}
            </p>
          ) : (
            <span />
          )}

          {charCount && maxLength != null && (
            <p
              id={countId}
              aria-live="polite"
              className={cn(
                'text-[var(--text-sm,0.875rem)]',
                'text-[var(--muted-foreground)]',
                'pr-[var(--spacing-1,0.25rem)]'
              )}
            >
              {charLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { textareaVariants };
