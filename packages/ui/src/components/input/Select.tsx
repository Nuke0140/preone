'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, radius, duration, easing, fontFamily, borderWidth } from '@preone/design-tokens';
import type { InputSize } from './Input';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: InputSize;
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const ChevronDownIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: { height: '32px', padding: `0 ${spacing[2]} 0 ${spacing[3]}`, fontSize: fontSize.sm, borderRadius: radius.md },
  md: { height: '40px', padding: `0 ${spacing[3]} 0 ${spacing[3]}`, fontSize: fontSize.sm, borderRadius: radius.md },
  lg: { height: '48px', padding: `0 ${spacing[4]} 0 ${spacing[4]}`, fontSize: fontSize.base, borderRadius: radius.lg },
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ size = 'md', label, options, placeholder, error = false, errorMessage, helperText, fullWidth = false, disabled, className, style, id, ...props }, ref) => {
    const autoId = useId();
    const selectId = id || autoId;
    const errorId = `${selectId}-error`;

    const wrapperStyle: React.CSSProperties = {
      display: fullWidth ? 'flex' : 'inline-flex',
      flexDirection: 'column',
      gap: spacing[1.5],
      width: fullWidth ? '100%' : undefined,
    };

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    };

    const selectStyle: React.CSSProperties = {
      width: '100%',
      height: sizeStyles[size].height,
      padding: sizeStyles[size].padding,
      paddingRight: spacing[8],
      fontSize: sizeStyles[size].fontSize,
      fontFamily: fontFamily.sans,
      color: colors.neutral[900],
      backgroundColor: disabled ? colors.neutral[50] : '#fff',
      border: `${borderWidth.DEFAULT} solid ${error ? colors.red[300] : colors.neutral[200]}`,
      borderRadius: sizeStyles[size].borderRadius,
      outline: 'none',
      appearance: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: `border-color ${duration.fast} ${easing.DEFAULT}`,
      ...(disabled ? { opacity: 0.6 } : {}),
    };

    const chevronStyle: React.CSSProperties = {
      position: 'absolute',
      right: spacing[3],
      color: colors.neutral[400],
      pointerEvents: 'none',
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
      <div className={cn('preone-select-wrapper', className)} style={{ ...wrapperStyle, ...style }}>
        {label && <label htmlFor={selectId} style={labelStyle}>{label}</label>}
        <div style={containerStyle}>
          <select
            ref={ref}
            id={selectId}
            style={selectStyle}
            disabled={disabled}
            aria-invalid={error}
            aria-describedby={error && errorMessage ? errorId : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <span style={chevronStyle}><ChevronDownIcon /></span>
        </div>
        {error && errorMessage && <span id={errorId} style={messageStyle} role="alert">{errorMessage}</span>}
        {!error && helperText && <span style={messageStyle}>{helperText}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
