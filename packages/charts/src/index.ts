/**
 * @preone/charts - Theme-aware chart components for the PreOne Design System
 *
 * Built on Recharts with automatic dark mode support,
 * design token integration, and responsive layouts.
 */

// ─── Components ──────────────────────────────────────────────────────────────

export {
  ChartContainer,
  type ChartContainerProps,
} from './components/ChartContainer';

export {
  PreOneLineChart,
  type LineConfig,
  type PreOneLineChartProps,
} from './components/LineChart';

export {
  PreOneAreaChart,
  type AreaConfig,
  type PreOneAreaChartProps,
} from './components/AreaChart';

export {
  PreOneBarChart,
  type BarConfig,
  type PreOneBarChartProps,
} from './components/BarChart';

export {
  PreOnePieChart,
  type PieDataItem,
  type PreOnePieChartProps,
} from './components/PieChart';

export {
  PreOneScatterChart,
  type ScatterDataItem,
  type PreOneScatterChartProps,
} from './components/ScatterChart';

export {
  PreOneRadarChart,
  type RadarConfig,
  type PreOneRadarChartProps,
} from './components/RadarChart';

export {
  PreOneGaugeChart,
  type GaugeSegment,
  type PreOneGaugeChartProps,
} from './components/GaugeChart';

export {
  PreOneSparkline,
  type PreOneSparklineProps,
} from './components/Sparkline';

// ─── Hooks ───────────────────────────────────────────────────────────────────

export {
  useChartTheme,
  useTooltipStyle,
  type ChartTheme,
} from './hooks/useChartTheme';

// ─── Utilities ───────────────────────────────────────────────────────────────

export {
  DEFAULT_CHART_PALETTE,
  DARK_CHART_PALETTE,
  formatNumber,
  formatPercent,
  formatCurrency,
  hexToRgba,
  generateColorPalette,
  getPaletteColor,
  resolveColor,
} from './utils/chart-utils';
