import * as React from 'react';
import {
  useForm as useRHF,
  FormProvider as RHCFormProvider,
  type UseFormReturn,
  type UseFormProps,
  type FieldValues,
  type DefaultValues,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ZodSchema } from 'zod';
import { cn } from './cn.js';

/**
 * Variants for the Form container styling.
 */
export type FormVariant = 'default' | 'card' | 'inline';

/**
 * Sizes for the Form spacing and typography.
 */
export type FormSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Form component.
 */
export interface FormProps<T extends FieldValues>
  extends Omit<React.HTMLAttributes<HTMLFormElement>, 'onSubmit' | 'children' | 'onError'> {
  /** Zod schema for validation */
  schema?: ZodSchema<T>;
  /** Default values for the form fields */
  defaultValues?: DefaultValues<T>;
  /** react-hook-form configuration overrides */
  formConfig?: Omit<UseFormProps<T>, 'defaultValues' | 'resolver'>;
  /** Called on valid form submission */
  onSubmit: (values: T, methods: UseFormReturn<T>) => void | Promise<void>;
  /** Called when validation fails */
  onError?: (errors: Record<string, unknown>) => void;
  /** Visual variant */
  variant?: FormVariant;
  /** Size of form spacing */
  size?: FormSize;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Whether the form is in loading state */
  loading?: boolean;
  /** Whether to use dark mode styling */
  dark?: boolean;
  /** Accessible form name */
  'aria-label'?: string;
  /** Accessible form description */
  'aria-describedby'?: string;
  /** Children render function receiving form methods, or ReactNode */
  children: React.ReactNode | ((methods: UseFormReturn<T>) => React.ReactNode);
}

const variantStyles: Record<FormVariant, string> = {
  default: '',
  card:
    'rounded-lg border border-[var(--preone-border)] bg-[var(--preone-surface)] p-6 shadow-sm',
  inline: 'flex items-end gap-3',
};

const sizeStyles: Record<FormSize, string> = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

/**
 * PreOne Form component wrapping react-hook-form's useForm and FormProvider.
 * Supports Zod schema validation, variants, sizes, loading/disabled/dark modes,
 * and full ARIA accessibility.
 *
 * @example
 * ```tsx
 * <Form schema={mySchema} defaultValues={{ email: '' }} onSubmit={handleSubmit}>
 *   {({ register }) => <input {...register('email')} />}
 * </Form>
 * ```
 */
export const Form = React.forwardRef<HTMLFormElement, FormProps<any>>(
  <T extends FieldValues>(
    {
      schema,
      defaultValues,
      formConfig,
      onSubmit,
      onError,
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      dark = false,
      className,
      children,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedby,
      ...props
    }: FormProps<T>,
    ref: React.Ref<HTMLFormElement>,
  ) => {
    const methods = useRHF<T>({
      ...formConfig,
      defaultValues,
      resolver: schema ? zodResolver(schema) : undefined,
    });

    const handleSubmit = methods.handleSubmit(async (values) => {
      try {
        await onSubmit(values, methods);
      } catch (err) {
        // Propagate to caller
        throw err;
      }
    }, onError);

    return (
      <RHCFormProvider {...methods}>
        <form
          ref={ref}
          onSubmit={handleSubmit}
          className={cn(
            'flex flex-col',
            variantStyles[variant],
            sizeStyles[size],
            dark && 'dark',
            disabled && 'pointer-events-none opacity-60',
            loading && 'animate-pulse',
            className,
          )}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedby}
          aria-busy={loading}
          aria-disabled={disabled}
          data-form-variant={variant}
          data-form-size={size}
          data-dark={dark || undefined}
          noValidate
          {...props}
        >
          {typeof children === 'function' ? children(methods) : children}
        </form>
      </RHCFormProvider>
    );
  },
) as <T extends FieldValues>(
  props: FormProps<T> & React.RefAttributes<HTMLFormElement>,
) => React.ReactElement | null;

(Form as any).displayName = 'Form';

export { RHCFormProvider as FormProvider };
export type { UseFormReturn };
