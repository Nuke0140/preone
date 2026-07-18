'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius } from '@preone/design-tokens';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dotColor: string }> = {
  default: { bg: colors.neutral[100], text: colors.neutral[700], dotColor: colors.neutral[400] },
  primary: { bg: colors.neutral[900], text: colors.neutral[50], dotColor: colors.neutral[300] },
  success: { bg: colors.green[50], text: colors.green[700], dotColor: colors.green[500] },
  warning: { bg: colors.amber[50], text: colors.amber[700], dotColor: colors.amber[500] },
  danger: { bg: colors.red[50], text: colors.red[700], dotColor: colors.red[500] },
  info: { bg: colors.sky[50], text: colors.sky[700], dotColor: colors.sky[500] },
  neutral: { bg: colors.neutral[100], text: colors.neutral[600], dotColor: colors.neutral[400] },
};

const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
  sm: {
    padding: `${spacing[0.5]} ${spacing[2]}`,
    fontSize: fontSize.xs,
    borderRadius: radius.sm,
  },
  md: {
    padding: `${spacing[1]} ${spacing[2.5]}`,
    fontSize: fontSize.xs,
    borderRadius: radius.md,
  },
  lg: {
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: fontSize.sm,
    borderRadius: radius.md,
  },
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', dot = false, icon, className, style, children, ...props }, ref) => {
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    const badgeStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: spacing[1],
      fontFamily: fontFamily.sans,
      fontWeight: fontWeight.medium,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
      backgroundColor: variantStyle.bg,
      color: variantStyle.text,
      ...sizeStyle,
      ...style,
    };

    return (
      <span ref={ref} className={cn('preone-badge', className)} style={badgeStyle} {...props}>
        {dot && (
          <span
            style={{
              width: size === 'sm' ? '6px' : '8px',
              height: size === 'sm' ? '6px' : '8px',
              borderRadius: radius.full,
              backgroundColor: variantStyle.dotColor,
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
        )}
        {icon && <span style={{ display: 'inline-flex' }} aria-hidden="true">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
