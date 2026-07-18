'use client';

import React, { forwardRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { useChartTheme, useTooltipStyle } from '../hooks/useChartTheme';
import { DEFAULT_CHART_PALETTE, DARK_CHART_PALETTE } from '../utils/chart-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PieDataItem {
  [key: string]: string | number;
}

export interface PreOnePieChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of data objects for pie slices */
  data: PieDataItem[];
  /** Key in data for the value */
  dataKey: string;
  /** Key in data for the label name */
  nameKey: string;
  /** Custom color palette for the slices. Defaults to design token palette */
  colors?: string[];
  /** Inner radius for donut charts */
  innerRadius?: number;
  /** Outer radius */
  outerRadius?: number;
  /** Show labels on slices */
  showLabel?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Enable animation */
  animate?: boolean;
  /** Render as donut chart (shortcut for setting innerRadius) */
  donut?: boolean;
  /** Chart height in pixels */
  height?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const PreOnePieChart = forwardRef<HTMLDivElement, PreOnePieChartProps>(
  (
    {
      data,
      dataKey,
      nameKey,
      colors: customColors,
      innerRadius: customInnerRadius,
      outerRadius = 120,
      showLabel = false,
      showLegend = true,
      showTooltip = true,
      animate = true,
      donut = false,
      height = 300,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const theme = useChartTheme();
    const tooltipStyle = useTooltipStyle();

    const effectiveInnerRadius = customInnerRadius ?? (donut ? outerRadius * 0.6 : 0);

    const palette = useMemo(() => {
      if (customColors && customColors.length > 0) {
        return customColors;
      }
      return theme.isDark ? [...DARK_CHART_PALETTE] : [...DEFAULT_CHART_PALETTE];
    }, [customColors, theme.isDark]);

    const chartContent = useMemo(
      () => (
        <RechartsPieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={effectiveInnerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            label={
              showLabel
                ? (props: { percent: number; name: string; cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = props.innerRadius + (props.outerRadius - props.innerRadius) * 0.5;
                    const x = props.cx + radius * Math.cos(-props.midAngle * RADIAN);
                    const y = props.cy + radius * Math.sin(-props.midAngle * RADIAN);
                    return (
                      <text
                        x={x}
                        y={y}
                        fill={theme.textColor}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={11}
                        fontWeight={500}
                      >
                        {`${(props.percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }
                : false
            }
            animationDuration={animate ? 600 : 0}
            animationEasing="ease-out"
            strokeWidth={1}
            stroke={theme.cardBackgroundColor}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={palette[index % palette.length]!}
              />
            ))}
          </Pie>
          {showTooltip && <Tooltip {...tooltipStyle} />}
          {showLegend && (
            <Legend
              wrapperStyle={{
                color: theme.textColor,
                fontSize: 12,
                paddingTop: 16,
              }}
              formatter={(value: string) => (
                <span style={{ color: theme.textColor, fontSize: 12 }}>{value}</span>
              )}
            />
          )}
        </RechartsPieChart>
      ),
      [data, dataKey, nameKey, effectiveInnerRadius, outerRadius, showLabel, showLegend, showTooltip, animate, palette, theme, tooltipStyle]
    );

    return (
      <div
        ref={ref}
        className={className}
        style={{ width: '100%', height, ...style }}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {chartContent}
        </ResponsiveContainer>
      </div>
    );
  }
);

PreOnePieChart.displayName = 'PreOnePieChart';
