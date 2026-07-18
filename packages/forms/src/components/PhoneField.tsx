'use client';

import React, { forwardRef, useId } from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing, borderWidth } from '@preone/design-tokens';

export interface PhoneFieldProps<
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
  /** Default country code */
  defaultCountryCode?: string;
  /** Placeholder */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

interface CountryOption {
  code: string;
  label: string;
  dialCode: string;
}

const commonCountries: CountryOption[] = [
  { code: 'US', label: '🇺🇸 +1', dialCode: '+1' },
  { code: 'GB', label: '🇬🇧 +44', dialCode: '+44' },
  { code: 'DE', label: '🇩🇪 +49', dialCode: '+49' },
  { code: 'FR', label: '🇫🇷 +33', dialCode: '+33' },
  { code: 'JP', label: '🇯🇵 +81', dialCode: '+81' },
  { code: 'CN', label: '🇨🇳 +86', dialCode: '+86' },
  { code: 'IN', label: '🇮🇳 +91', dialCode: '+91' },
  { code: 'AU', label: '🇦🇺 +61', dialCode: '+61' },
  { code: 'CA', label: '🇨🇦 +1', dialCode: '+1' },
  { code: 'BR', label: '🇧🇷 +55', dialCode: '+55' },
  { code: 'KR', label: '🇰🇷 +82', dialCode: '+82' },
  { code: 'MX', label: '🇲🇽 +52', dialCode: '+52' },
  { code: 'IT', label: '🇮🇹 +39', dialCode: '+39' },
  { code: 'ES', label: '🇪🇸 +34', dialCode: '+34' },
  { code: 'NL', label: '🇳🇱 +31', dialCode: '+31' },
  { code: 'SE', label: '🇸🇪 +46', dialCode: '+46' },
  { code: 'CH', label: '🇨🇭 +41', dialCode: '+41' },
  { code: 'SG', label: '🇸🇬 +65', dialCode: '+65' },
];

interface PhoneValue {
  countryCode: string;
  number: string;
  full: string;
}

/**
 * Basic phone number formatting.
 * Strips non-digits and formats common patterns.
 */
function formatPhoneNumber(value: string, countryCode: string): string {
  const digits = value.replace(/\D/g, '');

  if (countryCode === 'US' || countryCode === 'CA') {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  if (countryCode === 'GB') {
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)} ${digits.slice(4, 14)}`;
  }

  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4));
  }
  return groups.join(' ');
}

function PhoneFieldInner<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  {
    name,
    control,
    label,
    description,
    required = false,
    defaultCountryCode = 'US',
    placeholder = '(000) 000-0000',
    disabled = false,
    className,
    style,
  }: PhoneFieldProps<T, TName>,
  ref: React.Ref<HTMLDivElement>
) {
  const autoId = useId();
  const inputId = `${name}-${autoId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

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

  const inputContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: disabled ? colors.neutral[50] : '#fff',
    border: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
    borderRadius: radius.md,
    overflow: 'hidden',
    transition: `border-color ${duration.fast} ${easing.DEFAULT}`,
  };

  const selectStyle: React.CSSProperties = {
    height: '40px',
    padding: `0 ${spacing[2]} 0 ${spacing[3]}`,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.sans,
    color: colors.neutral[700],
    backgroundColor: colors.neutral[50],
    border: 'none',
    borderRight: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
    outline: 'none',
    appearance: 'none' as const,
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...(disabled ? { opacity: 0.6 } : {}),
  };

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
    <div ref={ref} className={cn('preone-phone-field', className)} style={wrapperStyle}>
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
        render={({ field: { onChange, value, ref: fieldRef }, fieldState: { error } }) => {
          const phoneValue: PhoneValue = value || { countryCode: defaultCountryCode, number: '', full: '' };
          const countryCode = phoneValue.countryCode || defaultCountryCode;
          const phoneNumber = phoneValue.number || '';
          const selectedCountry = commonCountries.find((c) => c.code === countryCode) ?? commonCountries[0]!;

          const handleCountryChange = (newCode: string) => {
            const newCountry = commonCountries.find((c) => c.code === newCode);
            onChange({
              countryCode: newCode,
              number: phoneNumber,
              full: `${newCountry?.dialCode || ''}${phoneNumber.replace(/\D/g, '')}`,
            });
          };

          const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const rawDigits = e.target.value.replace(/\D/g, '');
            const formatted = formatPhoneNumber(rawDigits, countryCode);
            onChange({
              countryCode,
              number: formatted,
              full: `${selectedCountry.dialCode}${rawDigits}`,
            });
          };

          return (
            <>
              <div
                style={{
                  ...inputContainerStyle,
                  ...(error ? { borderColor: colors.red[300] } : {}),
                }}
              >
                <select
                  value={countryCode}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  style={selectStyle}
                  disabled={disabled}
                  aria-label="Country code"
                >
                  {commonCountries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  ref={fieldRef}
                  id={inputId}
                  type="tel"
                  style={inputStyle}
                  value={phoneNumber}
                  onChange={handleNumberChange}
                  placeholder={placeholder}
                  disabled={disabled}
                  aria-invalid={!!error}
                  aria-describedby={cn(error ? errorId : '', description ? helperId : '') || undefined}
                />
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

export const PhoneField = forwardRef(PhoneFieldInner) as <
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  props: PhoneFieldProps<T, TName> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(PhoneField as any).displayName = 'PhoneField';
