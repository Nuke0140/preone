'use client';

import React, { forwardRef, useState, useId } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, radius, duration, easing, fontFamily, lineHeight, borderWidth } from '@preone/design-tokens';
import type { InputSize } from './Input';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: InputSize;
  label?: string;
  onClear?: () => void;
  fullWidth?: boolean;
}

const SearchIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ClearIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: { height: '32px', padding: `0 ${spacing[3]}`, fontSize: fontSize.sm, borderRadius: radius.md },
  md: { height: '40px', padding: `0 ${spacing[3]}`, fontSize: fontSize.sm, borderRadius: radius.md },
  lg: { height: '48px', padding: `0 ${spacing[4]}`, fontSize: fontSize.base, borderRadius: radius.lg },
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ size = 'md', label, onClear, fullWidth = false, disabled, value, className, style, id, onChange, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const autoId = useId();
    const inputId = id || autoId;
    const hasValue = value !== undefined && value !== '';

    const wrapperStyle: React.CSSProperties = {
      display: fullWidth ? 'flex' : 'inline-flex',
      flexDirection: 'column',
      gap: spacing[1.5],
      width: fullWidth ? '100%' : undefined,
    };

    const inputContainerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      backgroundColor: disabled ? colors.neutral[50] : colors.neutral[100],
      border: `${borderWidth.DEFAULT} solid ${focused ? colors.neutral[300] : 'transparent'}`,
      borderRadius: sizeStyles[size].borderRadius,
      padding: `0 ${spacing[3]}`,
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
      ...(focused ? { backgroundColor: '#fff', boxShadow: `0 0 0 3px ${colors.neutral[100]}` } : {}),
    };

    const inputStyle: React.CSSProperties = {
      flex: 1,
      height: sizeStyles[size].height,
      fontSize: sizeStyles[size].fontSize,
      fontFamily: fontFamily.sans,
      lineHeight: lineHeight.normal,
      color: colors.neutral[900],
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      ...(disabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}),
    };

    const iconStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      color: colors.neutral[400],
      flexShrink: 0,
    };

    const clearBtnStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[1],
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: colors.neutral[400],
      borderRadius: radius.sm,
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
    };

    const labelStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.neutral[700],
      fontFamily: fontFamily.sans,
    };

    return (
      <div className={cn('preone-search-wrapper', className)} style={{ ...wrapperStyle, ...style }}>
        {label && <label htmlFor={inputId} style={labelStyle}>{label}</label>}
        <div style={inputContainerStyle}>
          <span style={iconStyle}><SearchIcon size={size === 'lg' ? 20 : 16} /></span>
          <input
            ref={ref}
            id={inputId}
            type="search"
            role="searchbox"
            style={inputStyle}
            value={value}
            disabled={disabled}
            onChange={onChange}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            aria-label={label || 'Search'}
            {...props}
          />
          {hasValue && onClear && (
            <button
              type="button"
              style={clearBtnStyle}
              onClick={onClear}
              aria-label="Clear search"
              onMouseEnter={(e) => { e.currentTarget.style.color = colors.neutral[600]; e.currentTarget.style.backgroundColor = colors.neutral[100]; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = colors.neutral[400]; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <ClearIcon size={size === 'sm' ? 12 : 14} />
            </button>
          )}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
