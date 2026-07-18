'use client';

import React, { forwardRef, useState, useId } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, radius, duration, easing, fontFamily, lineHeight, borderWidth } from '@preone/design-tokens';

export type TextareaSize = 'sm' | 'md' | 'lg';

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  size?: TextareaSize;
  label?: string;
  helperText?: string;
  error?: boolean;
  errorMessage?: string;
  fullWidth?: boolean;
}

const sizeConfig: Record<TextareaSize, { padding: string; fontSize: string; borderRadius: string }> = {
  sm: { padding: `${spacing[2]} ${spacing[3]}`, fontSize: fontSize.sm, borderRadius: radius.md },
  md: { padding: `${spacing[3]}`, fontSize: fontSize.sm, borderRadius: radius.md },
  lg: { padding: `${spacing[4]}`, fontSize: fontSize.base, borderRadius: radius.lg },
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      size = 'md',
      label,
      helperText,
      error = false,
      errorMessage,
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
    const textareaId = id || autoId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;
    const config = sizeConfig[size];

    const wrapperStyle: React.CSSProperties = {
      display: fullWidth ? 'flex' : 'inline-flex',
      flexDirection: 'column',
      gap: spacing[1.5],
      width: fullWidth ? '100%' : undefined,
    };

    const textareaStyle: React.CSSProperties = {
      width: '100%',
      padding: config.padding,
      fontSize: config.fontSize,
      fontFamily: fontFamily.sans,
      lineHeight: lineHeight.normal,
      color: colors.neutral[900],
      backgroundColor: disabled ? colors.neutral[50] : '#fff',
      border: `${borderWidth.DEFAULT} solid ${error ? colors.red[300] : focused ? colors.neutral[400] : colors.neutral[200]}`,
      borderRadius: config.borderRadius,
      outline: 'none',
      resize: 'vertical',
      transition: `border-color ${duration.fast} ${easing.DEFAULT}, box-shadow ${duration.fast} ${easing.DEFAULT}`,
      ...(focused && !error ? { boxShadow: `0 0 0 3px ${colors.neutral[100]}` } : {}),
      ...(error && focused ? { boxShadow: `0 0 0 3px ${colors.red[50]}` } : {}),
      ...(disabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}),
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
      <div className={cn('preone-textarea-wrapper', className)} style={{ ...wrapperStyle, ...style }}>
        {label && (
          <label htmlFor={textareaId} style={labelStyle}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          style={textareaStyle}
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

Textarea.displayName = 'Textarea';
