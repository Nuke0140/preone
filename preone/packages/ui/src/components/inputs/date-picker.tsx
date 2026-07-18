/**
 * @preone/ui — Date Picker
 *
 * A date picker component using a native date input with a Calendar icon
 * trigger and custom styled display.
 *
 * @example
 * ```tsx
 * <DatePicker label="Birth date" onChange={(d) => console.log(d)} />
 * <DatePicker variant="filled" size="lg" min="2020-01-01" max="2030-12-31" />
 * ```
 *
 * @module date-picker
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Calendar } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const datePickerVariants = cva(
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
    'cursor-pointer',
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

/** Props for the DatePicker component. */
export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'>,
    VariantProps<typeof datePickerVariants> {
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the field is in an error state. */
  error?: boolean;
  /** Error message displayed below the field. */
  errorMessage?: string;
  /** Label displayed above the date picker. */
  label?: string;
  /** Minimum date (YYYY-MM-DD). */
  min?: string;
  /** Maximum date (YYYY-MM-DD). */
  max?: string;
  /** Called when the date changes. */
  onChange?: (value: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DatePicker — A date picker with a Calendar icon and native date input.
 *
 * - forwardRef compatible
 * - ARIA attributes for accessibility
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link DatePickerProps}
 * @returns The rendered date picker element.
 */
export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      errorMessage,
      label,
      min,
      max,
      onChange,
      disabled,
      value,
      defaultValue,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;
    const labelId = label ? `${id}-label` : undefined;

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e.target.value);
      },
      [onChange]
    );

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1.5,0.375rem)]">
        {label && (
          <label
            id={labelId}
            htmlFor={id}
            className={cn(
              'text-[var(--text-sm,0.875rem)]',
              'font-[var(--font-medium,500)]',
              'text-[var(--foreground)]',
              'pl-[var(--spacing-1,0.25rem)]'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={id}
            type="date"
            aria-invalid={error || undefined}
            aria-describedby={error && errorMessage ? errorId : undefined}
            aria-labelledby={labelId}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            min={min}
            max={max}
            onChange={handleChange}
            className={cn(
              datePickerVariants({ variant, size, error }),
              // Hide native calendar icon for cleaner look; we provide our own
              '[&::-webkit-calendar-picker-indicator]:opacity-0',
              '[&::-webkit-calendar-picker-indicator]:absolute',
              '[&::-webkit-calendar-picker-indicator]:inset-0',
              '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
              className
            )}
            {...props}
          />

          {/* Calendar icon overlay */}
          <span
            className={cn(
              'pointer-events-none absolute right-0 top-0 flex h-full items-center',
              'pr-[var(--spacing-3,0.75rem)]',
              'text-[var(--muted-foreground)]'
            )}
            aria-hidden="true"
          >
            <Calendar size={size === 'lg' ? 20 : 16} />
          </span>
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

DatePicker.displayName = 'DatePicker';

export { datePickerVariants };
