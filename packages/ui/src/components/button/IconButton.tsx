'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, radius, shadows, duration, easing } from '@preone/design-tokens';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  label: string;
}

const variantStyles: Record<IconButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: colors.neutral[900],
    color: colors.neutral[50],
    border: 'none',
  },
  secondary: {
    backgroundColor: colors.neutral[100],
    color: colors.neutral[600],
    border: 'none',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: colors.neutral[500],
    border: 'none',
  },
  outline: {
    backgroundColor: 'transparent',
    color: colors.neutral[600],
    border: `1px solid ${colors.neutral[200]}`,
  },
  danger: {
    backgroundColor: colors.red[600],
    color: colors.red[50],
    border: 'none',
  },
};

const sizeStyles: Record<IconButtonSize, React.CSSProperties> = {
  sm: {
    width: '32px',
    height: '32px',
    borderRadius: radius.md,
  },
  md: {
    width: '40px',
    height: '40px',
    borderRadius: radius.md,
  },
  lg: {
    width: '48px',
    height: '48px',
    borderRadius: radius.lg,
  },
};

const iconSizes: Record<IconButtonSize, number> = {
  sm: 16,
  md: 18,
  lg: 20,
};

const SpinningIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ animation: 'preone-icon-spin 1s linear infinite' }}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', loading = false, label, disabled, className, children, style, ...props }, ref) => {
    const isDisabled = disabled || loading;

    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
      opacity: isDisabled ? 0.5 : 1,
      padding: '0',
      userSelect: 'none',
      position: 'relative',
    };

    const mergedStyle: React.CSSProperties = {
      ...baseStyle,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...style,
    };

    const hoverVariantStyles: Record<IconButtonVariant, React.CSSProperties> = {
      primary: { backgroundColor: colors.neutral[800] },
      secondary: { backgroundColor: colors.neutral[200] },
      ghost: { backgroundColor: colors.neutral[100] },
      outline: { backgroundColor: colors.neutral[50], borderColor: colors.neutral[300] },
      danger: { backgroundColor: colors.red[700] },
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isDisabled) {
        Object.assign(e.currentTarget.style, hoverVariantStyles[variant]);
        e.currentTarget.style.boxShadow = shadows.sm;
      }
      props.onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      Object.assign(e.currentTarget.style, variantStyles[variant]);
      e.currentTarget.style.boxShadow = 'none';
      props.onMouseLeave?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
      e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.neutral[50]}, 0 0 0 4px ${colors.neutral[400]}`;
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
      e.currentTarget.style.boxShadow = 'none';
      props.onBlur?.(e);
    };

    return (
      <>
        <style>{`
          @keyframes preone-icon-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <button
          ref={ref}
          className={cn('preone-icon-button', className)}
          style={mergedStyle}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          aria-busy={loading}
          aria-label={label}
          title={label}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        >
          {loading ? <SpinningIcon size={iconSizes[size]} /> : children}
        </button>
      </>
    );
  }
);

IconButton.displayName = 'IconButton';
