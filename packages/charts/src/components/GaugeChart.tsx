'use client';

import React, { forwardRef, useMemo } from 'react';
import { cn } from '@preone/ui';
import { colors, fontSize, fontWeight, spacing } from '@preone/design-tokens';
import { useChartTheme } from '../hooks/useChartTheme';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GaugeSegment {
  /** Start value of this segment */
  from: number;
  /** End value of this segment */
  to: number;
  /** Color for this segment */
  color: string;
}

export interface PreOneGaugeChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value to display */
  value: number;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Label displayed below the value */
  label?: string;
  /** Array of colored segments on the gauge arc */
  segments?: GaugeSegment[];
  /** Colors for auto-generated segments if segments not provided */
  colors?: string[];
  /** Show the numeric value in the center */
  showValue?: boolean;
  /** Enable animation */
  animate?: boolean;
  /** Chart height in pixels */
  height?: number;
}

// ─── Default Segments ────────────────────────────────────────────────────────

const DEFAULT_SEGMENTS_LIGHT: GaugeSegment[] = [
  { from: 0, to: 33, color: colors.emerald[500]! },
  { from: 33, to: 66, color: colors.amber[500]! },
  { from: 66, to: 100, color: colors.red[500]! },
];

const DEFAULT_SEGMENTS_DARK: GaugeSegment[] = [
  { from: 0, to: 33, color: colors.emerald[400]! },
  { from: 33, to: 66, color: colors.amber[400]! },
  { from: 66, to: 100, color: colors.red[400]! },
];

// ─── Component ───────────────────────────────────────────────────────────────

export const PreOneGaugeChart = forwardRef<HTMLDivElement, PreOneGaugeChartProps>(
  (
    {
      value,
      min = 0,
      max = 100,
      label,
      segments,
      colors: customColors,
      showValue = true,
      animate = true,
      height = 200,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const theme = useChartTheme();

    const effectiveSegments = useMemo(() => {
      if (segments && segments.length > 0) return segments;
      return theme.isDark ? DEFAULT_SEGMENTS_DARK : DEFAULT_SEGMENTS_LIGHT;
    }, [segments, theme.isDark]);

    const clampedValue = Math.min(Math.max(value, min), max);
    const percentage = (clampedValue - min) / (max - min);

    // Arc math — we draw a 180° (semicircle) gauge
    const svgWidth = 240;
    const svgHeight = 140;
    const centerX = svgWidth / 2;
    const centerY = svgHeight - 10;
    const outerR = 100;
    const innerR = 72;
    const arcStartAngle = Math.PI; // 180°
    const arcEndAngle = 0;       // 0°

    function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY - radius * Math.sin(angle),
      };
    }

    function describeArc(
      startAngle: number,
      endAngle: number,
      radius: number
    ): string {
      const start = polarToCartesian(startAngle, radius);
      const end = polarToCartesian(endAngle, radius);
      const largeArcFlag = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
      return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
    }

    // Background track arc
    const bgArcPath = describeArc(arcStartAngle, arcEndAngle, outerR);
    const bgInnerArcPath = describeArc(arcStartAngle, arcEndAngle, innerR);

    // Value needle angle
    const needleAngle = arcStartAngle - percentage * Math.PI;
    const needleEnd = polarToCartesian(needleAngle, outerR - 4);

    // Value arc — fill from start to current position
    const valueAngle = arcStartAngle - percentage * Math.PI;
    const valueOuterArc = describeArc(arcStartAngle, valueAngle, outerR);
    const valueInnerArc = describeArc(valueAngle, arcStartAngle, innerR);

    // Build segment arcs
    const segmentPaths = useMemo(() => {
      return effectiveSegments.map((seg) => {
        const segStartPct = (seg.from - min) / (max - min);
        const segEndPct = (seg.to - min) / (max - min);
        const segStartAngle = arcStartAngle - segStartPct * Math.PI;
        const segEndAngle = arcStartAngle - segEndPct * Math.PI;
        const outerPath = describeArc(segStartAngle, segEndAngle, outerR);
        const innerPath = describeArc(segEndAngle, segStartAngle, innerR);

        const endOuter = polarToCartesian(segEndAngle, outerR);
        const endInner = polarToCartesian(segEndAngle, innerR);
        const startInner = polarToCartesian(segStartAngle, innerR);

        const path = [
          outerPath,
          `L ${endOuter.x} ${endOuter.y}`,
          `L ${endInner.x} ${endInner.y}`,
          innerPath,
          `L ${startInner.x} ${startInner.y}`,
          'Z',
        ].join(' ');

        return { path, color: seg.color };
      });
    }, [effectiveSegments, min, max]);

    const displayValue = typeof value === 'number' ? Math.round(value) : value;

    return (
      <div
        ref={ref}
        className={cn('preone-gauge-chart', className)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height,
          ...style,
        }}
        {...props}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height="100%"
          style={{ maxHeight: height - 40 }}
          role="img"
          aria-label={`Gauge showing ${displayValue}`}
        >
          {/* Background track */}
          <path
            d={`${bgArcPath} L ${polarToCartesian(arcEndAngle, innerR).x} ${polarToCartesian(arcEndAngle, innerR).y} ${bgInnerArcPath.replace('M', 'L')} Z`}
            fill={theme.isDark ? colors.slate[800] : colors.slate[100]}
            opacity={0.5}
          />

          {/* Segment arcs */}
          {segmentPaths.map((seg, i) => (
            <path
              key={i}
              d={seg.path}
              fill={seg.color}
              opacity={0.2}
            />
          ))}

          {/* Value arc (filled portion) */}
          {valueAngle < arcStartAngle && (
            <>
              <clipPath id="gauge-value-clip">
                <path
                  d={`${valueOuterArc} L ${polarToCartesian(valueAngle, innerR).x} ${polarToCartesian(valueAngle, innerR).y} ${valueInnerArc.replace('M', 'L')} Z`}
                />
              </clipPath>
              {segmentPaths.map((seg, i) => (
                <path
                  key={`val-${i}`}
                  d={seg.path}
                  fill={seg.color}
                  clipPath="url(#gauge-value-clip)"
                  style={{
                    transition: animate ? 'all 0.6s ease-out' : undefined,
                  }}
                />
              ))}
            </>
          )}

          {/* Needle */}
          <line
            x1={centerX}
            y1={centerY}
            x2={needleEnd.x}
            y2={needleEnd.y}
            stroke={theme.textColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{
              transition: animate ? 'all 0.6s ease-out' : undefined,
            }}
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={5}
            fill={theme.textColor}
          />
        </svg>

        {/* Value and label */}
        {showValue && (
          <div style={{ textAlign: 'center', marginTop: spacing[1] }}>
            <div
              style={{
                fontSize: fontSize['2xl'],
                fontWeight: Number(fontWeight.bold),
                color: theme.textColor,
                lineHeight: 1.2,
              }}
            >
              {displayValue}
            </div>
            {label && (
              <div
                style={{
                  fontSize: fontSize.sm,
                  color: theme.textMutedColor,
                  marginTop: spacing[0.5],
                }}
              >
                {label}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

PreOneGaugeChart.displayName = 'PreOneGaugeChart';
