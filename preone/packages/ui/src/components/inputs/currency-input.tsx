/**
 * @preone/ui — Currency Input
 *
 * A formatted currency input with a symbol prefix, locale-aware formatting,
 * and support for different currencies.
 *
 * @example
 * ```tsx
 * <CurrencyInput currency="USD" locale="en-US" />
 * <CurrencyInput currency="EUR" locale="de-DE" variant="filled" size="lg" />
 * ```
 *
 * @module currency-input
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Currency data
// ---------------------------------------------------------------------------

/** Currency configuration entry. */
export interface CurrencyConfig {
  /** ISO 4217 currency code. */
  code: string;
  /** Display symbol. */
  symbol: string;
  /** Number of decimal places. */
  decimals: number;
}

/** Common currency configurations. */
export const currencies: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', decimals: 0 },
  INR: { code: 'INR', symbol: '₹', decimals: 2 },
  CNY: { code: 'CNY', symbol: '¥', decimals: 2 },
  KRW: { code: 'KRW', symbol: '₩', decimals: 0 },
  BRL: { code: 'BRL', symbol: 'R$', decimals: 2 },
  AED: { code: 'AED', symbol: 'د.إ', decimals: 2 },
  CHF: { code: 'CHF', symbol: 'CHF', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'C$', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', decimals: 2 },
  SEK: { code: 'SEK', symbol: 'kr', decimals: 2 },
  ZAR: { code: 'ZAR', symbol: 'R', decimals: 2 },
};

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

/**
 * Formats a numeric string according to locale and currency settings.
 *
 * @param value - The raw numeric string.
 * @param locale - BCP 47 locale string.
 * @param currency - ISO 4217 currency code.
 * @returns Formatted display string.
 */
function formatCurrency(value: string, locale: string, currency: string): string {
  if (!value || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: currencies[currency]?.decimals ?? 2,
      maximumFractionDigits: currencies[currency]?.decimals ?? 2,
    }).format(num);
  } catch {
    return value;
  }
}

/**
 * Strips non-numeric characters from input, preserving decimal point and
 * negative sign.
 *
 * @param value - The raw input string.
 * @param decimals - Allowed decimal places.
 * @returns Sanitized numeric string.
 */
function sanitizeInput(value: string, decimals: number): string {
  // Allow digits, one decimal point, one negative sign at start
  let sanitized = value.replace(/[^0-9.\-]/g, '');

  // Only one negative at the start
  const hasNeg = sanitized.startsWith('-');
  sanitized = sanitized.replace(/-/g, '');
  if (hasNeg) sanitized = '-' + sanitized;

  // Only one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }

  // Limit decimal places
  if (parts.length === 2 && parts[1].length > decimals) {
    sanitized = parts[0] + '.' + parts[1].slice(0, decimals);
  }

  return sanitized;
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const currencyInputVariants = cva(
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
    'pl-[var(--spacing-10,2.5rem)]',
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
          'pr-[var(--spacing-2,0.5rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
        ].join(' '),
        default: [
          'h-[var(--spacing-10,2.5rem)]',
          'pr-[var(--spacing-3,0.75rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
        ].join(' '),
        lg: [
          'h-[var(--spacing-12,3rem)]',
          'pr-[var(--spacing-4,1rem)]',
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

/** Props for the CurrencyInput component. */
export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'>,
    VariantProps<typeof currencyInputVariants> {
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the field is in an error state. */
  error?: boolean;
  /** Error message displayed below the field. */
  errorMessage?: string;
  /** ISO 4217 currency code. @default 'USD' */
  currency?: string;
  /** BCP 47 locale string for formatting. @default 'en-US' */
  locale?: string;
  /** Called with the numeric value on change. */
  onChange?: (value: number | undefined) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CurrencyInput — A currency input with symbol prefix and formatted display.
 *
 * - forwardRef compatible
 * - Locale-aware formatting
 * - ARIA attributes for accessibility
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link CurrencyInputProps}
 * @returns The rendered currency input element.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      errorMessage,
      currency = 'USD',
      locale = 'en-US',
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

    const config = currencies[currency] ?? { code: currency, symbol: currency, decimals: 2 };
    const [rawValue, setRawValue] = React.useState<string>(
      () => String(controlledValue ?? defaultValue ?? '')
    );
    const [formatted, setFormatted] = React.useState<string>(
      () => formatCurrency(String(controlledValue ?? defaultValue ?? ''), locale, currency)
    );
    const [isFocused, setIsFocused] = React.useState(false);
    const isControlled = controlledValue !== undefined;

    // Update formatted display when value changes externally
    React.useEffect(() => {
      if (!isFocused) {
        const val = isControlled ? String(controlledValue) : rawValue;
        setFormatted(formatCurrency(val, locale, currency));
      }
    }, [controlledValue, isControlled, locale, currency, isFocused, rawValue]);

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitized = sanitizeInput(e.target.value, config.decimals);
        if (!isControlled) setRawValue(sanitized);
        setFormatted(formatCurrency(sanitized, locale, currency));
        const num = sanitized === '' || sanitized === '-' ? undefined : parseFloat(sanitized);
        onChange?.(isNaN(num!) ? undefined : num);
      },
      [config.decimals, isControlled, locale, currency, onChange]
    );

    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        const val = isControlled ? String(controlledValue) : rawValue;
        // Show raw value while editing
        const target = e.target;
        target.value = val;
        // Move cursor to end
        requestAnimationFrame(() => {
          target.setSelectionRange(val.length, val.length);
        });
        props.onFocus?.(e);
      },
      [isControlled, controlledValue, rawValue, props.onFocus]
    );

    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        const val = isControlled ? String(controlledValue) : rawValue;
        setFormatted(formatCurrency(val, locale, currency));
        props.onBlur?.(e);
      },
      [isControlled, controlledValue, rawValue, locale, currency, props.onBlur]
    );

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <div className="relative">
          {/* Currency symbol */}
          <span
            className={cn(
              'pointer-events-none absolute left-0 top-0 flex h-full items-center',
              'pl-[var(--spacing-3,0.75rem)]',
              'text-[var(--muted-foreground)]',
              'text-[var(--text-sm,0.875rem)]',
              'font-medium'
            )}
            aria-hidden="true"
          >
            {config.symbol}
          </span>

          <input
            ref={ref}
            id={id}
            type="text"
            inputMode="decimal"
            aria-invalid={error || undefined}
            aria-describedby={error && errorMessage ? errorId : undefined}
            aria-label={`${currency} amount`}
            disabled={disabled}
            value={isFocused ? (isControlled ? String(controlledValue) : rawValue) : formatted}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(currencyInputVariants({ variant, size, error }), className)}
            {...props}
          />
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

CurrencyInput.displayName = 'CurrencyInput';

export { currencyInputVariants };
