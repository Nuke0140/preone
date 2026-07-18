'use client';

import React, { forwardRef, useMemo } from 'react';
import { cn } from '@preone/ui';
import { useChartTheme } from '../hooks/useChartTheme';
import { resolveColor } from '../utils/chart-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PreOneSparklineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of numeric values */
  data: number[];
  /** Color of the line. Defaults to first palette color */
  color?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Show filled area beneath the line */
  showArea?: boolean;
  /** Enable animation */
  animate?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const PreOneSparkline = forwardRef<HTMLDivElement, PreOneSparklineProps>(
  (
    {
      data,
      color,
      width = 120,
      height = 32,
      showArea = false,
      animate = true,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const theme = useChartTheme();
    const lineColor = resolveColor(color, 0, theme.isDark);

    const { linePath, areaPath } = useMemo(() => {
      if (!data || data.length < 2) {
        return { linePath: '', areaPath: '' };
      }

      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;
      const padding = 2;

      const effectiveWidth = width - padding * 2;
      const effectiveHeight = height - padding * 2;

      const points = data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * effectiveWidth;
        const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
        return { x, y };
      });

      // Build smooth line path using cardinal spline
      let path = `M ${points[0]!.x} ${points[0]!.y}`;

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(i - 1, 0)]!;
        const p1 = points[i]!;
        const p2 = points[i + 1]!;
        const p3 = points[Math.min(i + 2, points.length - 1)]!;

        const tension = 0.3;
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }

      // Area path: close the shape to the bottom
      let area = path;
      area += ` L ${points[points.length - 1]!.x} ${height}`;
      area += ` L ${points[0]!.x} ${height}`;
      area += ' Z';

      return { linePath: path, areaPath: area };
    }, [data, width, height]);

    if (!data || data.length < 2) {
      return (
        <div
          ref={ref}
          className={cn('preone-sparkline', className)}
          style={{ width, height, display: 'inline-flex', alignItems: 'center', ...style }}
          {...props}
        >
          <span style={{ fontSize: 11, color: theme.textMutedColor }}>—</span>
        </div>
      );
    }

    const gradientId = `preone-sparkline-grad-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div
        ref={ref}
        className={cn('preone-sparkline', className)}
        style={{ width, height, display: 'inline-flex', ...style }}
        {...props}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Sparkline with ${data.length} data points`}
        >
          {showArea && (
            <>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <path
                d={areaPath}
                fill={`url(#${gradientId})`}
                style={{
                  transition: animate ? 'all 0.4s ease-out' : undefined,
                }}
              />
            </>
          )}
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: animate ? 'all 0.4s ease-out' : undefined,
            }}
          />
        </svg>
      </div>
    );
  }
);

PreOneSparkline.displayName = 'PreOneSparkline';
