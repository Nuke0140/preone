'use client';

import React, { forwardRef, useState, useId } from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing, borderWidth } from '@preone/design-tokens';

export interface DateFieldProps<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
> {
  /** Field name for react-hook-form */
  name: TName;
  /** Control from useForm */
  control: import('react-hook-form').Control<T>;
  /** Label */
  label?: string;
  /** Helper text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Date format for display */
  format?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
  /** Minimum date */
  min?: string;
  /** Maximum date */
  max?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Placeholder */
  placeholder?: string;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

const CalendarIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

function DateFieldInner<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  {
    name,
    control,
    label,
    description,
    required = false,
    format = 'YYYY-MM-DD',
    min,
    max,
    disabled = false,
    placeholder,
    className,
    style,
  }: DateFieldProps<T, TName>,
  ref: React.Ref<HTMLDivElement>
) {
  const autoId = useId();
  const inputId = `${name}-${autoId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const [isFocused, setIsFocused] = useState(false);

  const placeholderMap: Record<string, string> = {
    'YYYY-MM-DD': 'yyyy-mm-dd',
    'DD/MM/YYYY': 'dd/mm/yyyy',
    'MM/DD/YYYY': 'mm/dd/yyyy',
  };

  const effectivePlaceholder = placeholder || placeholderMap[format];

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1.5],
    ...style,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.neutral[700],
    fontFamily: fontFamily.sans,
  };

  const inputContainerStyle = (hasError: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    backgroundColor: disabled ? colors.neutral[50] : '#fff',
    border: `${borderWidth.DEFAULT} solid ${hasError ? colors.red[300] : isFocused ? colors.neutral[400] : colors.neutral[200]}`,
    borderRadius: radius.md,
    overflow: 'hidden',
    transition: `border-color ${duration.fast} ${easing.DEFAULT}, box-shadow ${duration.fast} ${easing.DEFAULT}`,
    ...(isFocused && !hasError ? { boxShadow: `0 0 0 3px ${colors.neutral[100]}` } : {}),
    ...(hasError && isFocused ? { boxShadow: `0 0 0 3px ${colors.red[50]}` } : {}),
  });

  const inputStyle: React.CSSProperties = {
    flex: 1,
    height: '40px',
    padding: `0 ${spacing[3]}`,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.sans,
    color: colors.neutral[900],
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    width: '100%',
    ...(disabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}),
  };

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `0 ${spacing[3]} 0 0`,
    color: colors.neutral[400],
    pointerEvents: 'none',
  };

  const errorTextStyle: React.CSSProperties = {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.sans,
    color: colors.red[600],
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
  };

  const helperTextStyle: React.CSSProperties = {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.sans,
    color: colors.neutral[500],
  };

  return (
    <div ref={ref} className={cn('preone-date-field', className)} style={wrapperStyle}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
          {required && (
            <span style={{ color: colors.red[500], fontWeight: fontWeight.bold, marginLeft: spacing[0.5] }} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <Controller
        name={name}
        control={control}
        rules={{
          ...(required ? { required: `${label || name} is required` } : {}),
        }}
        render={({ field: { onChange, value, ref: fieldRef }, fieldState: { error } }) => (
          <>
            <div style={inputContainerStyle(!!error)}>
              <input
                ref={fieldRef}
                id={inputId}
                type="date"
                style={inputStyle}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                min={min}
                max={max}
                disabled={disabled}
                aria-invalid={!!error}
                aria-describedby={cn(error ? errorId : '', description ? helperId : '') || undefined}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={effectivePlaceholder}
              />
              <span style={iconStyle}>
                <CalendarIcon />
              </span>
            </div>
            {error && (
              <span id={errorId} style={errorTextStyle} role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error.message}
              </span>
            )}
            {!error && description && (
              <span id={helperId} style={helperTextStyle}>{description}</span>
            )}
          </>
        )}
      />
    </div>
  );
}

export const DateField = forwardRef(DateFieldInner) as <
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  props: DateFieldProps<T, TName> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(DateField as any).displayName = 'DateField';
