import * as React from 'react';
import { Controller, type UseFormReturn, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from './cn.js';

/**
 * Variants for PasswordField styling.
 */
export type PasswordFieldVariant = 'default' | 'outlined' | 'filled';

/**
 * Sizes for PasswordField.
 */
export type PasswordFieldSize = 'sm' | 'md' | 'lg';

/**
 * Password strength levels.
 */
export type PasswordStrength = 'none' | 'weak' | 'fair' | 'good' | 'strong';

/**
 * Props for the PasswordField component.
 */
export interface PasswordFieldProps<
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
  /** Visual variant */
  variant?: PasswordFieldVariant;
  /** Size */
  size?: PasswordFieldSize;
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
  /** Whether to show the strength indicator */
  showStrength?: boolean;
  /** Custom strength calculator */
  strengthCalculator?: (value: string) => PasswordStrength;
  /** Show/hide password toggle */
  showToggle?: boolean;
  /** Minimum length for password */
  minLength?: number;
}

const variantStyles: Record<PasswordFieldVariant, string> = {
  default:
    'border border-[var(--preone-border)] bg-[var(--preone-surface)] rounded-md',
  outlined:
    'border-2 border-[var(--preone-border)] bg-transparent rounded-md',
  filled:
    'border-b-2 border-[var(--preone-border)] bg-[var(--preone-surface-secondary)] rounded-t-md',
};

const sizeStyles: Record<PasswordFieldSize, string> = {
  sm: 'h-8 text-sm px-2',
  md: 'h-10 text-base px-3',
  lg: 'h-12 text-lg px-4',
};

const strengthConfig: Record<
  PasswordStrength,
  { label: string; color: string; width: string }
> = {
  none: { label: '', color: 'bg-transparent', width: 'w-0' },
  weak: { label: 'Weak', color: 'bg-[var(--preone-color-error)]', width: 'w-1/4' },
  fair: { label: 'Fair', color: 'bg-[var(--preone-color-warning)]', width: 'w-2/4' },
  good: { label: 'Good', color: 'bg-[var(--preone-color-info)]', width: 'w-3/4' },
  strong: { label: 'Strong', color: 'bg-[var(--preone-color-success)]', width: 'w-full' },
};

const defaultStrengthCalculator = (value: string): PasswordStrength => {
  if (!value) return 'none';
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^a-zA-Z0-9]/.test(value)) score++;

  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3) return 'good';
  return 'strong';
};

/**
 * PreOne PasswordField component with strength indicator and
 * react-hook-form integration. Includes show/hide toggle, strength meter,
 * variants, sizes, disabled/loading/dark modes, and ARIA.
 *
 * @example
 * ```tsx
 * <PasswordField
 *   form={methods}
 *   name="password"
 *   label="Password"
 *   showStrength
 *   required
 * />
 * ```
 */
export const PasswordField = React.forwardRef<
  HTMLDivElement,
  PasswordFieldProps<any, any>
>(
  <T extends FieldValues, TName extends FieldPath<T>>(
    {
      form,
      name,
      label,
      placeholder = 'Enter password',
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      dark = false,
      required = false,
      helperText,
      showStrength = false,
      strengthCalculator = defaultStrengthCalculator,
      showToggle = true,
      minLength,
      className,
      ...props
    }: PasswordFieldProps<T, TName>,
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const fieldId = React.useId();
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;
    const [isVisible, setIsVisible] = React.useState(false);
    const [strength, setStrength] = React.useState<PasswordStrength>('none');

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
            'flex items-stretch relative',
            variantStyles[variant],
            error && 'border-[var(--preone-color-error)]',
            loading && 'animate-pulse',
            'focus-within:ring-2 focus-within:ring-[var(--preone-color-primary)] focus-within:border-[var(--preone-color-primary)]',
            dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
          )}
        >
          <Controller
            name={name}
            control={form.control}
            render={({ field }) => (
              <input
                {...field}
                id={fieldId}
                type={isVisible ? 'text' : 'password'}
                placeholder={placeholder}
                disabled={disabled}
                minLength={minLength}
                className={cn(
                  'flex-1 outline-none bg-transparent text-[var(--preone-text-primary)]',
                  sizeStyles[size],
                  showToggle ? 'pr-10' : '',
                  'placeholder:text-[var(--preone-text-tertiary)]',
                  dark && 'text-[var(--preone-text-primary-dark)]',
                )}
                aria-invalid={!!error}
                aria-describedby={
                  error ? errorId : helperText ? helperId : undefined
                }
                onChange={(e) => {
                  field.onChange(e);
                  if (showStrength) {
                    setStrength(strengthCalculator(e.target.value));
                  }
                }}
              />
            )}
          />

          {showToggle && (
            <button
              type="button"
              onClick={() => setIsVisible(!isVisible)}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded',
                'text-[var(--preone-text-secondary)] hover:text-[var(--preone-text-primary)]',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
                dark && 'text-[var(--preone-text-secondary-dark)]',
              )}
              aria-label={isVisible ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {isVisible ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.092 1.092a4 4 0 0 0-5.558-5.558Z" clipRule="evenodd" />
                  <path d="m10.748 13.93 2.523 2.523A9.987 9.987 0 0 1 10 17a10.004 10.004 0 0 1-9.956-10.53A10.004 10.004 0 0 1 2.42 4.602l2.362 2.362a4 4 0 0 0 5.966 5.966Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}
        </div>

        {showStrength && strength !== 'none' && (
          <div className="flex flex-col gap-1" aria-label={`Password strength: ${strengthConfig[strength].label}`}>
            <div className="h-1.5 w-full rounded-full bg-[var(--preone-border)] overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  strengthConfig[strength].color,
                  strengthConfig[strength].width,
                )}
                role="progressbar"
                aria-valuenow={
                  strength === 'weak' ? 25 : strength === 'fair' ? 50 : strength === 'good' ? 75 : 100
                }
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                strength === 'weak' && 'text-[var(--preone-color-error)]',
                strength === 'fair' && 'text-[var(--preone-color-warning)]',
                strength === 'good' && 'text-[var(--preone-color-info)]',
                strength === 'strong' && 'text-[var(--preone-color-success)]',
              )}
            >
              {strengthConfig[strength].label}
            </span>
          </div>
        )}

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
  props: PasswordFieldProps<T, TName> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

(PasswordField as any).displayName = 'PasswordField';
