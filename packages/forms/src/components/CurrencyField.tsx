'use client';

import React, { forwardRef, useState, useId } from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing, borderWidth } from '@preone/design-tokens';

export interface CurrencyFieldProps<
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
  /** Currency code */
  currency?: string;
  /** Locale for formatting */
  locale?: string;
  /** Placeholder */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

interface CurrencyInfo {
  symbol: string;
  code: string;
  locale: string;
}

const currencyMap: Record<string, CurrencyInfo> = {
  USD: { symbol: '$', code: 'USD', locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', locale: 'de-DE' },
  GBP: { symbol: '£', code: 'GBP', locale: 'en-GB' },
  JPY: { symbol: '¥', code: 'JPY', locale: 'ja-JP' },
  CNY: { symbol: '¥', code: 'CNY', locale: 'zh-CN' },
  KRW: { symbol: '₩', code: 'KRW', locale: 'ko-KR' },
  INR: { symbol: '₹', code: 'INR', locale: 'en-IN' },
  BRL: { symbol: 'R$', code: 'BRL', locale: 'pt-BR' },
  CAD: { symbol: 'C$', code: 'CAD', locale: 'en-CA' },
  AUD: { symbol: 'A$', code: 'AUD', locale: 'en-AU' },
  CHF: { symbol: 'CHF', code: 'CHF', locale: 'de-CH' },
  SEK: { symbol: 'kr', code: 'SEK', locale: 'sv-SE' },
};

function formatCurrencyValue(value: string): string {
  const stripped = value.replace(/[^0-9.,]/g, '');
  const normalized = stripped.replace(/,/g, '.');
  const parts = normalized.split('.');
  const integer = parts[0];
  const decimal = parts.length > 1 ? `.${parts.slice(1).join('').slice(0, 2)}` : '';

  if (!integer && !decimal) return '';
  return integer + decimal;
}

function getDisplayValue(value: string | number, _currency: string, locale: string): string {
  if (value === '' || value === undefined || value === null) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  try {
    return num.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return num.toFixed(2);
  }
}

function CurrencyFieldInner<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  {
    name,
    control,
    label,
    description,
    required = false,
    currency = 'USD',
    locale,
    placeholder = '0.00',
    disabled = false,
    min,
    max,
    className,
    style,
  }: CurrencyFieldProps<T, TName>,
  ref: React.Ref<HTMLDivElement>
) {
  const autoId = useId();
  const inputId = `${name}-${autoId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const [isFocused, setIsFocused] = useState(false);

  const currencyInfo = currencyMap[currency] ?? currencyMap['USD']!;
  const effectiveLocale = locale || currencyInfo.locale;

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

  const symbolStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: `0 0 0 ${spacing[3]}`,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.neutral[500],
    fontFamily: fontFamily.sans,
    userSelect: 'none',
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
    textAlign: 'right' as const,
    ...(disabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}),
  };

  const currencySelectStyle: React.CSSProperties = {
    height: '40px',
    padding: `0 ${spacing[2]} 0 ${spacing[1]}`,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.medium,
    color: colors.neutral[500],
    backgroundColor: colors.neutral[50],
    border: 'none',
    borderLeft: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...(disabled ? { opacity: 0.6 } : {}),
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
    <div ref={ref} className={cn('preone-currency-field', className)} style={wrapperStyle}>
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
          ...(min !== undefined ? { min: { value: min, message: `Minimum value is ${min}` } } : {}),
          ...(max !== undefined ? { max: { value: max, message: `Maximum value is ${max}` } } : {}),
        }}
        render={({ field: { onChange, value, ref: fieldRef }, fieldState: { error } }) => {
          const [displayValue, setDisplayValue] = useState<string>(
            value ? getDisplayValue(value, currency, effectiveLocale) : ''
          );

          const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = formatCurrencyValue(e.target.value);
            setDisplayValue(raw);
            const numValue = raw === '' ? '' : parseFloat(raw);
            onChange(numValue === '' ? undefined : numValue);
          };

          const handleBlur = () => {
            setIsFocused(false);
            if (value !== undefined && value !== '') {
              setDisplayValue(getDisplayValue(value, currency, effectiveLocale));
            }
          };

          const handleFocus = () => {
            setIsFocused(true);
            if (value !== undefined && value !== '') {
              setDisplayValue(String(value));
            }
          };

          return (
            <>
              <div style={inputContainerStyle(!!error)}>
                <span style={symbolStyle}>{currencyInfo.symbol}</span>
                <input
                  ref={fieldRef}
                  id={inputId}
                  type="text"
                  inputMode="decimal"
                  style={inputStyle}
                  value={displayValue}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onFocus={handleFocus}
                  placeholder={placeholder}
                  disabled={disabled}
                  aria-invalid={!!error}
                  aria-describedby={cn(error ? errorId : '', description ? helperId : '') || undefined}
                />
                <select
                  value={currency}
                  onChange={() => { /* Currency is controlled externally */ }}
                  style={currencySelectStyle}
                  disabled={disabled}
                  aria-label="Currency"
                  tabIndex={-1}
                >
                  {Object.keys(currencyMap).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
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

export const CurrencyField = forwardRef(CurrencyFieldInner) as <
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  props: CurrencyFieldProps<T, TName> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(CurrencyField as any).displayName = 'CurrencyField';
