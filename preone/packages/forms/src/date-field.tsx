import * as React from 'react';
import { Controller, type UseFormReturn, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from './cn.js';

/**
 * Variants for DateField styling.
 */
export type DateFieldVariant = 'default' | 'outlined' | 'filled';

/**
 * Sizes for DateField.
 */
export type DateFieldSize = 'sm' | 'md' | 'lg';

/**
 * Props for the DateField component.
 */
export interface DateFieldProps<
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
  variant?: DateFieldVariant;
  /** Size */
  size?: DateFieldSize;
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
  /** Minimum date */
  min?: string;
  /** Maximum date */
  max?: string;
  /** Date format for display */
  format?: 'date' | 'datetime-local' | 'month' | 'time';
  /** Show clear button */
  clearable?: boolean;
}

const variantStyles: Record<DateFieldVariant, string> = {
  default:
    'border border-[var(--preone-border)] bg-[var(--preone-surface)] rounded-md',
  outlined:
    'border-2 border-[var(--preone-border)] bg-transparent rounded-md',
  filled:
    'border-b-2 border-[var(--preone-border)] bg-[var(--preone-surface-secondary)] rounded-t-md',
};

const sizeStyles: Record<DateFieldSize, string> = {
  sm: 'h-8 text-sm px-2',
  md: 'h-10 text-base px-3',
  lg: 'h-12 text-lg px-4',
};

/**
 * PreOne DateField component combining a date picker input with
 * react-hook-form integration. Supports native date/datetime/time inputs,
 * variants, sizes, disabled/loading/dark modes, and ARIA.
 *
 * @example
 * ```tsx
 * <DateField
 *   form={methods}
 *   name="birthDate"
 *   label="Date of Birth"
 *   format="date"
 *   max="2010-12-31"
 *   required
 * />
 * ```
 */
export const DateField = React.forwardRef<
  HTMLDivElement,
  DateFieldProps<any, any>
>(
  <T extends FieldValues, TName extends FieldPath<T>>(
    {
      form,
      name,
      label,
      placeholder,
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      dark = false,
      required = false,
      helperText,
      min,
      max,
      format = 'date',
      clearable = false,
      className,
      ...props
    }: DateFieldProps<T, TName>,
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const fieldId = React.useId();
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;
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

        <div className="relative">
          <div
            className={cn(
              'flex items-center',
              variantStyles[variant],
              error && 'border-[var(--preone-color-error)]',
              loading && 'animate-pulse',
              'focus-within:ring-2 focus-within:ring-[var(--preone-color-primary)] focus-within:border-[var(--preone-color-primary)]',
              dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
            )}
          >
            <div className="flex items-center pl-3 pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={cn(
                  'text-[var(--preone-text-secondary)]',
                  size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
                )}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 16.25 18H3.75A2.75 2.75 0 0 1 1 15.25v-8.5A2.75 2.75 0 0 1 3.75 4H4V2.75A.75.75 0 0 1 4.75 2h1Zm11 6.5H3.25v6.75c0 .69.56 1.25 1.25 1.25h12.5c.69 0 1.25-.56 1.25-1.25V8.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <Controller
              name={name}
              control={form.control}
              render={({ field }) => (
                <input
                  {...field}
                  id={fieldId}
                  type={format}
                  placeholder={placeholder}
                  disabled={disabled}
                  min={min}
                  max={max}
                  className={cn(
                    'flex-1 outline-none bg-transparent text-[var(--preone-text-primary)]',
                    sizeStyles[size],
                    'placeholder:text-[var(--preone-text-tertiary)]',
                    dark && 'text-[var(--preone-text-primary-dark)]',
                    '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
                  )}
                  aria-invalid={!!error}
                  aria-describedby={
                    error ? errorId : helperText ? helperId : undefined
                  }
                  value={field.value ?? ''}
                />
              )}
            />

            {clearable && (
              <Controller
                name={name}
                control={form.control}
                render={({ field }) => (
                  <>
                    {field.value ? (
                      <button
                        type="button"
                        onClick={() => field.onChange('')}
                        className="flex items-center pr-3 text-[var(--preone-text-secondary)] hover:text-[var(--preone-text-primary)] transition-colors"
                        aria-label="Clear date"
                        tabIndex={-1}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                      </button>
                    ) : null}
                  </>
                )}
              />
            )}
          </div>
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
  props: DateFieldProps<T, TName> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

(DateField as any).displayName = 'DateField';
