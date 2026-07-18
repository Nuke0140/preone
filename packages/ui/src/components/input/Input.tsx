'use client';

import React, { forwardRef, useState, useId } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, radius, duration, easing, fontFamily, lineHeight, borderWidth } from '@preone/design-tokens';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  label?: string;
  helperText?: string;
  error?: boolean;
  errorMessage?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: {
    height: '32px',
    padding: `0 ${spacing[3]}`,
    fontSize: fontSize.sm,
    borderRadius: radius.md,
  },
  md: {
    height: '40px',
    padding: `0 ${spacing[3]}`,
    fontSize: fontSize.sm,
    borderRadius: radius.md,
  },
  lg: {
    height: '48px',
    padding: `0 ${spacing[4]}`,
    fontSize: fontSize.base,
    borderRadius: radius.lg,
  },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      label,
      helperText,
      error = false,
      errorMessage,
      leftAddon,
      rightAddon,
      fullWidth = false,
      disabled,
      className,
      style,
      id,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const autoId = useId();
    const inputId = id || autoId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

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
      overflow: 'hidden',
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

    const addonStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      padding: `0 ${spacing[3]}`,
      color: colors.neutral[400],
      fontSize: sizeStyles[size].fontSize,
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
      <div className={cn('preone-input-wrapper', className)} style={{ ...wrapperStyle, ...style }}>
        {label && (
          <label htmlFor={inputId} style={labelStyle}>
            {label}
          </label>
        )}
        <div style={inputContainerStyle}>
          {leftAddon && <span style={addonStyle}>{leftAddon}</span>}
          <input
            ref={ref}
            id={inputId}
            style={inputStyle}
            disabled={disabled}
            aria-invalid={error}
            aria-describedby={cn(error && errorMessage ? errorId : '', helperText ? helperId : '') || undefined}
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
          {rightAddon && <span style={addonStyle}>{rightAddon}</span>}
        </div>
        {error && errorMessage && (
          <span id={errorId} style={messageStyle} role="alert">
            {errorMessage}
          </span>
        )}
        {!error && helperText && (
          <span id={helperId} style={messageStyle}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
