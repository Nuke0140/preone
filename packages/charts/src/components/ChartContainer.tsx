'use client';

import React, { forwardRef } from 'react';
import { cn } from '@preone/ui';
import { colors, spacing, radius, fontSize, fontWeight, duration, easing } from '@preone/design-tokens';
import { useChartTheme } from '../hooks/useChartTheme';

export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Chart title displayed at the top */
  title?: string;
  /** Subtitle displayed below the title */
  subtitle?: string;
  /** Footer content displayed below the chart */
  footer?: React.ReactNode;
  /** The chart content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Show a loading skeleton */
  loading?: boolean;
  /** Chart area height in pixels */
  height?: number;
}

export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  (
    {
      title,
      subtitle,
      footer,
      children,
      className,
      loading = false,
      height = 300,
      style,
      ...props
    },
    ref
  ) => {
    const theme = useChartTheme();

    const containerStyle: React.CSSProperties = {
      backgroundColor: theme.cardBackgroundColor,
      border: `1px solid ${theme.cardBorderColor}`,
      borderRadius: radius.xl,
      boxShadow: theme.cardShadow,
      overflow: 'hidden',
      transition: `background-color ${duration.normal} ${easing.DEFAULT}, border-color ${duration.normal} ${easing.DEFAULT}`,
    };

    const headerStyle: React.CSSProperties = {
      padding: `${spacing[5]} ${spacing[6]} 0`,
    };

    const titleStyle: React.CSSProperties = {
      fontSize: fontSize.base,
      fontWeight: Number(fontWeight.semibold),
      color: theme.textColor,
      margin: 0,
      lineHeight: 1.4,
      transition: `color ${duration.normal} ${easing.DEFAULT}`,
    };

    const subtitleStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      color: theme.textMutedColor,
      margin: `${spacing[1]} 0 0`,
      lineHeight: 1.4,
      transition: `color ${duration.normal} ${easing.DEFAULT}`,
    };

    const contentStyle: React.CSSProperties = {
      padding: `${spacing[4]} ${spacing[6]}`,
      height: height + (title ? 0 : 0),
      minHeight: height,
    };

    const footerStyle: React.CSSProperties = {
      padding: `${spacing[3]} ${spacing[6]} ${spacing[4]}`,
      borderTop: `1px solid ${theme.cardBorderColor}`,
      color: theme.textMutedColor,
      fontSize: fontSize.xs,
      transition: `color ${duration.normal} ${easing.DEFAULT}, border-color ${duration.normal} ${easing.DEFAULT}`,
    };

    return (
      <div
        ref={ref}
        className={cn('preone-chart-container', className)}
        style={{ ...containerStyle, ...style }}
        {...props}
      >
        {(title || subtitle) && (
          <div style={headerStyle}>
            {title && <h3 style={titleStyle}>{title}</h3>}
            {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
          </div>
        )}

        <div style={contentStyle}>
          {loading ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              role="status"
              aria-label="Loading chart"
            >
              <LoadingSkeleton theme={theme} height={height} />
            </div>
          ) : (
            children
          )}
        </div>

        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    );
  }
);

ChartContainer.displayName = 'ChartContainer';

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton({
  theme,
  height,
}: {
  theme: ReturnType<typeof useChartTheme>;
  height: number;
}) {
  const barCount = 5;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const barHeight = 30 + Math.sin((i / barCount) * Math.PI) * (height * 0.5);
    return barHeight;
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        width: '100%',
        height: '100%',
        gap: spacing[3],
        padding: spacing[4],
      }}
    >
      {bars.map((barHeight, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: barHeight,
            backgroundColor: theme.isDark
              ? colors.slate[700]
              : colors.slate[200],
            borderRadius: radius.sm,
            animation: `preone-pulse 1.5s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes preone-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
