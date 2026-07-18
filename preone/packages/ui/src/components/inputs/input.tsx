/**
 * @preone/ui — Input
 *
 * A versatile text input component with variant styling, sizes, addon slots,
 * prefix/suffix icons, loading state, and error state.
 *
 * Uses design token CSS variables for theming and class-variance-authority
 * for variant management.
 *
 * @example
 * ```tsx
 * <Input variant="filled" size="lg" prefixIcon={<Mail />} placeholder="Email" />
 * <Input error errorMessage="Required field" />
 * <Input loading />
 * ```
 *
 * @module input
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Input visual variant tokens. */
const inputVariants = cva(
  [
    'peer',
    'w-full',
    'outline-none',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'font-[family-name:var(--font-sans,Inter)]',
    'placeholder:text-[var(--muted-foreground)]',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
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
          'h-[var(--spacing-8,2rem)]',
          'px-[var(--spacing-2,0.5rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
        ].join(' '),
        default: [
          'h-[var(--spacing-10,2.5rem)]',
          'px-[var(--spacing-3,0.75rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
        ].join(' '),
        lg: [
          'h-[var(--spacing-12,3rem)]',
          'px-[var(--spacing-4,1rem)]',
          'text-[var(--text-base,1rem)]',
          'rounded-[var(--radius-lg,0.75rem)]',
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

/** Props for the Input component. */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Visual variant of the input field. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset: sm, default, or lg. */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the input is in an error state. */
  error?: boolean;
  /** Error message displayed below the input. */
  errorMessage?: string;
  /** Whether the input is in a loading state. */
  loading?: boolean;
  /** Icon element rendered inside the input on the left side. */
  prefixIcon?: React.ReactNode;
  /** Icon element rendered inside the input on the right side. */
  suffixIcon?: React.ReactNode;
  /** Content rendered in a left addon slot (outside the input border). */
  leftAddon?: React.ReactNode;
  /** Content rendered in a right addon slot (outside the input border). */
  rightAddon?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Input — A text input with variant styling, sizes, addon slots, prefix/suffix icons,
 * loading state, and error state.
 *
 * - forwardRef compatible
 * - ARIA attributes for accessibility
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link InputProps}
 * @returns The rendered input element wrapped with addons and icons.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      errorMessage,
      loading = false,
      prefixIcon,
      suffixIcon,
      leftAddon,
      rightAddon,
      disabled,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;

    const hasPrefix = !!(prefixIcon || loading);
    const hasSuffix = !!suffixIcon;

    const inputElement = (
      <input
        ref={ref}
        id={id}
        aria-invalid={error || undefined}
        aria-describedby={error && errorMessage ? errorId : undefined}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        className={cn(
          inputVariants({ variant, size, error }),
          hasPrefix && 'pl-[var(--spacing-10,2.5rem)]',
          hasSuffix && 'pr-[var(--spacing-10,2.5rem)]',
          leftAddon && 'rounded-l-none',
          rightAddon && 'rounded-r-none',
          className
        )}
        {...props}
      />
    );

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <div className="flex w-full items-stretch">
          {leftAddon && (
            <span
              className={cn(
                'inline-flex items-center',
                'bg-[var(--muted)]',
                'border border-r-0 border-[var(--input)]',
                'px-[var(--spacing-3,0.75rem)]',
                'text-[var(--muted-foreground)]',
                'text-[var(--text-sm,0.875rem)]',
                'rounded-l-[var(--radius-md,0.5rem)]'
              )}
            >
              {leftAddon}
            </span>
          )}

          <div className="relative flex-1">
            {hasPrefix && (
              <span
                className={cn(
                  'pointer-events-none absolute left-0 top-0 flex h-full items-center',
                  'pl-[var(--spacing-3,0.75rem)]',
                  'text-[var(--muted-foreground)]'
                )}
              >
                {loading ? (
                  <Loader2
                    className="animate-spin"
                    size={size === 'lg' ? 20 : 16}
                    aria-hidden="true"
                  />
                ) : (
                  prefixIcon
                )}
              </span>
            )}

            {inputElement}

            {hasSuffix && (
              <span
                className={cn(
                  'pointer-events-none absolute right-0 top-0 flex h-full items-center',
                  'pr-[var(--spacing-3,0.75rem)]',
                  'text-[var(--muted-foreground)]'
                )}
              >
                {suffixIcon}
              </span>
            )}
          </div>

          {rightAddon && (
            <span
              className={cn(
                'inline-flex items-center',
                'bg-[var(--muted)]',
                'border border-l-0 border-[var(--input)]',
                'px-[var(--spacing-3,0.75rem)]',
                'text-[var(--muted-foreground)]',
                'text-[var(--text-sm,0.875rem)]',
                'rounded-r-[var(--radius-md,0.5rem)]'
              )}
            >
              {rightAddon}
            </span>
          )}
        </div>

        {error && errorMessage && (
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
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { inputVariants };
