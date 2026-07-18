'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius } from '@preone/design-tokens';

export type StatCardVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  description?: string;
  trend?: { value: number; label?: string };
  icon?: React.ReactNode;
  variant?: StatCardVariant;
}

const variantAccentColors: Record<StatCardVariant, string> = {
  default: colors.neutral[500],
  success: colors.green[500],
  warning: colors.amber[500],
  danger: colors.red[500],
  info: colors.sky[500],
};

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, description, trend, icon, variant = 'default', className, style, ...props }, ref) => {
    const accentColor = variantAccentColors[variant];
    const isPositiveTrend = trend && trend.value > 0;
    const isNegativeTrend = trend && trend.value < 0;

    const cardStyle: React.CSSProperties = {
      backgroundColor: '#fff',
      border: `1px solid ${colors.neutral[200]}`,
      borderRadius: radius.xl,
      padding: spacing[5],
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[3],
      position: 'relative',
      overflow: 'hidden',
      ...style,
    };

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    };

    const iconContainerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      borderRadius: radius.lg,
      backgroundColor: colors.neutral[50],
      color: accentColor,
    };

    const titleStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      fontFamily: fontFamily.sans,
      color: colors.neutral[500],
      margin: 0,
    };

    const valueStyle: React.CSSProperties = {
      fontSize: fontSize['3xl'],
      fontWeight: fontWeight.bold,
      fontFamily: fontFamily.sans,
      color: colors.neutral[900],
      margin: 0,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    };

    const trendStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: spacing[1],
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: isPositiveTrend ? colors.green[600] : isNegativeTrend ? colors.red[600] : colors.neutral[500],
    };

    const descStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      color: colors.neutral[400],
    };

    const TrendUpIcon: React.FC = () => (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    );

    const TrendDownIcon: React.FC = () => (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
      </svg>
    );

    return (
      <div ref={ref} className={cn('preone-stat-card', className)} style={cardStyle} {...props}>
        <div style={headerStyle}>
          <p style={titleStyle}>{title}</p>
          {icon && <div style={iconContainerStyle}>{icon}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
          <p style={valueStyle}>{value}</p>
          {(trend || description) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              {trend && (
                <span style={trendStyle}>
                  {isPositiveTrend ? <TrendUpIcon /> : isNegativeTrend ? <TrendDownIcon /> : null}
                  {isPositiveTrend ? '+' : ''}{trend.value}%
                  {trend.label && <span style={{ color: colors.neutral[400], fontWeight: 400 }}>{trend.label}</span>}
                </span>
              )}
              {description && <span style={descStyle}>{description}</span>}
            </div>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';
