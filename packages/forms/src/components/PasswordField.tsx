'use client';

import React, { forwardRef, useState, useId } from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing, borderWidth } from '@preone/design-tokens';

export interface PasswordRequirement {
  label: string;
  test: (value: string) => boolean;
}

export interface PasswordFieldProps<
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
  /** Whether to show the strength indicator */
  showStrength?: boolean;
  /** Password requirements to check */
  requirements?: PasswordRequirement[];
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Placeholder */
  placeholder?: string;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

const defaultRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'Contains a lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'Contains an uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'Contains a number', test: (v) => /\d/.test(v) },
  { label: 'Contains a special character', test: (v) => /[^a-zA-Z0-9]/.test(v) },
];

type StrengthLevel = 'none' | 'weak' | 'fair' | 'good' | 'strong';

function getStrength(value: string, requirements: PasswordRequirement[]): StrengthLevel {
  if (!value) return 'none';
  const passed = requirements.filter((r) => r.test(value)).length;
  if (passed <= 1) return 'weak';
  if (passed <= 2) return 'fair';
  if (passed <= 3) return 'good';
  return 'strong';
}

const strengthConfig: Record<StrengthLevel, { label: string; color: string; width: string }> = {
  none: { label: '', color: 'transparent', width: '0%' },
  weak: { label: 'Weak', color: colors.red[500], width: '25%' },
  fair: { label: 'Fair', color: colors.orange[500], width: '50%' },
  good: { label: 'Good', color: colors.amber[500], width: '75%' },
  strong: { label: 'Strong', color: colors.green[500], width: '100%' },
};

const EyeIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const CheckIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XCircleIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

function PasswordFieldInner<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  {
    name,
    control,
    label = 'Password',
    description,
    required = false,
    showStrength = true,
    requirements = defaultRequirements,
    disabled = false,
    placeholder = 'Enter your password',
    className,
    style,
  }: PasswordFieldProps<T, TName>,
  ref: React.Ref<HTMLDivElement>
) {
  const autoId = useId();
  const inputId = `${name}-${autoId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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

  const toggleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[2],
    backgroundColor: 'transparent',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: colors.neutral[400],
    transition: `color ${duration.fast} ${easing.DEFAULT}`,
  };

  const strengthBarTrackStyle: React.CSSProperties = {
    width: '100%',
    height: '4px',
    backgroundColor: colors.neutral[200],
    borderRadius: radius.full,
    overflow: 'hidden',
  };

  const strengthLabelStyle: React.CSSProperties = {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.medium,
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

  const reqItemStyle = (passed: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1.5],
    fontSize: fontSize.xs,
    fontFamily: fontFamily.sans,
    color: passed ? colors.green[600] : colors.neutral[400],
    transition: `color ${duration.fast} ${easing.DEFAULT}`,
  });

  return (
    <div ref={ref} className={cn('preone-password-field', className)} style={wrapperStyle}>
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
          const strength = showStrength ? getStrength(value || '', requirements) : 'none';
          const strengthInfo = strengthConfig[strength];

          return (
            <>
              <div style={inputContainerStyle(!!error)}>
                <input
                  ref={fieldRef}
                  id={inputId}
                  type={showPassword ? 'text' : 'password'}
                  style={inputStyle}
                  value={value || ''}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  disabled={disabled}
                  aria-invalid={!!error}
                  aria-describedby={cn(error ? errorId : '', description ? helperId : '') || undefined}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  style={toggleStyle}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={disabled}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  onMouseEnter={(e) => { e.currentTarget.style.color = colors.neutral[600]; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = colors.neutral[400]; }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {/* Strength indicator */}
              {showStrength && value && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                  <div style={strengthBarTrackStyle}>
                    <div
                      style={{
                        height: '100%',
                        width: strengthInfo.width,
                        backgroundColor: strengthInfo.color,
                        borderRadius: radius.full,
                        transition: `all ${duration.normal} ${easing.DEFAULT}`,
                      }}
                    />
                  </div>
                  <span style={{ ...strengthLabelStyle, color: strengthInfo.color }}>
                    {strengthInfo.label}
                  </span>
                </div>
              )}

              {/* Requirements checklist */}
              {showStrength && value && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                  {requirements.map((req, index) => {
                    const passed = req.test(value || '');
                    return (
                      <div key={index} style={reqItemStyle(passed)}>
                        {passed ? <CheckIcon /> : <XCircleIcon />}
                        <span>{req.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

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

export const PasswordField = forwardRef(PasswordFieldInner) as <
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  props: PasswordFieldProps<T, TName> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(PasswordField as any).displayName = 'PasswordField';
