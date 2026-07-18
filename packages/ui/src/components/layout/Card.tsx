'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, radius, shadows, duration, easing } from '@preone/design-tokens';

export type CardVariant = 'elevated' | 'outlined' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  clickable?: boolean;
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  elevated: {
    backgroundColor: '#fff',
    boxShadow: shadows.DEFAULT,
    border: 'none',
  },
  outlined: {
    backgroundColor: '#fff',
    boxShadow: 'none',
    border: `1px solid ${colors.neutral[200]}`,
  },
  flat: {
    backgroundColor: colors.neutral[50],
    boxShadow: 'none',
    border: 'none',
  },
};

const paddingStyles: Record<CardPadding, React.CSSProperties> = {
  none: { padding: '0' },
  sm: { padding: spacing[3] },
  md: { padding: spacing[5] },
  lg: { padding: spacing[8] },
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', padding = 'md', hoverable = false, clickable = false, className, style, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      borderRadius: radius.xl,
      transition: `box-shadow ${duration.normal} ${easing.DEFAULT}, transform ${duration.normal} ${easing.DEFAULT}`,
      cursor: clickable ? 'pointer' : undefined,
    };

    const mergedStyle: React.CSSProperties = {
      ...baseStyle,
      ...variantStyles[variant],
      ...paddingStyles[padding],
      ...style,
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      if (hoverable || clickable) {
        e.currentTarget.style.boxShadow = shadows.md;
        if (clickable) e.currentTarget.style.transform = 'translateY(-1px)';
      }
      onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow as string || 'none';
      e.currentTarget.style.transform = 'translateY(0)';
      onMouseLeave?.(e);
    };

    return (
      <div
        ref={ref}
        className={cn('preone-card', className)}
        style={mergedStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, className, style, ...props }) => (
  <div
    className={cn('preone-card-header', className)}
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing[4],
      ...style,
    }}
    {...props}
  >
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colors.neutral[900], margin: 0, lineHeight: 1.4 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: '0.8125rem', color: colors.neutral[500], margin: `${spacing[1]} 0 0`, lineHeight: 1.4 }}>{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent: React.FC<CardContentProps> = ({ className, style, ...props }) => (
  <div className={cn('preone-card-content', className)} style={style} {...props} />
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right';
}

export const CardFooter: React.FC<CardFooterProps> = ({ align = 'right', className, style, ...props }) => (
  <div
    className={cn('preone-card-footer', className)}
    style={{
      display: 'flex',
      justifyContent: align === 'left' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end',
      gap: spacing[2],
      marginTop: spacing[4],
      paddingTop: spacing[4],
      borderTop: `1px solid ${colors.neutral[100]}`,
      ...style,
    }}
    {...props}
  />
);

CardFooter.displayName = 'CardFooter';
