'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, radius, shadows, duration, easing, fontFamily, letterSpacing } from '@preone/design-tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: colors.neutral[900],
    color: colors.neutral[50],
    border: 'none',
  },
  secondary: {
    backgroundColor: colors.neutral[100],
    color: colors.neutral[700],
    border: 'none',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: colors.neutral[600],
    border: 'none',
  },
  outline: {
    backgroundColor: 'transparent',
    color: colors.neutral[700],
    border: `${1}px solid ${colors.neutral[200]}`,
  },
  danger: {
    backgroundColor: colors.red[600],
    color: colors.red[50],
    border: 'none',
  },
  link: {
    backgroundColor: 'transparent',
    color: colors.neutral[700],
    border: 'none',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    height: '32px',
    padding: `0 ${spacing[3]}`,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    borderRadius: radius.md,
    gap: spacing[1.5],
  },
  md: {
    height: '40px',
    padding: `0 ${spacing[4]}`,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    borderRadius: radius.md,
    gap: spacing[2],
  },
  lg: {
    height: '48px',
    padding: `0 ${spacing[6]}`,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    borderRadius: radius.lg,
    gap: spacing[2],
  },
};

const SpinnerIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ animation: 'preone-spin 1s linear infinite' }}
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.25"
    />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: fontFamily.sans,
      lineHeight: '1',
      letterSpacing: letterSpacing.normal,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
      width: fullWidth ? '100%' : undefined,
      opacity: isDisabled ? 0.5 : 1,
      userSelect: 'none',
      whiteSpace: 'nowrap' as const,
      position: 'relative' as const,
    };

    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    const mergedStyle: React.CSSProperties = {
      ...baseStyle,
      ...variantStyle,
      ...sizeStyle,
      ...style,
    };

    const hoverStyles = !isDisabled
      ? {
          primary: { backgroundColor: colors.neutral[800] },
          secondary: { backgroundColor: colors.neutral[200] },
          ghost: { backgroundColor: colors.neutral[100] },
          outline: { backgroundColor: colors.neutral[50], borderColor: colors.neutral[300] },
          danger: { backgroundColor: colors.red[700] },
          link: { color: colors.neutral[900] },
        }
      : {};

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isDisabled) {
        const hover = hoverStyles[variant];
        Object.assign(e.currentTarget.style, hover);
        if (variant !== 'link' && variant !== 'ghost') {
          e.currentTarget.style.boxShadow = shadows.sm;
        }
      }
      props.onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      Object.assign(e.currentTarget.style, variantStyle);
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
          @keyframes preone-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          [data-theme="dark"] .preone-button {
            --btn-bg-primary: ${colors.neutral[50]};
            --btn-text-primary: ${colors.neutral[900]};
            --btn-bg-secondary: ${colors.neutral[800]};
            --btn-text-secondary: ${colors.neutral[200]};
            --btn-text-ghost: ${colors.neutral[400]};
            --btn-bg-ghost-hover: ${colors.neutral[800]};
            --btn-border-outline: ${colors.neutral[700]};
            --btn-text-outline: ${colors.neutral[300]};
            --btn-bg-outline-hover: ${colors.neutral[800]};
          }
        `}</style>
        <button
          ref={ref}
          className={cn('preone-button', className)}
          style={mergedStyle}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          aria-busy={loading}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        >
          {loading && <SpinnerIcon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
          {!loading && leftIcon && (
            <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
              {leftIcon}
            </span>
          )}
          {children}
          {!loading && rightIcon && (
            <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </button>
      </>
    );
  }
);

Button.displayName = 'Button';
