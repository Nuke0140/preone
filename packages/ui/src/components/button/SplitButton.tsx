'use client';

import React, { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, radius, shadows, duration, easing, fontFamily } from '@preone/design-tokens';
import { Button, type ButtonProps } from './Button';

export interface SplitButtonOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SplitButtonProps extends Omit<ButtonProps, 'onClick' | 'onSelect'> {
  options: SplitButtonOption[];
  onSelect?: (value: string) => void;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ChevronDownIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const SplitButton = forwardRef<HTMLDivElement, SplitButtonProps>(
  ({ variant = 'primary', size = 'md', options, onSelect, onClick, disabled, loading, children, className, style, ...props }, ref) => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleClose = useCallback(() => setOpen(false), []);

    useEffect(() => {
      if (!open) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          handleClose();
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleClose();
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [open, handleClose]);

    const isDisabled = disabled || loading;

    const containerStyle: React.CSSProperties = {
      display: 'inline-flex',
      position: 'relative',
      ...style,
    };

    const separatorStyle: React.CSSProperties = {
      width: '1px',
      backgroundColor: variant === 'primary' ? colors.neutral[700] : variant === 'danger' ? colors.red[500] : colors.neutral[200],
      alignSelf: 'stretch',
      margin: `${spacing[1.5]} 0`,
    };

    const triggerStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      border: 'none',
      outline: 'none',
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
      opacity: isDisabled ? 0.5 : 1,
      padding: `0 ${spacing[2]}`,
    };

    const getVariantBg = (): React.CSSProperties => {
      switch (variant) {
        case 'primary':
          return { backgroundColor: colors.neutral[900], color: colors.neutral[50] };
        case 'secondary':
          return { backgroundColor: colors.neutral[100], color: colors.neutral[700] };
        case 'danger':
          return { backgroundColor: colors.red[600], color: colors.red[50] };
        case 'outline':
          return { backgroundColor: 'transparent', color: colors.neutral[700], borderLeft: 'none' };
        case 'ghost':
          return { backgroundColor: 'transparent', color: colors.neutral[600] };
        default:
          return { backgroundColor: colors.neutral[900], color: colors.neutral[50] };
      }
    };

    const menuStyle: React.CSSProperties = {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: spacing[1],
      minWidth: '180px',
      backgroundColor: '#fff',
      border: `1px solid ${colors.neutral[200]}`,
      borderRadius: radius.lg,
      boxShadow: shadows.lg,
      zIndex: 50,
      overflow: 'hidden',
      padding: `${spacing[1]} 0`,
    };

    const menuItemStyle = (isItemDisabled?: boolean): React.CSSProperties => ({
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      width: '100%',
      padding: `${spacing[2]} ${spacing[3]}`,
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      color: isItemDisabled ? colors.neutral[400] : colors.neutral[700],
      backgroundColor: 'transparent',
      border: 'none',
      cursor: isItemDisabled ? 'not-allowed' : 'pointer',
      textAlign: 'left',
      transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
      opacity: isItemDisabled ? 0.5 : 1,
    });

    return (
      <div ref={ref} className={cn('preone-split-button', className)} style={containerStyle}>
        <Button
          variant={variant}
          size={size}
          loading={loading}
          disabled={disabled}
          onClick={onClick}
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
          {...props}
        >
          {children}
        </Button>

        <div style={separatorStyle} aria-hidden="true" />

        <button
          style={{ ...triggerStyle, ...getVariantBg(), borderTopRightRadius: size === 'lg' ? radius.lg : radius.md, borderBottomRightRadius: size === 'lg' ? radius.lg : radius.md, height: size === 'sm' ? '32px' : size === 'lg' ? '48px' : '40px' }}
          onClick={() => !isDisabled && setOpen(!open)}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Show more options"
          type="button"
        >
          <ChevronDownIcon size={size === 'sm' ? 14 : 16} />
        </button>

        {open && (
          <div ref={menuRef} style={menuStyle} role="menu" aria-label="Options">
            {options.map((option) => (
              <button
                key={option.value}
                role="menuitem"
                style={menuItemStyle(option.disabled)}
                disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    onSelect?.(option.value);
                    handleClose();
                  }
                }}
                onMouseEnter={(e) => {
                  if (!option.disabled) {
                    e.currentTarget.style.backgroundColor = colors.neutral[50];
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {option.icon && <span style={{ display: 'inline-flex' }} aria-hidden="true">{option.icon}</span>}
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SplitButton.displayName = 'SplitButton';
