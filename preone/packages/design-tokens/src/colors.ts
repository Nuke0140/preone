/**
 * @preone/design-tokens — Colors
 *
 * Complete color system for the PreOne Enterprise Platform.
 * Includes full Tailwind-style color scales (50–950) for 13 hues,
 * plus semantic color mappings for light and dark themes.
 *
 * Design rules:
 * - Use semantic tokens exclusively in components — never raw scales.
 * - Primary = indigo (trust, professionalism, enterprise).
 * - Destructive = red, Warning = amber, Success = green, Info = blue.
 * - Backgrounds are white (light) / slate.950 (dark) for maximum clarity.
 */

// ---------------------------------------------------------------------------
// Color Scale
// ---------------------------------------------------------------------------

/**
 * Numeric keys representing a single hue's lightness gradient.
 * 50 = lightest, 950 = darkest.
 */
export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
};

/**
 * Named hues available in the PreOne palette.
 * These map 1-to-1 to the standard Tailwind CSS colour palette.
 */
export type ColorToken =
  | 'slate'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'pink'
  | 'rose';

// ---------------------------------------------------------------------------
// Primitive Color Scales
// ---------------------------------------------------------------------------

/**
 * Full Tailwind-style colour scales for every named hue.
 * Each scale runs from 50 (lightest) to 950 (darkest).
 */
export const colors: Record<ColorToken, ColorScale> = {
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21f8',
    900: '#581c87',
    950: '#3b0764',
  },
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
    950: '#500724',
  },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519',
  },
};

// ---------------------------------------------------------------------------
// Semantic Colors
// ---------------------------------------------------------------------------

/**
 * Semantic colour tokens used throughout the UI layer.
 *
 * Components must reference these tokens — never the raw colour scales —
 * so that switching between light and dark themes is automatic.
 *
 * Naming convention follows shadcn/ui conventions for easy adoption.
 */
export interface SemanticColors {
  /** Main app background */
  background: string;
  /** Default body text */
  foreground: string;
  /** Muted / disabled backgrounds */
  muted: string;
  /** Text on muted backgrounds */
  mutedForeground: string;
  /** Card container background */
  card: string;
  /** Text inside cards */
  cardForeground: string;
  /** Popover / dropdown background */
  popover: string;
  /** Text inside popovers */
  popoverForeground: string;
  /** Primary action colour (buttons, links, highlights) */
  primary: string;
  /** Text on primary backgrounds */
  primaryForeground: string;
  /** Secondary action colour */
  secondary: string;
  /** Text on secondary backgrounds */
  secondaryForeground: string;
  /** Accent / highlighted colour (hover states, badges) */
  accent: string;
  /** Text on accent backgrounds */
  accentForeground: string;
  /** Destructive / error colour */
  destructive: string;
  /** Text on destructive backgrounds */
  destructiveForeground: string;
  /** Default border colour */
  border: string;
  /** Input field border / background */
  input: string;
  /** Focus ring colour */
  ring: string;
  /** Success state colour */
  success: string;
  /** Text on success backgrounds */
  successForeground: string;
  /** Warning state colour */
  warning: string;
  /** Text on warning backgrounds */
  warningForeground: string;
  /** Informational state colour */
  info: string;
  /** Text on info backgrounds */
  infoForeground: string;
  /** Chart colour 1 */
  chart1: string;
  /** Chart colour 2 */
  chart2: string;
  /** Chart colour 3 */
  chart3: string;
  /** Chart colour 4 */
  chart4: string;
  /** Chart colour 5 */
  chart5: string;
  /** Sidebar background */
  sidebarBackground: string;
  /** Sidebar text */
  sidebarForeground: string;
  /** Sidebar primary action colour */
  sidebarPrimary: string;
  /** Text on sidebar primary actions */
  sidebarPrimaryForeground: string;
  /** Sidebar accent / hover colour */
  sidebarAccent: string;
  /** Text on sidebar accent */
  sidebarAccentForeground: string;
  /** Sidebar border */
  sidebarBorder: string;
  /** Sidebar focus ring */
  sidebarRing: string;
}

/**
 * Semantic colour mappings for both light and dark themes.
 *
 * Light theme: clean white surfaces, dark text, indigo primary.
 * Dark theme: deep slate surfaces, light text, lighter indigo primary.
 *
 * The `light` and `dark` keys mirror CSS `prefers-color-scheme` usage.
 */
export const semanticColors: {
  light: SemanticColors;
  dark: SemanticColors;
} = {
  light: {
    background:        '#ffffff',
    foreground:        colors.slate[950],
    muted:             colors.slate[100],
    mutedForeground:   colors.slate[500],
    card:              '#ffffff',
    cardForeground:    colors.slate[950],
    popover:           '#ffffff',
    popoverForeground: colors.slate[950],
    primary:           colors.indigo[600],
    primaryForeground: '#ffffff',
    secondary:         colors.slate[100],
    secondaryForeground: colors.slate[900],
    accent:            colors.slate[100],
    accentForeground:  colors.slate[900],
    destructive:       colors.red[600],
    destructiveForeground: '#ffffff',
    border:            colors.slate[200],
    input:             colors.slate[200],
    ring:              colors.indigo[600],
    success:           colors.green[600],
    successForeground: '#ffffff',
    warning:           colors.amber[500],
    warningForeground: colors.amber[950],
    info:              colors.blue[600],
    infoForeground:    '#ffffff',
    chart1:            colors.indigo[500],
    chart2:            colors.teal[500],
    chart3:            colors.amber[500],
    chart4:            colors.rose[500],
    chart5:            colors.violet[500],
    sidebarBackground:    colors.slate[50],
    sidebarForeground:    colors.slate[900],
    sidebarPrimary:       colors.indigo[600],
    sidebarPrimaryForeground: '#ffffff',
    sidebarAccent:        colors.slate[100],
    sidebarAccentForeground: colors.slate[900],
    sidebarBorder:        colors.slate[200],
    sidebarRing:          colors.indigo[600],
  },
  dark: {
    background:        colors.slate[950],
    foreground:        colors.slate[50],
    muted:             colors.slate[800],
    mutedForeground:   colors.slate[400],
    card:              colors.slate[900],
    cardForeground:    colors.slate[50],
    popover:           colors.slate[900],
    popoverForeground: colors.slate[50],
    primary:           colors.indigo[400],
    primaryForeground: colors.indigo[950],
    secondary:         colors.slate[800],
    secondaryForeground: colors.slate[100],
    accent:            colors.slate[800],
    accentForeground:  colors.slate[100],
    destructive:       colors.red[500],
    destructiveForeground: colors.red[950],
    border:            colors.slate[800],
    input:             colors.slate[800],
    ring:              colors.indigo[400],
    success:           colors.green[500],
    successForeground: colors.green[950],
    warning:           colors.amber[400],
    warningForeground: colors.amber[950],
    info:              colors.blue[400],
    infoForeground:    colors.blue[950],
    chart1:            colors.indigo[400],
    chart2:            colors.teal[400],
    chart3:            colors.amber[400],
    chart4:            colors.rose[400],
    chart5:            colors.violet[400],
    sidebarBackground:    colors.slate[900],
    sidebarForeground:    colors.slate[100],
    sidebarPrimary:       colors.indigo[400],
    sidebarPrimaryForeground: colors.indigo[950],
    sidebarAccent:        colors.slate[800],
    sidebarAccentForeground: colors.slate[100],
    sidebarBorder:        colors.slate[700],
    sidebarRing:          colors.indigo[400],
  },
};
