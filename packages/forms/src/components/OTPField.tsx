'use client';

import React, { forwardRef, useRef, useId } from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing, borderWidth } from '@preone/design-tokens';

export interface OTPFieldProps<
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
  /** Number of OTP digits */
  length?: number;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Placeholder character */
  placeholderChar?: string;
  /** Called when all digits are filled */
  onComplete?: (otp: string) => void;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

function OTPFieldInner<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  {
    name,
    control,
    label,
    description,
    required = false,
    length = 6,
    disabled = false,
    placeholderChar = '',
    onComplete,
    className,
    style,
  }: OTPFieldProps<T, TName>,
  ref: React.Ref<HTMLDivElement>
) {
  const autoId = useId();
  const inputId = `${name}-${autoId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  const boxStyle = (hasValue: boolean, isFocused: boolean, hasError: boolean): React.CSSProperties => ({
    width: '48px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.mono,
    color: colors.neutral[900],
    backgroundColor: disabled ? colors.neutral[50] : '#fff',
    border: `${borderWidth.DEFAULT} solid ${hasError ? colors.red[300] : isFocused ? colors.neutral[400] : hasValue ? colors.neutral[300] : colors.neutral[200]}`,
    borderRadius: radius.lg,
    outline: 'none',
    textAlign: 'center' as const,
    caretColor: 'transparent',
    transition: `border-color ${duration.fast} ${easing.DEFAULT}, box-shadow ${duration.fast} ${easing.DEFAULT}`,
    ...(isFocused && !hasError ? { boxShadow: `0 0 0 3px ${colors.neutral[100]}` } : {}),
    ...(hasError && isFocused ? { boxShadow: `0 0 0 3px ${colors.red[50]}` } : {}),
    ...(disabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}),
  });

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing[2],
    justifyContent: 'center',
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
    textAlign: 'center' as const,
  };

  return (
    <div ref={ref} className={cn('preone-otp-field', className)} style={wrapperStyle}>
      {label && (
        <label style={labelStyle}>
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
        render={({ field: { onChange, value }, fieldState: { error } }) => {
          const otpValue = value || '';
          const digits = otpValue.split('').concat(Array(length).fill('')).slice(0, length);

          const handleChange = (index: number, char: string) => {
            if (char && !/^\d$/.test(char)) return;

            const newDigits = [...digits];
            newDigits[index] = char;
            const newValue = newDigits.join('');
            onChange(newValue);

            if (char && index < length - 1) {
              inputRefs.current[index + 1]?.focus();
            }

            if (newValue.length === length && !newValue.includes('')) {
              onComplete?.(newValue);
            }
          };

          const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Backspace') {
              if (!digits[index] && index > 0) {
                const newDigits = [...digits];
                newDigits[index - 1] = '';
                onChange(newDigits.join(''));
                inputRefs.current[index - 1]?.focus();
              } else {
                const newDigits = [...digits];
                newDigits[index] = '';
                onChange(newDigits.join(''));
              }
              e.preventDefault();
            } else if (e.key === 'ArrowLeft' && index > 0) {
              inputRefs.current[index - 1]?.focus();
              e.preventDefault();
            } else if (e.key === 'ArrowRight' && index < length - 1) {
              inputRefs.current[index + 1]?.focus();
              e.preventDefault();
            } else if (e.key === 'Delete') {
              const newDigits = [...digits];
              newDigits[index] = '';
              onChange(newDigits.join(''));
              e.preventDefault();
            }
          };

          const handlePaste = (e: React.ClipboardEvent) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (pastedData.length > 0) {
              onChange(pastedData);
              const focusIndex = Math.min(pastedData.length, length - 1);
              inputRefs.current[focusIndex]?.focus();

              if (pastedData.length === length) {
                onComplete?.(pastedData);
              }
            }
          };

          const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            e.target.select();
          };

          return (
            <>
              <div
                style={containerStyle}
                role="group"
                aria-label={label || 'OTP input'}
              >
                {Array.from({ length }, (_, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    id={`${inputId}-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    style={boxStyle(!!digits[index], false, !!error)}
                    value={digits[index] || ''}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    onFocus={handleFocus}
                    disabled={disabled}
                    placeholder={placeholderChar}
                    aria-label={`Digit ${index + 1} of ${length}`}
                    aria-invalid={!!error}
                    autoComplete="one-time-code"
                  />
                ))}
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
          );
        }}
      />
    </div>
  );
}

export const OTPField = forwardRef(OTPFieldInner) as <
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  props: OTPFieldProps<T, TName> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(OTPField as any).displayName = 'OTPField';
