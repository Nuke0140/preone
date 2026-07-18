/**
 * @preone/ui — Checkbox
 *
 * A checkbox built on @radix-ui/react-checkbox with a custom styled
 * indicator and Lucide Check icon. Supports indeterminate state.
 *
 * @example
 * ```tsx
 * <Checkbox label="Accept terms" onCheckedChange={(v) => console.log(v)} />
 * <Checkbox indeterminate label="Select all" />
 * ```
 *
 * @module checkbox
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const checkboxVariants = cva(
  [
    'shrink-0',
    'rounded-[var(--radius-sm,0.125rem)]',
    'border',
    'outline-none',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'focus:ring-2',
    'focus:ring-[var(--ring)]/20',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'data-[state=checked]:bg-[var(--primary)]',
    'data-[state=checked]:border-[var(--primary)]',
    'data-[state=checked]:text-[var(--primary-foreground)]',
    'data-[state=indeterminate]:bg-[var(--primary)]',
    'data-[state=indeterminate]:border-[var(--primary)]',
    'data-[state=indeterminate]:text-[var(--primary-foreground)]',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-[var(--spacing-4,1rem)] w-[var(--spacing-4,1rem)]',
        default: 'h-[var(--spacing-5,1.25rem)] w-[var(--spacing-5,1.25rem)]',
        lg: 'h-[var(--spacing-6,1.5rem)] w-[var(--spacing-6,1.5rem)]',
      },
      variant: {
        default: 'border-[var(--input)]',
        filled: 'border-[var(--input)] bg-[var(--muted)]',
        ghost: 'border-[var(--input)]',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the Checkbox component. */
export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'size'>,
    VariantProps<typeof checkboxVariants> {
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Optional label text displayed next to the checkbox. */
  label?: string;
  /** Whether the checkbox is in an indeterminate state. */
  indeterminate?: boolean;
  /** Error state. */
  error?: boolean;
  /** Error message. */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Checkbox — A checkbox using @radix-ui/react-checkbox with custom indicator.
 *
 * - forwardRef compatible
 * - Check icon from lucide-react
 * - Indeterminate state (Minus icon)
 * - ARIA attributes via Radix
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link CheckboxProps}
 * @returns The rendered checkbox component.
 */
export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(
  (
    {
      className,
      size,
      variant,
      label,
      indeterminate = false,
      error = false,
      errorMessage,
      disabled,
      id: propId,
      onCheckedChange,
      checked: checkedProp,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;

    // Map indeterminate to Radix's "indeterminate" state
    const checked = indeterminate ? 'indeterminate' : checkedProp;

    const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

    return (
      <div className="flex flex-col gap-[var(--spacing-1,0.25rem)]">
        <div className="flex items-center gap-[var(--spacing-2,0.5rem)]">
          <CheckboxPrimitive.Root
            ref={ref}
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            aria-invalid={error || undefined}
            aria-describedby={error && errorMessage ? errorId : undefined}
            className={cn(
              checkboxVariants({ size, variant }),
              error && 'border-[var(--destructive)]! data-[state=checked]:bg-[var(--destructive)]! data-[state=checked]:border-[var(--destructive)]! data-[state=indeterminate]:bg-[var(--destructive)]! data-[state=indeterminate]:border-[var(--destructive)]!',
              className
            )}
            {...props}
          >
            <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
              {indeterminate ? (
                <Minus size={iconSize} strokeWidth={3} aria-hidden="true" />
              ) : (
                <Check size={iconSize} strokeWidth={3} aria-hidden="true" />
              )}
            </CheckboxPrimitive.Indicator>
          </CheckboxPrimitive.Root>

          {label && (
            <label
              htmlFor={id}
              className={cn(
                'text-[var(--text-sm,0.875rem)]',
                'text-[var(--foreground)]',
                'cursor-pointer',
                'select-none',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {label}
            </label>
          )}
        </div>

        {error && errorMessage && (
          <p
            id={errorId}
            role="alert"
            className={cn(
              'text-[var(--text-sm,0.875rem)]',
              'text-[var(--destructive)]',
              'pl-[var(--spacing-7,1.75rem)]'
            )}
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { checkboxVariants };
