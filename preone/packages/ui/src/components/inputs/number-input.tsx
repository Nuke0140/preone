/**
 * @preone/ui — Number Input
 *
 * A numeric input with increment/decrement step buttons, min/max/step support,
 * and full variant styling.
 *
 * @example
 * ```tsx
 * <NumberInput min={0} max={100} step={5} />
 * <NumberInput variant="filled" size="lg" />
 * ```
 *
 * @module number-input
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const numberInputVariants = cva(
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
    'pr-[var(--spacing-10,2.5rem)]',
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

/** Props for the NumberInput component. */
export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'>,
    VariantProps<typeof numberInputVariants> {
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the field is in an error state. */
  error?: boolean;
  /** Error message displayed below the field. */
  errorMessage?: string;
  /** Minimum value. */
  min?: number;
  /** Maximum value. */
  max?: number;
  /** Step increment/decrement amount. @default 1 */
  step?: number;
  /** Called when the value changes. */
  onChange?: (value: number | undefined) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * NumberInput — A numeric input with increment/decrement step buttons.
 *
 * - forwardRef compatible
 * - min/max/step support with clamping
 * - ARIA spinbutton role
 * - Keyboard: ArrowUp/ArrowDown to step, Home/End for min/max
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link NumberInputProps}
 * @returns The rendered number input element.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      errorMessage,
      min,
      max,
      step = 1,
      onChange,
      disabled,
      value: controlledValue,
      defaultValue,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;

    const [internalValue, setInternalValue] = React.useState<string>(
      () => String(controlledValue ?? defaultValue ?? '')
    );
    const isControlled = controlledValue !== undefined;
    const displayValue = isControlled ? String(controlledValue) : internalValue;

    const clamp = React.useCallback(
      (v: number): number => {
        if (min !== undefined && v < min) return min;
        if (max !== undefined && v > max) return max;
        return v;
      },
      [min, max]
    );

    const notify = React.useCallback(
      (str: string) => {
        const num = str === '' ? undefined : clamp(Number(str));
        onChange?.(num);
      },
      [clamp, onChange]
    );

    const stepValue = React.useCallback(
      (direction: 1 | -1) => {
        const current = displayValue === '' ? 0 : Number(displayValue);
        const next = clamp(current + direction * step);
        const str = String(next);
        if (!isControlled) setInternalValue(str);
        notify(str);
      },
      [displayValue, step, clamp, isControlled, notify]
    );

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val !== '' && !/^-?\d*\.?\d*$/.test(val)) return;
        if (!isControlled) setInternalValue(val);
        notify(val);
      },
      [isControlled, notify]
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          stepValue(1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          stepValue(-1);
        } else if (e.key === 'Home' && min !== undefined) {
          e.preventDefault();
          const str = String(min);
          if (!isControlled) setInternalValue(str);
          notify(str);
        } else if (e.key === 'End' && max !== undefined) {
          e.preventDefault();
          const str = String(max);
          if (!isControlled) setInternalValue(str);
          notify(str);
        }
      },
      [stepValue, min, max, isControlled, notify]
    );

    const isDecDisabled = disabled || (min !== undefined && Number(displayValue || 0) <= min);
    const isIncDisabled = disabled || (max !== undefined && Number(displayValue || 0) >= max);

    const btnSize = size === 'lg' ? 16 : 12;

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type="text"
            inputMode="decimal"
            role="spinbutton"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={displayValue !== '' ? Number(displayValue) : undefined}
            aria-invalid={error || undefined}
            aria-describedby={error && errorMessage ? errorId : undefined}
            disabled={disabled}
            value={isControlled ? controlledValue : internalValue}
            defaultValue={isControlled ? undefined : defaultValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={cn(numberInputVariants({ variant, size, error }), className)}
            {...props}
          />

          {/* Stepper buttons */}
          <div
            className={cn(
              'absolute right-0 top-0 flex h-full flex-col',
              'border-l border-[var(--border)]',
              'divide-y divide-[var(--border)]',
              size === 'lg'
                ? 'w-[var(--spacing-10,2.5rem)]'
                : 'w-[var(--spacing-8,2rem)]'
            )}
          >
            <button
              type="button"
              aria-label="Increment"
              tabIndex={-1}
              disabled={isIncDisabled}
              onClick={() => stepValue(1)}
              className={cn(
                'flex flex-1 items-center justify-center',
                'text-[var(--muted-foreground)]',
                'hover:text-[var(--foreground)]',
                'hover:bg-[var(--accent)]',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'transition-colors',
                'focus:outline-none'
              )}
            >
              <ChevronUp size={btnSize} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Decrement"
              tabIndex={-1}
              disabled={isDecDisabled}
              onClick={() => stepValue(-1)}
              className={cn(
                'flex flex-1 items-center justify-center',
                'text-[var(--muted-foreground)]',
                'hover:text-[var(--foreground)]',
                'hover:bg-[var(--accent)]',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'transition-colors',
                'focus:outline-none'
              )}
            >
              <ChevronDown size={btnSize} aria-hidden="true" />
            </button>
          </div>
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

NumberInput.displayName = 'NumberInput';

export { numberInputVariants };
