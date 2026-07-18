import * as React from 'react';
import {
  Controller,
  type ControllerRenderProps,
  type ControllerFieldState,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { cn } from './cn.js';

/**
 * Variants for FormField styling.
 */
export type FormFieldVariant = 'default' | 'filled' | 'outlined';

/**
 * Sizes for FormField.
 */
export type FormFieldSize = 'sm' | 'md' | 'lg';

/**
 * Props for the FormField component.
 */
export interface FormFieldProps<
  T extends FieldValues,
  TName extends FieldPath<T>,
> extends Omit<import('react-hook-form').UseControllerProps<T, TName>, 'control'> {
  /** The form instance from useForm */
  form: UseFormReturn<T>;
  /** Label text for the field */
  label?: string;
  /** Helper text below the field */
  helperText?: string;
  /** Visual variant */
  variant?: FormFieldVariant;
  /** Size */
  size?: FormFieldSize;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is in loading state */
  loading?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Accessible description id override */
  'aria-describedby'?: string;
  /** Render function for the input */
  children: (field: {
    field: ControllerRenderProps<T, TName>;
    fieldState: ControllerFieldState;
    formState: UseFormReturn<T>['formState'];
    disabled: boolean;
    loading: boolean;
    size: FormFieldSize;
    variant: FormFieldVariant;
    dark: boolean;
  }) => React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const sizeStyles: Record<FormFieldSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

/**
 * PreOne FormField component connecting react-hook-form Controller
 * to UI input components with error states, ARIA attributes, and theming.
 *
 * @example
 * ```tsx
 * <FormField
 *   form={methods}
 *   name="email"
 *   label="Email"
 *   required
 * >
 *   {({ field }) => <input {...field} />}
 * </FormField>
 * ```
 */
export const FormField = React.forwardRef<
  HTMLDivElement,
  FormFieldProps<any, any>
>(
  <
    T extends FieldValues,
    TName extends FieldPath<T>,
  >(
    {
      form,
      name,
      label,
      helperText,
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      dark = false,
      required = false,
      children,
      className,
      'aria-describedby': ariaDescribedby,
      ...controllerProps
    }: FormFieldProps<T, TName>,
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const fieldId = React.useId();
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;
    const descriptionId = [helperText ? helperId : '', ariaDescribedby ?? '']
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-1.5',
          sizeStyles[size],
          disabled && 'opacity-60 pointer-events-none',
          dark && 'dark',
          className,
        )}
        data-field-variant={variant}
        data-field-size={size}
        data-dark={dark || undefined}
      >
        {label && (
          <label
            htmlFor={fieldId}
            className={cn(
              'font-medium text-[var(--preone-text-primary)]',
              required && "after:content-['*'] after:ml-0.5 after:text-[var(--preone-color-error)]",
              dark && 'text-[var(--preone-text-primary-dark)]',
            )}
          >
            {label}
          </label>
        )}

        <Controller
          {...controllerProps}
          name={name}
          control={form.control}
          render={(renderProps) => (
            <>
              <div
                className={cn(
                  loading && 'animate-pulse',
                )}
                aria-busy={loading}
              >
                {children({
                  ...renderProps,
                  disabled,
                  loading,
                  size,
                  variant,
                  dark,
                })}
              </div>

              {renderProps.fieldState.error && (
                <span
                  id={errorId}
                  role="alert"
                  className="text-sm text-[var(--preone-color-error)]"
                  aria-live="polite"
                >
                  {renderProps.fieldState.error.message}
                </span>
              )}

              {helperText && !renderProps.fieldState.error && (
                <span
                  id={helperId}
                  className="text-sm text-[var(--preone-text-secondary)]"
                >
                  {helperText}
                </span>
              )}
            </>
          )}
        />
      </div>
    );
  },
) as <T extends FieldValues, TName extends FieldPath<T>>(
  props: FormFieldProps<T, TName> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

(FormField as any).displayName = 'FormField';
