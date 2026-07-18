'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, radius, shadows, duration, easing, fontSize, fontWeight, fontFamily } from '@preone/design-tokens';

export type TileVariant = 'default' | 'accent' | 'subtle';
export type TileSize = 'sm' | 'md' | 'lg';

export interface TileProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: TileVariant;
  tileSizing?: TileSize;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  badge?: React.ReactNode;
}

const variantStyles: Record<TileVariant, React.CSSProperties> = {
  default: {
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral[200]}`,
    color: colors.neutral[900],
  },
  accent: {
    backgroundColor: colors.neutral[900],
    border: 'none',
    color: colors.neutral[50],
  },
  subtle: {
    backgroundColor: colors.neutral[50],
    border: 'none',
    color: colors.neutral[700],
  },
};

const tileSizeConfig: Record<TileSize, React.CSSProperties> = {
  sm: { padding: spacing[4], minHeight: '120px' },
  md: { padding: spacing[6], minHeight: '160px' },
  lg: { padding: spacing[8], minHeight: '220px' },
};

export const Tile = forwardRef<HTMLDivElement, TileProps>(
  ({ variant = 'default', tileSizing = 'md', icon, title, description, badge, className, style, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      borderRadius: radius.xl,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[3],
      position: 'relative',
      overflow: 'hidden',
      transition: `box-shadow ${duration.normal} ${easing.DEFAULT}, transform ${duration.normal} ${easing.DEFAULT}`,
      cursor: 'pointer',
    };

    const mergedStyle: React.CSSProperties = {
      ...baseStyle,
      ...variantStyles[variant],
      ...tileSizeConfig[tileSizing],
      ...style,
    };

    const isAccent = variant === 'accent';

    return (
      <div
        ref={ref}
        className={cn('preone-tile', className)}
        style={mergedStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = shadows.md;
          e.currentTarget.style.transform = 'translateY(-2px)';
          props.onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
          props.onMouseLeave?.(e);
        }}
        role="article"
        {...props}
      >
        {(icon || badge) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {icon && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: radius.lg,
                backgroundColor: isAccent ? 'rgba(255,255,255,0.1)' : colors.neutral[100],
                color: isAccent ? colors.neutral[300] : colors.neutral[600],
              }}>
                {icon}
              </div>
            )}
            {badge && <div>{badge}</div>}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1], marginTop: 'auto' }}>
          <h3 style={{
            fontSize: tileSizing === 'sm' ? fontSize.base : tileSizing === 'lg' ? fontSize.xl : fontSize.lg,
            fontWeight: fontWeight.semibold,
            fontFamily: fontFamily.sans,
            margin: 0,
            lineHeight: 1.3,
          }}>
            {title}
          </h3>
          {description && (
            <p style={{
              fontSize: fontSize.sm,
              fontFamily: fontFamily.sans,
              color: isAccent ? colors.neutral[400] : colors.neutral[500],
              margin: 0,
              lineHeight: 1.5,
            }}>
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Tile.displayName = 'Tile';
