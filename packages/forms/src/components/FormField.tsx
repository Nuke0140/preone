'use client';

import React, { forwardRef, useId } from 'react';
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type ControllerRenderProps,
} from 'react-hook-form';
import { cn } from '@preone/ui';
import { spacing } from '@preone/design-tokens';
import { Label } from './Label';
import { ErrorMessage } from './ErrorMessage';
import { HelperText } from './HelperText';

export interface FormFieldProps<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
> extends Omit<ControllerProps<T, TName>, 'render'> {
  /** Field label text */
  label?: string;
  /** Helper text below the field */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Render function for the field input */
  children: (
    field: ControllerRenderProps<T, TName>,
    fieldState: { invalid: boolean; isTouched: boolean; isDirty: boolean; error?: { message?: string } }
  ) => React.ReactNode;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
  /** Field size */
  size?: 'sm' | 'md' | 'lg';
}

function FormFieldInner<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  {
    label,
    description,
    required = false,
    children,
    className,
    style,
    size = 'md',
    name,
    control,
    rules,
    ...controllerProps
  }: FormFieldProps<T, TName>,
  ref: React.Ref<HTMLDivElement>
) {
  const autoId = useId();
  const fieldId = `${name}-${autoId}`;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1.5],
    ...style,
  };

  return (
    <div ref={ref} className={cn('preone-form-field', className)} style={wrapperStyle}>
      {label && (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}
      <Controller
        name={name}
        control={control}
        rules={{
          ...rules,
          ...(required && !rules?.required ? { required: `${label || name} is required` } : {}),
        }}
        {...controllerProps}
        render={({ field, fieldState }) => (
          <>
            {children(
              field,
              {
                invalid: fieldState.invalid,
                isTouched: fieldState.isTouched,
                isDirty: fieldState.isDirty,
                error: fieldState.error
                  ? { message: fieldState.error.message }
                  : undefined,
              }
            )}
            {fieldState.error && (
              <ErrorMessage id={errorId}>
                {fieldState.error.message}
              </ErrorMessage>
            )}
            {!fieldState.error && description && (
              <HelperText id={helperId}>{description}</HelperText>
            )}
          </>
        )}
      />
    </div>
  );
}

export const FormField = forwardRef(FormFieldInner) as <
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  props: FormFieldProps<T, TName> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(FormField as any).displayName = 'FormField';
