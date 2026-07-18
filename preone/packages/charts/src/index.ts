/**
 * @preone/charts - PreOne Enterprise chart components
 *
 * Built on Recharts with design token theming, auto dark mode,
 * responsive containers, and consistent API.
 */

// Container
export { ChartContainer, type ChartContainerProps } from './chart-container.js';

// Chart components
export { PreLineChart, type PreLineChartProps, type LineDef } from './line-chart.js';
export { PreAreaChart, type PreAreaChartProps, type AreaDef } from './area-chart.js';
export { PreBarChart, type PreBarChartProps, type BarDef, type BarChartLayout } from './bar-chart.js';
export { PrePieChart, type PrePieChartProps, type PieSegmentDef } from './pie-chart.js';
export { PreScatterChart, type PreScatterChartProps, type ScatterDef } from './scatter-chart.js';
export { PreRadarChart, type PreRadarChartProps, type RadarDef } from './radar-chart.js';
export { GaugeChart, type GaugeChartProps } from './gauge-chart.js';
export { Sparkline, type SparklineProps } from './sparkline.js';

// Shared components
export { ChartLegend, type ChartLegendProps } from './chart-legend.js';
export { ChartTooltip, type ChartTooltipProps } from './chart-tooltip.js';

// Theming
export { useChartTheme, type ChartTheme, lightTheme, darkTheme } from './use-chart-theme.js';

// Utility
export { cn } from './cn.js';
