'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, radius, duration, easing, fontFamily } from '@preone/design-tokens';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
  error?: boolean;
  indeterminate?: boolean;
}

const checkboxSizes = {
  sm: { box: 16, radius: radius.sm },
  md: { box: 20, radius: radius.md },
  lg: { box: 24, radius: radius.md },
};

const CheckIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IndeterminateIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ size = 'md', label, description, error = false, indeterminate = false, disabled, checked, className, style, id, onChange, ...props }, ref) => {
    const autoId = useId();
    const checkboxId = id || autoId;
    const config = checkboxSizes[size];
    const isChecked = checked || indeterminate;

    const wrapperStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: description ? 'flex-start' : 'center',
      gap: spacing[2],
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      userSelect: 'none',
    };

    const boxStyle: React.CSSProperties = {
      width: `${config.box}px`,
      height: `${config.box}px`,
      minWidth: `${config.box}px`,
      borderRadius: config.radius,
      border: `2px solid ${error ? colors.red[400] : isChecked ? colors.neutral[900] : colors.neutral[300]}`,
      backgroundColor: isChecked ? colors.neutral[900] : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
      marginTop: description ? '2px' : '0',
    };

    const labelStyle: React.CSSProperties = {
      fontSize: size === 'sm' ? fontSize.sm : size === 'lg' ? fontSize.base : fontSize.sm,
      fontFamily: fontFamily.sans,
      color: colors.neutral[800],
      lineHeight: '1.4',
    };

    const descStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      color: colors.neutral[500],
      marginTop: '2px',
    };

    const hiddenInputStyle: React.CSSProperties = {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      borderWidth: '0',
    };

    const handleClick = () => {
      if (!disabled) {
        const syntheticEvent = {
          target: { checked: !checked },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange?.(syntheticEvent);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div className={cn('preone-checkbox', className)} style={{ ...wrapperStyle, ...style }} onClick={handleClick} onKeyDown={handleKeyDown} role="checkbox" aria-checked={indeterminate ? 'mixed' : isChecked} tabIndex={disabled ? -1 : 0}>
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          style={hiddenInputStyle}
          aria-invalid={error}
          {...props}
        />
        <div style={boxStyle}>
          {isChecked && (indeterminate ? <IndeterminateIcon size={config.box * 0.6} /> : <CheckIcon size={config.box * 0.6} />)}
        </div>
        {(label || description) && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label && <label htmlFor={checkboxId} style={labelStyle} onClick={(e) => e.stopPropagation()}>{label}</label>}
            {description && <span style={descStyle}>{description}</span>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
