'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius } from '@preone/design-tokens';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, size = 'md', className, style, ...props }, ref) => {
    const iconSize = size === 'sm' ? 40 : size === 'lg' ? 72 : 56;

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: size === 'sm' ? spacing[6] : size === 'lg' ? spacing[12] : spacing[8],
      ...style,
    };

    const iconContainerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: `${iconSize}px`,
      height: `${iconSize}px`,
      borderRadius: radius.xl,
      backgroundColor: colors.neutral[100],
      color: colors.neutral[400],
      marginBottom: spacing[4],
    };

    const titleStyle: React.CSSProperties = {
      fontSize: size === 'sm' ? fontSize.base : size === 'lg' ? fontSize.xl : fontSize.lg,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: colors.neutral[700],
      margin: 0,
      lineHeight: 1.3,
    };

    const descStyle: React.CSSProperties = {
      fontSize: size === 'sm' ? fontSize.sm : fontSize.base,
      fontFamily: fontFamily.sans,
      color: colors.neutral[400],
      margin: 0,
      marginTop: spacing[2],
      maxWidth: '420px',
      lineHeight: 1.6,
    };

    return (
      <div ref={ref} className={cn('preone-empty-state', className)} style={containerStyle} role="status" {...props}>
        {icon && <div style={iconContainerStyle}>{icon}</div>}
        <h3 style={titleStyle}>{title}</h3>
        {description && <p style={descStyle}>{description}</p>}
        {action && <div style={{ marginTop: spacing[5] }}>{action}</div>}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';
