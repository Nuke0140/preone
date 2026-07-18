import * as React from 'react';
import { Controller, type UseFormReturn, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from './cn.js';

/**
 * Variants for CurrencyField styling.
 */
export type CurrencyFieldVariant = 'default' | 'outlined' | 'filled';

/**
 * Sizes for CurrencyField.
 */
export type CurrencyFieldSize = 'sm' | 'md' | 'lg';

/**
 * Currency option.
 */
export interface CurrencyOption {
  /** Currency code (e.g., USD) */
  code: string;
  /** Currency symbol (e.g., $) */
  symbol: string;
  /** Display label */
  label: string;
}

const defaultCurrencies: CurrencyOption[] = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
  { code: 'CNY', symbol: '¥', label: 'CNY (¥)' },
  { code: 'KRW', symbol: '₩', label: 'KRW (₩)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'BRL', symbol: 'R$', label: 'BRL (R$)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
];

/**
 * Props for the CurrencyField component.
 */
export interface CurrencyFieldProps<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>,
> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'onBlur'> {
  /** Form instance from useForm */
  form: UseFormReturn<T>;
  /** Field name */
  name: TName;
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Default currency */
  defaultCurrency?: string;
  /** Available currencies */
  currencies?: CurrencyOption[];
  /** Whether to allow currency selection */
  allowCurrencyChange?: boolean;
  /** Visual variant */
  variant?: CurrencyFieldVariant;
  /** Size */
  size?: CurrencyFieldSize;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is loading */
  loading?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Helper text */
  helperText?: string;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Number of decimal places */
  decimals?: number;
}

const variantStyles: Record<CurrencyFieldVariant, string> = {
  default:
    'border border-[var(--preone-border)] bg-[var(--preone-surface)] rounded-md',
  outlined:
    'border-2 border-[var(--preone-border)] bg-transparent rounded-md',
  filled:
    'border-b-2 border-[var(--preone-border)] bg-[var(--preone-surface-secondary)] rounded-t-md',
};

const sizeStyles: Record<CurrencyFieldSize, string> = {
  sm: 'h-8 text-sm px-2',
  md: 'h-10 text-base px-3',
  lg: 'h-12 text-lg px-4',
};

function formatCurrency(value: string, decimals: number): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toFixed(decimals);
}

/**
 * PreOne CurrencyField component combining a currency input with
 * react-hook-form integration, currency selector, and formatting.
 * Supports variants, sizes, disabled/loading/dark modes, and ARIA.
 *
 * @example
 * ```tsx
 * <CurrencyField
 *   form={methods}
 *   name="amount"
 *   label="Amount"
 *   defaultCurrency="USD"
 *   required
 * />
 * ```
 */
export const CurrencyField = React.forwardRef<
  HTMLDivElement,
  CurrencyFieldProps<any, any>
>(
  <T extends FieldValues, TName extends FieldPath<T>>(
    {
      form,
      name,
      label,
      placeholder = '0.00',
      defaultCurrency = 'USD',
      currencies = defaultCurrencies,
      allowCurrencyChange = true,
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      dark = false,
      required = false,
      helperText,
      min,
      max,
      decimals = 2,
      className,
      ...props
    }: CurrencyFieldProps<T, TName>,
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const fieldId = React.useId();
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;

    const [selectedCurrency, setSelectedCurrency] = React.useState(
      () => currencies.find((c) => c.code === defaultCurrency) || currencies[0],
    );
    const [isOpen, setIsOpen] = React.useState(false);

    const error = form.formState.errors[name];

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-1.5',
          disabled && 'opacity-60 pointer-events-none',
          dark && 'dark',
          className,
        )}
        data-dark={dark || undefined}
        {...props}
      >
        {label && (
          <label
            htmlFor={fieldId}
            className={cn(
              'font-medium text-sm text-[var(--preone-text-primary)]',
              required && "after:content-['*'] after:ml-0.5 after:text-[var(--preone-color-error)]",
              dark && 'text-[var(--preone-text-primary-dark)]',
            )}
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            'flex items-stretch',
            variantStyles[variant],
            error && 'border-[var(--preone-color-error)]',
            loading && 'animate-pulse',
            'focus-within:ring-2 focus-within:ring-[var(--preone-color-primary)] focus-within:border-[var(--preone-color-primary)]',
            dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
          )}
        >
          {allowCurrencyChange ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                  'flex items-center gap-1 px-2 h-full border-r border-[var(--preone-border)]',
                  'text-sm text-[var(--preone-text-primary)] hover:bg-[var(--preone-surface-secondary)]',
                  'transition-colors whitespace-nowrap font-medium',
                  dark && 'border-[var(--preone-border-dark)] text-[var(--preone-text-primary-dark)]',
                )}
                aria-label={`Select currency, currently ${selectedCurrency.code}`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                disabled={disabled}
              >
                <span>{selectedCurrency.symbol}</span>
                <span className="text-xs text-[var(--preone-text-secondary)]">
                  {selectedCurrency.code}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>

              {isOpen && (
                <ul
                  className="absolute top-full left-0 z-50 mt-1 max-h-48 w-40 overflow-auto rounded-md border border-[var(--preone-border)] bg-[var(--preone-surface)] shadow-lg"
                  role="listbox"
                  aria-label="Currencies"
                >
                  {currencies.map((currency) => (
                    <li
                      key={currency.code}
                      role="option"
                      aria-selected={currency.code === selectedCurrency.code}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--preone-surface-secondary)]',
                        currency.code === selectedCurrency.code && 'bg-[var(--preone-color-primary-soft)] font-medium',
                      )}
                      onClick={() => {
                        setSelectedCurrency(currency);
                        setIsOpen(false);
                      }}
                    >
                      <span className="font-medium">{currency.symbol}</span>
                      <span>{currency.code}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <span
              className={cn(
                'flex items-center px-3 h-full border-r border-[var(--preone-border)]',
                'text-sm font-medium text-[var(--preone-text-primary)]',
                dark && 'border-[var(--preone-border-dark)] text-[var(--preone-text-primary-dark)]',
              )}
            >
              {selectedCurrency.symbol}
            </span>
          )}

          <Controller
            name={name}
            control={form.control}
            render={({ field }) => (
              <input
                {...field}
                id={fieldId}
                type="text"
                inputMode="decimal"
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  'flex-1 outline-none bg-transparent text-right text-[var(--preone-text-primary)]',
                  sizeStyles[size],
                  'placeholder:text-[var(--preone-text-tertiary)]',
                  dark && 'text-[var(--preone-text-primary-dark)]',
                )}
                aria-invalid={!!error}
                aria-describedby={
                  error ? errorId : helperText ? helperId : undefined
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(value) || value === '') {
                    field.onChange(value === '' ? '' : parseFloat(value));
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && !isNaN(parseFloat(value))) {
                    field.onChange(parseFloat(formatCurrency(value, decimals)));
                  }
                  field.onBlur();
                }}
              />
            )}
          />
        </div>

        {error && (
          <span id={errorId} role="alert" className="text-xs text-[var(--preone-color-error)]">
            {error.message as string}
          </span>
        )}

        {helperText && !error && (
          <span id={helperId} className="text-xs text-[var(--preone-text-secondary)]">
            {helperText}
          </span>
        )}
      </div>
    );
  },
) as <T extends FieldValues, TName extends FieldPath<T>>(
  props: CurrencyFieldProps<T, TName> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

(CurrencyField as any).displayName = 'CurrencyField';
