'use client';

import React, { forwardRef, useState, useId } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, radius, duration, easing, fontFamily, lineHeight, borderWidth } from '@preone/design-tokens';
import type { InputSize } from './Input';

export interface PasswordProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: InputSize;
  label?: string;
  helperText?: string;
  error?: boolean;
  errorMessage?: string;
  fullWidth?: boolean;
}

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

const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: { height: '32px', padding: `0 ${spacing[3]}`, fontSize: fontSize.sm, borderRadius: radius.md },
  md: { height: '40px', padding: `0 ${spacing[3]}`, fontSize: fontSize.sm, borderRadius: radius.md },
  lg: { height: '48px', padding: `0 ${spacing[4]}`, fontSize: fontSize.base, borderRadius: radius.lg },
};

export const Password = forwardRef<HTMLInputElement, PasswordProps>(
  ({ size = 'md', label, helperText, error = false, errorMessage, fullWidth = false, disabled, className, style, id, onFocus, onBlur, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);
    const autoId = useId();
    const inputId = id || autoId;
    const errorId = `${inputId}-error`;

    const wrapperStyle: React.CSSProperties = {
      display: fullWidth ? 'flex' : 'inline-flex',
      flexDirection: 'column',
      gap: spacing[1.5],
      width: fullWidth ? '100%' : undefined,
    };

    const inputContainerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: disabled ? colors.neutral[50] : '#fff',
      border: `${borderWidth.DEFAULT} solid ${error ? colors.red[300] : focused ? colors.neutral[400] : colors.neutral[200]}`,
      borderRadius: sizeStyles[size].borderRadius,
      transition: `border-color ${duration.fast} ${easing.DEFAULT}, box-shadow ${duration.fast} ${easing.DEFAULT}`,
      ...(focused && !error ? { boxShadow: `0 0 0 3px ${colors.neutral[100]}` } : {}),
      ...(error && focused ? { boxShadow: `0 0 0 3px ${colors.red[50]}` } : {}),
    };

    const inputStyle: React.CSSProperties = {
      flex: 1,
      height: sizeStyles[size].height,
      padding: sizeStyles[size].padding,
      fontSize: sizeStyles[size].fontSize,
      fontFamily: fontFamily.sans,
      lineHeight: lineHeight.normal,
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

    const labelStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.neutral[700],
      fontFamily: fontFamily.sans,
    };

    const messageStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      ...(error ? { color: colors.red[500] } : { color: colors.neutral[500] }),
    };

    return (
      <div className={cn('preone-password-wrapper', className)} style={{ ...wrapperStyle, ...style }}>
        {label && (
          <label htmlFor={inputId} style={labelStyle}>
            {label}
          </label>
        )}
        <div style={inputContainerStyle}>
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            style={inputStyle}
            disabled={disabled}
            aria-invalid={error}
            aria-describedby={error && errorMessage ? errorId : undefined}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...props}
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
            {showPassword ? <EyeOffIcon size={size === 'lg' ? 20 : 16} /> : <EyeIcon size={size === 'lg' ? 20 : 16} />}
          </button>
        </div>
        {error && errorMessage && (
          <span id={errorId} style={messageStyle} role="alert">
            {errorMessage}
          </span>
        )}
        {!error && helperText && (
          <span style={messageStyle}>{helperText}</span>
        )}
      </div>
    );
  }
);

Password.displayName = 'Password';
