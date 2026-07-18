'use client';

import React, { forwardRef } from 'react';
import {
  useForm,
  FormProvider as RHFProvider,
  type UseFormReturn,
  type FieldValues,
  type DefaultValues,
  type Mode,
  type SubmitHandler,
  type SubmitErrorHandler,
} from 'react-hook-form';
import { cn } from '@preone/ui';
import { spacing, fontFamily } from '@preone/design-tokens';

export interface FormProps<T extends FieldValues = FieldValues>
  extends Omit<React.HTMLAttributes<HTMLFormElement>, 'onSubmit' | 'children' | 'onError'> {
  /** Form submission handler */
  onSubmit: SubmitHandler<T>;
  /** Called when validation fails before submission */
  onError?: SubmitErrorHandler<T>;
  /** Default values for form fields */
  defaultValues?: DefaultValues<T>;
  /** Validation mode */
  mode?: Mode;
  /** Re-validate mode */
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
  /** Whether to trigger validation when fields change */
  criteriaMode?: 'firstError' | 'all';
  /** Whether to focus the first error field on submission */
  shouldFocusError?: boolean;
  /** Whether to use native browser validation */
  noValidate?: boolean;
  /** Access the form methods from outside */
  formRef?: React.RefObject<UseFormReturn<T> | null>;
  /** Form content */
  children: React.ReactNode | ((methods: UseFormReturn<T>) => React.ReactNode);
}

function FormInner<T extends FieldValues = FieldValues>(
  {
    onSubmit,
    onError,
    defaultValues,
    mode = 'onSubmit',
    reValidateMode = 'onChange',
    criteriaMode = 'firstError',
    shouldFocusError = true,
    noValidate = true,
    formRef,
    children,
    className,
    style,
    ...props
  }: FormProps<T>,
  ref: React.Ref<HTMLFormElement>
) {
  const methods = useForm<T>({
    defaultValues,
    mode,
    reValidateMode,
    criteriaMode,
    shouldFocusError,
  });

  React.useImperativeHandle(formRef, () => methods, [methods]);

  const handleSubmit = methods.handleSubmit(onSubmit, onError);

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[5],
    fontFamily: fontFamily.sans,
    ...style,
  };

  return (
    <RHFProvider {...methods}>
      <form
        ref={ref}
        className={cn('preone-form', className)}
        style={formStyle}
        onSubmit={handleSubmit}
        noValidate={noValidate}
        {...props}
      >
        {typeof children === 'function' ? children(methods) : children}
      </form>
    </RHFProvider>
  );
}

export const Form = forwardRef(FormInner) as <T extends FieldValues = FieldValues>(
  props: FormProps<T> & { ref?: React.Ref<HTMLFormElement> }
) => React.ReactElement | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Form as any).displayName = 'Form';

/**
 * Re-export useFormContext for consumers
 */
export { useFormContext, type UseFormReturn } from 'react-hook-form';
