import * as React from 'react';
import { Controller, type UseFormReturn, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from './cn.js';

/**
 * Variants for OTPField styling.
 */
export type OTPFieldVariant = 'default' | 'outlined' | 'filled' | 'underlined';

/**
 * Sizes for OTPField.
 */
export type OTPFieldSize = 'sm' | 'md' | 'lg';

/**
 * Props for the OTPField component.
 */
export interface OTPFieldProps<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>,
> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'onBlur'> {
  /** Form instance from useForm */
  form: UseFormReturn<T>;
  /** Field name */
  name: TName;
  /** Number of OTP digits */
  length?: number;
  /** Label text */
  label?: string;
  /** Visual variant */
  variant?: OTPFieldVariant;
  /** Size */
  size?: OTPFieldSize;
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
  /** Called when all digits are filled */
  onComplete?: (value: string) => void;
  /** Auto-focus first input */
  autoFocus?: boolean;
  /** Allowed pattern per digit */
  pattern?: string;
}

const variantStyles: Record<OTPFieldVariant, string> = {
  default:
    'border border-[var(--preone-border)] bg-[var(--preone-surface)] rounded-md',
  outlined:
    'border-2 border-[var(--preone-border)] bg-transparent rounded-md',
  filled:
    'border-b-2 border-[var(--preone-border)] bg-[var(--preone-surface-secondary)] rounded-t-md',
  underlined:
    'border-b-2 border-[var(--preone-border)] bg-transparent rounded-none',
};

const sizeStyles: Record<OTPFieldSize, { box: string; text: string; gap: string }> = {
  sm: { box: 'h-10 w-10', text: 'text-sm', gap: 'gap-1.5' },
  md: { box: 'h-12 w-12', text: 'text-lg', gap: 'gap-2' },
  lg: { box: 'h-14 w-14', text: 'text-xl', gap: 'gap-3' },
};

/**
 * PreOne OTPField component combining OTP input with react-hook-form
 * integration. Each digit is in a separate input box with auto-focus
 * advancing. Supports variants, sizes, disabled/loading/dark modes, and ARIA.
 *
 * @example
 * ```tsx
 * <OTPField
 *   form={methods}
 *   name="otp"
 *   length={6}
 *   onComplete={(value) => verifyOTP(value)}
 * />
 * ```
 */
export const OTPField = React.forwardRef<
  HTMLDivElement,
  OTPFieldProps<any, any>
>(
  <T extends FieldValues, TName extends FieldPath<T>>(
    {
      form,
      name,
      length = 6,
      label,
      variant = 'outlined',
      size = 'md',
      disabled = false,
      loading = false,
      dark = false,
      required = false,
      helperText,
      onComplete,
      autoFocus = false,
      pattern = '[0-9]',
      className,
      ...props
    }: OTPFieldProps<T, TName>,
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const fieldId = React.useId();
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
    const error = form.formState.errors[name];
    const sizeConfig = sizeStyles[size];

    const handleKeyDown = React.useCallback(
      (
        e: React.KeyboardEvent<HTMLInputElement>,
        index: number,
        onChange: (value: string) => void,
        currentValue: string,
      ) => {
        if (e.key === 'Backspace') {
          if (!e.currentTarget.value && index > 0) {
            inputRefs.current[index - 1]?.focus();
          }
        } else if (e.key === 'ArrowLeft' && index > 0) {
          inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
          inputRefs.current[index + 1]?.focus();
        } else if (e.key === 'Delete') {
          const digits = currentValue.split('');
          digits[index] = '';
          const newValue = digits.join('');
          onChange(newValue);
        }
      },
      [length],
    );

    const handleInput = React.useCallback(
      (
        e: React.ChangeEvent<HTMLInputElement>,
        index: number,
        onChange: (value: string) => void,
        currentValue: string,
      ) => {
        const value = e.target.value;
        const digit = value.slice(-1);

        if (digit && !new RegExp(`^${pattern}$`).test(digit)) {
          return;
        }

        const digits = currentValue.split('');
        digits[index] = digit;
        const newValue = digits.join('');
        onChange(newValue);

        if (digit && index < length - 1) {
          inputRefs.current[index + 1]?.focus();
        }

        if (newValue.length === length && !newValue.includes('')) {
          onComplete?.(newValue);
        }
      },
      [length, onComplete, pattern],
    );

    const handlePaste = React.useCallback(
      (
        e: React.ClipboardEvent<HTMLInputElement>,
        index: number,
        onChange: (value: string) => void,
      ) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').trim();
        const regex = new RegExp(`^${pattern}$`);
        const validDigits = pasted.split('').filter((c) => regex.test(c));

        if (validDigits.length > 0) {
          const digits = Array(length).fill('');
          for (let i = 0; i < Math.min(validDigits.length, length - index); i++) {
            digits[index + i] = validDigits[i];
          }
          onChange(digits.join(''));

          const nextIndex = Math.min(index + validDigits.length, length - 1);
          inputRefs.current[nextIndex]?.focus();

          if (digits.every((d) => d !== '')) {
            onComplete?.(digits.join(''));
          }
        }
      },
      [length, onComplete, pattern],
    );

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
            className={cn(
              'font-medium text-sm text-[var(--preone-text-primary)]',
              required && "after:content-['*'] after:ml-0.5 after:text-[var(--preone-color-error)]",
              dark && 'text-[var(--preone-text-primary-dark)]',
            )}
          >
            {label}
          </label>
        )}

        <Controller
          name={name}
          control={form.control}
          render={({ field }) => {
            const value = (field.value as string) || '';
            const digits = value.padEnd(length, ' ').split('').slice(0, length);

            return (
              <div
                className={cn('flex items-center', sizeConfig.gap, loading && 'animate-pulse')}
                role="group"
                aria-label={label || 'OTP input'}
              >
                {Array.from({ length }, (_, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digits[i]?.trim() || ''}
                    disabled={disabled}
                    autoFocus={autoFocus && i === 0}
                    className={cn(
                      variantStyles[variant],
                      sizeConfig.box,
                      sizeConfig.text,
                      'text-center outline-none font-mono font-semibold',
                      'text-[var(--preone-text-primary)]',
                      'focus:ring-2 focus:ring-[var(--preone-color-primary)] focus:border-[var(--preone-color-primary)]',
                      error && 'border-[var(--preone-color-error)]',
                      dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)] text-[var(--preone-text-primary-dark)]',
                    )}
                    aria-label={`Digit ${i + 1} of ${length}`}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : helperText ? helperId : undefined}
                    onChange={(e) => handleInput(e, i, field.onChange, value)}
                    onKeyDown={(e) => handleKeyDown(e, i, field.onChange, value)}
                    onPaste={(e) => handlePaste(e, i, field.onChange)}
                    onFocus={(e) => e.target.select()}
                  />
                ))}
              </div>
            );
          }}
        />

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
  props: OTPFieldProps<T, TName> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

(OTPField as any).displayName = 'OTPField';
