import * as React from 'react';
import { Controller, type UseFormReturn, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from './cn.js';

/**
 * Variants for PhoneField styling.
 */
export type PhoneFieldVariant = 'default' | 'outlined' | 'filled';

/**
 * Sizes for PhoneField.
 */
export type PhoneFieldSize = 'sm' | 'md' | 'lg';

/**
 * Props for the PhoneField component.
 */
export interface PhoneFieldProps<
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
  /** Default country code */
  defaultCountry?: string;
  /** Visual variant */
  variant?: PhoneFieldVariant;
  /** Size */
  size?: PhoneFieldSize;
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
  /** International format */
  international?: boolean;
}

const variantStyles: Record<PhoneFieldVariant, string> = {
  default:
    'border border-[var(--preone-border)] bg-[var(--preone-surface)] rounded-md',
  outlined:
    'border-2 border-[var(--preone-border)] bg-transparent rounded-md',
  filled:
    'border-b-2 border-[var(--preone-border)] bg-[var(--preone-surface-secondary)] rounded-t-md',
};

const sizeStyles: Record<PhoneFieldSize, string> = {
  sm: 'h-8 text-sm px-2',
  md: 'h-10 text-base px-3',
  lg: 'h-12 text-lg px-4',
};

const countryCodes = [
  { code: '+1', label: 'US', flag: '🇺🇸' },
  { code: '+44', label: 'UK', flag: '🇬🇧' },
  { code: '+49', label: 'DE', flag: '🇩🇪' },
  { code: '+33', label: 'FR', flag: '🇫🇷' },
  { code: '+81', label: 'JP', flag: '🇯🇵' },
  { code: '+86', label: 'CN', flag: '🇨🇳' },
  { code: '+91', label: 'IN', flag: '🇮🇳' },
  { code: '+61', label: 'AU', flag: '🇦🇺' },
  { code: '+82', label: 'KR', flag: '🇰🇷' },
  { code: '+55', label: 'BR', flag: '🇧🇷' },
  { code: '+7', label: 'RU', flag: '🇷🇺' },
  { code: '+39', label: 'IT', flag: '🇮🇹' },
  { code: '+34', label: 'ES', flag: '🇪🇸' },
  { code: '+31', label: 'NL', flag: '🇳🇱' },
  { code: '+46', label: 'SE', flag: '🇸🇪' },
];

/**
 * PreOne PhoneField component combining a phone input with
 * react-hook-form integration, country code selector, and validation.
 * Supports variants, sizes, disabled/loading/dark modes, and ARIA.
 *
 * @example
 * ```tsx
 * <PhoneField
 *   form={methods}
 *   name="phone"
 *   label="Phone Number"
 *   defaultCountry="US"
 *   required
 * />
 * ```
 */
export const PhoneField = React.forwardRef<
  HTMLDivElement,
  PhoneFieldProps<any, any>
>(
  <T extends FieldValues, TName extends FieldPath<T>>(
    {
      form,
      name,
      label,
      placeholder = '(000) 000-0000',
      defaultCountry = 'US',
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      dark = false,
      required = false,
      helperText,
      international = false,
      className,
      ...props
    }: PhoneFieldProps<T, TName>,
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const fieldId = React.useId();
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;
    const [selectedCountry, setSelectedCountry] = React.useState(
      () => countryCodes.find((c) => c.label === defaultCountry) || countryCodes[0],
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'flex items-center gap-1 px-2 h-full border-r border-[var(--preone-border)]',
                'text-sm text-[var(--preone-text-primary)] hover:bg-[var(--preone-surface-secondary)]',
                'transition-colors whitespace-nowrap',
                dark && 'border-[var(--preone-border-dark)] text-[var(--preone-text-primary-dark)]',
              )}
              aria-label={`Select country code, currently ${selectedCountry.label} ${selectedCountry.code}`}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              disabled={disabled}
            >
              <span aria-hidden="true">{selectedCountry.flag}</span>
              <span className="text-xs text-[var(--preone-text-secondary)]">
                {selectedCountry.code}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>

            {isOpen && (
              <ul
                className="absolute top-full left-0 z-50 mt-1 max-h-48 w-40 overflow-auto rounded-md border border-[var(--preone-border)] bg-[var(--preone-surface)] shadow-lg"
                role="listbox"
                aria-label="Country codes"
              >
                {countryCodes.map((country) => (
                  <li
                    key={country.code}
                    role="option"
                    aria-selected={country.code === selectedCountry.code}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--preone-surface-secondary)]',
                      country.code === selectedCountry.code && 'bg-[var(--preone-color-primary-soft)] font-medium',
                    )}
                    onClick={() => {
                      setSelectedCountry(country);
                      setIsOpen(false);
                    }}
                  >
                    <span aria-hidden="true">{country.flag}</span>
                    <span>{country.label}</span>
                    <span className="text-[var(--preone-text-secondary)] ml-auto">
                      {country.code}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Controller
            name={name}
            control={form.control}
            render={({ field }) => (
              <input
                {...field}
                id={fieldId}
                type="tel"
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  'flex-1 outline-none bg-transparent text-[var(--preone-text-primary)]',
                  sizeStyles[size],
                  'placeholder:text-[var(--preone-text-tertiary)]',
                  dark && 'text-[var(--preone-text-primary-dark)]',
                )}
                aria-invalid={!!error}
                aria-describedby={
                  error ? errorId : helperText ? helperId : undefined
                }
                onChange={(e) => {
                  const value = international
                    ? `${selectedCountry.code}${e.target.value}`
                    : e.target.value;
                  field.onChange(value);
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
  props: PhoneFieldProps<T, TName> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

(PhoneField as any).displayName = 'PhoneField';
