/**
 * @preone/config — Tailwind CSS v4 Preset
 *
 * The critical bridge between `@preone/design-tokens` and Tailwind CSS.
 *
 * This preset maps every design token (colors, spacing, radii, shadows,
 * typography, transitions, breakpoints) to CSS custom property references
 * (`var(--color-*)`, `var(--spacing-*)`, etc.) so that Tailwind utility
 * classes consume the design system's CSS variables.
 *
 * When the theme switches (light ↔ dark), the CSS variables update
 * and every Tailwind class automatically reflects the new theme —
 * no JavaScript class-swapping needed.
 *
 * ## Usage (Tailwind CSS v4)
 *
 * In your `app.css` or global stylesheet:
 * ```css
 * @import "tailwindcss";
 * @config "../node_modules/@preone/config/src/tailwind-preset.ts";
 * ```
 *
 * Or in a `tailwind.config.ts` (v3 compat):
 * ```ts
 * import { tailwindPreset } from '@preone/config/tailwind';
 * export default { presets: [tailwindPreset] };
 * ```
 *
 * ## Important
 *
 * The CSS custom properties must be injected into the document for
 * the `var(--*)` references to resolve. Use `@preone/design-tokens/css`
 * (`generateCssVariables()`) or the `withDesignTokens` Storybook
 * decorator to do this.
 */

// ---------------------------------------------------------------------------
// Color Scales — var(--color-{hue}-{step})
// ---------------------------------------------------------------------------

/**
 * Maps each PreOne color hue to its full 50–950 scale, referencing
 * CSS custom properties set by `@preone/design-tokens`.
 *
 * Example: `bg-blue-500` → `var(--color-blue-500, #3b82f6)`
 */
const colorScale = {
  slate: {
    50:  'var(--color-slate-50,  #f8fafc)',
    100: 'var(--color-slate-100, #f1f5f9)',
    200: 'var(--color-slate-200, #e2e8f0)',
    300: 'var(--color-slate-300, #cbd5e1)',
    400: 'var(--color-slate-400, #94a3b8)',
    500: 'var(--color-slate-500, #64748b)',
    600: 'var(--color-slate-600, #475569)',
    700: 'var(--color-slate-700, #334155)',
    800: 'var(--color-slate-800, #1e293b)',
    900: 'var(--color-slate-900, #0f172a)',
    950: 'var(--color-slate-950, #020617)',
  },
  red: {
    50:  'var(--color-red-50,  #fef2f2)',
    100: 'var(--color-red-100, #fee2e2)',
    200: 'var(--color-red-200, #fecaca)',
    300: 'var(--color-red-300, #fca5a5)',
    400: 'var(--color-red-400, #f87171)',
    500: 'var(--color-red-500, #ef4444)',
    600: 'var(--color-red-600, #dc2626)',
    700: 'var(--color-red-700, #b91c1c)',
    800: 'var(--color-red-800, #991b1b)',
    900: 'var(--color-red-900, #7f1d1d)',
    950: 'var(--color-red-950, #450a0a)',
  },
  orange: {
    50:  'var(--color-orange-50,  #fff7ed)',
    100: 'var(--color-orange-100, #ffedd5)',
    200: 'var(--color-orange-200, #fed7aa)',
    300: 'var(--color-orange-300, #fdba74)',
    400: 'var(--color-orange-400, #fb923c)',
    500: 'var(--color-orange-500, #f97316)',
    600: 'var(--color-orange-600, #ea580c)',
    700: 'var(--color-orange-700, #c2410c)',
    800: 'var(--color-orange-800, #9a3412)',
    900: 'var(--color-orange-900, #7c2d12)',
    950: 'var(--color-orange-950, #431407)',
  },
  amber: {
    50:  'var(--color-amber-50,  #fffbeb)',
    100: 'var(--color-amber-100, #fef3c7)',
    200: 'var(--color-amber-200, #fde68a)',
    300: 'var(--color-amber-300, #fcd34d)',
    400: 'var(--color-amber-400, #fbbf24)',
    500: 'var(--color-amber-500, #f59e0b)',
    600: 'var(--color-amber-600, #d97706)',
    700: 'var(--color-amber-700, #b45309)',
    800: 'var(--color-amber-800, #92400e)',
    900: 'var(--color-amber-900, #78350f)',
    950: 'var(--color-amber-950, #451a03)',
  },
  green: {
    50:  'var(--color-green-50,  #f0fdf4)',
    100: 'var(--color-green-100, #dcfce7)',
    200: 'var(--color-green-200, #bbf7d0)',
    300: 'var(--color-green-300, #86efac)',
    400: 'var(--color-green-400, #4ade80)',
    500: 'var(--color-green-500, #22c55e)',
    600: 'var(--color-green-600, #16a34a)',
    700: 'var(--color-green-700, #15803d)',
    800: 'var(--color-green-800, #166534)',
    900: 'var(--color-green-900, #14532d)',
    950: 'var(--color-green-950, #052e16)',
  },
  teal: {
    50:  'var(--color-teal-50,  #f0fdfa)',
    100: 'var(--color-teal-100, #ccfbf1)',
    200: 'var(--color-teal-200, #99f6e4)',
    300: 'var(--color-teal-300, #5eead4)',
    400: 'var(--color-teal-400, #2dd4bf)',
    500: 'var(--color-teal-500, #14b8a6)',
    600: 'var(--color-teal-600, #0d9488)',
    700: 'var(--color-teal-700, #0f766e)',
    800: 'var(--color-teal-800, #115e59)',
    900: 'var(--color-teal-900, #134e4a)',
    950: 'var(--color-teal-950, #042f2e)',
  },
  cyan: {
    50:  'var(--color-cyan-50,  #ecfeff)',
    100: 'var(--color-cyan-100, #cffafe)',
    200: 'var(--color-cyan-200, #a5f3fc)',
    300: 'var(--color-cyan-300, #67e8f9)',
    400: 'var(--color-cyan-400, #22d3ee)',
    500: 'var(--color-cyan-500, #06b6d4)',
    600: 'var(--color-cyan-600, #0891b2)',
    700: 'var(--color-cyan-700, #0e7490)',
    800: 'var(--color-cyan-800, #155e75)',
    900: 'var(--color-cyan-900, #164e63)',
    950: 'var(--color-cyan-950, #083344)',
  },
  blue: {
    50:  'var(--color-blue-50,  #eff6ff)',
    100: 'var(--color-blue-100, #dbeafe)',
    200: 'var(--color-blue-200, #bfdbfe)',
    300: 'var(--color-blue-300, #93c5fd)',
    400: 'var(--color-blue-400, #60a5fa)',
    500: 'var(--color-blue-500, #3b82f6)',
    600: 'var(--color-blue-600, #2563eb)',
    700: 'var(--color-blue-700, #1d4ed8)',
    800: 'var(--color-blue-800, #1e40af)',
    900: 'var(--color-blue-900, #1e3a8a)',
    950: 'var(--color-blue-950, #172554)',
  },
  indigo: {
    50:  'var(--color-indigo-50,  #eef2ff)',
    100: 'var(--color-indigo-100, #e0e7ff)',
    200: 'var(--color-indigo-200, #c7d2fe)',
    300: 'var(--color-indigo-300, #a5b4fc)',
    400: 'var(--color-indigo-400, #818cf8)',
    500: 'var(--color-indigo-500, #6366f1)',
    600: 'var(--color-indigo-600, #4f46e5)',
    700: 'var(--color-indigo-700, #4338ca)',
    800: 'var(--color-indigo-800, #3730a3)',
    900: 'var(--color-indigo-900, #312e81)',
    950: 'var(--color-indigo-950, #1e1b4b)',
  },
  violet: {
    50:  'var(--color-violet-50,  #f5f3ff)',
    100: 'var(--color-violet-100, #ede9fe)',
    200: 'var(--color-violet-200, #ddd6fe)',
    300: 'var(--color-violet-300, #c4b5fd)',
    400: 'var(--color-violet-400, #a78bfa)',
    500: 'var(--color-violet-500, #8b5cf6)',
    600: 'var(--color-violet-600, #7c3aed)',
    700: 'var(--color-violet-700, #6d28d9)',
    800: 'var(--color-violet-800, #5b21b6)',
    900: 'var(--color-violet-900, #4c1d95)',
    950: 'var(--color-violet-950, #2e1065)',
  },
  purple: {
    50:  'var(--color-purple-50,  #faf5ff)',
    100: 'var(--color-purple-100, #f3e8ff)',
    200: 'var(--color-purple-200, #e9d5ff)',
    300: 'var(--color-purple-300, #d8b4fe)',
    400: 'var(--color-purple-400, #c084fc)',
    500: 'var(--color-purple-500, #a855f7)',
    600: 'var(--color-purple-600, #9333ea)',
    700: 'var(--color-purple-700, #7e22ce)',
    800: 'var(--color-purple-800, #6b21f8)',
    900: 'var(--color-purple-900, #581c87)',
    950: 'var(--color-purple-950, #3b0764)',
  },
  pink: {
    50:  'var(--color-pink-50,  #fdf2f8)',
    100: 'var(--color-pink-100, #fce7f3)',
    200: 'var(--color-pink-200, #fbcfe8)',
    300: 'var(--color-pink-300, #f9a8d4)',
    400: 'var(--color-pink-400, #f472b6)',
    500: 'var(--color-pink-500, #ec4899)',
    600: 'var(--color-pink-600, #db2777)',
    700: 'var(--color-pink-700, #be185d)',
    800: 'var(--color-pink-800, #9d174d)',
    900: 'var(--color-pink-900, #831843)',
    950: 'var(--color-pink-950, #500724)',
  },
  rose: {
    50:  'var(--color-rose-50,  #fff1f2)',
    100: 'var(--color-rose-100, #ffe4e6)',
    200: 'var(--color-rose-200, #fecdd3)',
    300: 'var(--color-rose-300, #fda4af)',
    400: 'var(--color-rose-400, #fb7185)',
    500: 'var(--color-rose-500, #f43f5e)',
    600: 'var(--color-rose-600, #e11d48)',
    700: 'var(--color-rose-700, #be123c)',
    800: 'var(--color-rose-800, #9f1239)',
    900: 'var(--color-rose-900, #881337)',
    950: 'var(--color-rose-950, #4c0519)',
  },
} as const;

// ---------------------------------------------------------------------------
// Semantic Colors — var(--{semantic-name})
// ---------------------------------------------------------------------------

/**
 * Semantic color tokens that automatically switch between light and dark
 * themes via CSS custom properties.
 *
 * Example: `bg-primary` → `var(--primary, #4f46e5)` (light)
 *                           `var(--primary, #818cf8)` (dark)
 */
const semanticColors = {
  background:               'var(--background, #ffffff)',
  foreground:               'var(--foreground, #020617)',
  muted:                    'var(--muted, #f1f5f9)',
  'muted-foreground':       'var(--muted-foreground, #64748b)',
  card:                     'var(--card, #ffffff)',
  'card-foreground':        'var(--card-foreground, #020617)',
  popover:                  'var(--popover, #ffffff)',
  'popover-foreground':     'var(--popover-foreground, #020617)',
  primary:                  'var(--primary, #4f46e5)',
  'primary-foreground':     'var(--primary-foreground, #ffffff)',
  secondary:                'var(--secondary, #f1f5f9)',
  'secondary-foreground':   'var(--secondary-foreground, #0f172a)',
  accent:                   'var(--accent, #f1f5f9)',
  'accent-foreground':      'var(--accent-foreground, #0f172a)',
  destructive:              'var(--destructive, #dc2626)',
  'destructive-foreground': 'var(--destructive-foreground, #ffffff)',
  border:                   'var(--border, #e2e8f0)',
  input:                    'var(--input, #e2e8f0)',
  ring:                     'var(--ring, #4f46e5)',
  success:                  'var(--success, #16a34a)',
  'success-foreground':     'var(--success-foreground, #ffffff)',
  warning:                  'var(--warning, #f59e0b)',
  'warning-foreground':     'var(--warning-foreground, #451a03)',
  info:                     'var(--info, #2563eb)',
  'info-foreground':        'var(--info-foreground, #ffffff)',
  'chart-1':                'var(--chart-1, #6366f1)',
  'chart-2':                'var(--chart-2, #14b8a6)',
  'chart-3':                'var(--chart-3, #f59e0b)',
  'chart-4':                'var(--chart-4, #f43f5e)',
  'chart-5':                'var(--chart-5, #8b5cf6)',
  'sidebar-background':          'var(--sidebar-background, #f8fafc)',
  'sidebar-foreground':          'var(--sidebar-foreground, #0f172a)',
  'sidebar-primary':             'var(--sidebar-primary, #4f46e5)',
  'sidebar-primary-foreground':  'var(--sidebar-primary-foreground, #ffffff)',
  'sidebar-accent':              'var(--sidebar-accent, #f1f5f9)',
  'sidebar-accent-foreground':   'var(--sidebar-accent-foreground, #0f172a)',
  'sidebar-border':              'var(--sidebar-border, #e2e8f0)',
  'sidebar-ring':                'var(--sidebar-ring, #4f46e5)',
} as const;

// ---------------------------------------------------------------------------
// Spacing — var(--spacing-*)
// ---------------------------------------------------------------------------

/**
 * Spacing scale referencing CSS custom properties from `@preone/design-tokens`.
 *
 * Example: `p-4` → `var(--spacing-4, 1rem)`
 */
const spacingScale = {
  '0':   'var(--spacing-0, 0rem)',
  '0.5': 'var(--spacing-0-5, 0.125rem)',
  '1':   'var(--spacing-1, 0.25rem)',
  '1.5': 'var(--spacing-1-5, 0.375rem)',
  '2':   'var(--spacing-2, 0.5rem)',
  '2.5': 'var(--spacing-2-5, 0.625rem)',
  '3':   'var(--spacing-3, 0.75rem)',
  '3.5': 'var(--spacing-3-5, 0.875rem)',
  '4':   'var(--spacing-4, 1rem)',
  '5':   'var(--spacing-5, 1.25rem)',
  '6':   'var(--spacing-6, 1.5rem)',
  '7':   'var(--spacing-7, 1.75rem)',
  '8':   'var(--spacing-8, 2rem)',
  '9':   'var(--spacing-9, 2.25rem)',
  '10':  'var(--spacing-10, 2.5rem)',
  '11':  'var(--spacing-11, 2.75rem)',
  '12':  'var(--spacing-12, 3rem)',
  '14':  'var(--spacing-14, 3.5rem)',
  '16':  'var(--spacing-16, 4rem)',
  '20':  'var(--spacing-20, 5rem)',
  '24':  'var(--spacing-24, 6rem)',
  '28':  'var(--spacing-28, 7rem)',
  '32':  'var(--spacing-32, 8rem)',
  '36':  'var(--spacing-36, 9rem)',
  '40':  'var(--spacing-40, 10rem)',
  '44':  'var(--spacing-44, 11rem)',
  '48':  'var(--spacing-48, 12rem)',
  '52':  'var(--spacing-52, 13rem)',
  '56':  'var(--spacing-56, 14rem)',
  '60':  'var(--spacing-60, 15rem)',
  '64':  'var(--spacing-64, 16rem)',
  '72':  'var(--spacing-72, 18rem)',
  '80':  'var(--spacing-80, 20rem)',
  '96':  'var(--spacing-96, 24rem)',
} as const;

// ---------------------------------------------------------------------------
// Typography — var(--font-*), var(--text-*), var(--leading-*), var(--tracking-*)
// ---------------------------------------------------------------------------

/**
 * Font family stacks referencing CSS custom properties.
 *
 * Example: `font-sans` → `var(--font-sans, Inter, …)`
 */
const fontFamilyScale = {
  sans:  'var(--font-sans, Inter, "Inter UI", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)',
  serif: 'var(--font-serif, Georgia, "Times New Roman", "DejaVu Serif", serif)',
  mono:  'var(--font-mono, "Fira Code", "JetBrains Mono", "Cascadia Code", "SF Mono", Menlo, Consolas, monospace)',
} as const;

/**
 * Font size scale referencing CSS custom properties.
 *
 * Example: `text-sm` → `var(--text-sm, 0.875rem)`
 */
const fontSizeScale = {
  xs:    'var(--text-xs, 0.75rem)',
  sm:    'var(--text-sm, 0.875rem)',
  base:  'var(--text-base, 1rem)',
  lg:    'var(--text-lg, 1.125rem)',
  xl:    'var(--text-xl, 1.25rem)',
  '2xl': 'var(--text-2xl, 1.5rem)',
  '3xl': 'var(--text-3xl, 1.875rem)',
  '4xl': 'var(--text-4xl, 2.25rem)',
  '5xl': 'var(--text-5xl, 3rem)',
  '6xl': 'var(--text-6xl, 3.75rem)',
  '7xl': 'var(--text-7xl, 4.5rem)',
  '8xl': 'var(--text-8xl, 6rem)',
  '9xl': 'var(--text-9xl, 8rem)',
} as const;

/**
 * Font weight scale referencing CSS custom properties.
 *
 * Example: `font-semibold` → `var(--font-semibold, 600)`
 */
const fontWeightScale = {
  thin:       'var(--font-thin, 100)',
  extralight: 'var(--font-extralight, 200)',
  light:      'var(--font-light, 300)',
  normal:     'var(--font-normal, 400)',
  medium:     'var(--font-medium, 500)',
  semibold:   'var(--font-semibold, 600)',
  bold:       'var(--font-bold, 700)',
  extrabold:  'var(--font-extrabold, 800)',
  black:      'var(--font-black, 900)',
} as const;

/**
 * Line height scale referencing CSS custom properties.
 *
 * Example: `leading-snug` → `var(--leading-snug, 1.375)`
 */
const lineHeightScale = {
  none:    'var(--leading-none, 1)',
  tight:   'var(--leading-tight, 1.25)',
  snug:    'var(--leading-snug, 1.375)',
  normal:  'var(--leading-normal, 1.5)',
  relaxed: 'var(--leading-relaxed, 1.625)',
  loose:   'var(--leading-loose, 2)',
} as const;

/**
 * Letter spacing (tracking) scale referencing CSS custom properties.
 *
 * Example: `tracking-tight` → `var(--tracking-tight, -0.025em)`
 */
const letterSpacingScale = {
  tighter: 'var(--tracking-tighter, -0.05em)',
  tight:   'var(--tracking-tight, -0.025em)',
  normal:  'var(--tracking-normal, 0em)',
  wide:    'var(--tracking-wide, 0.025em)',
  wider:   'var(--tracking-wider, 0.05em)',
  widest:  'var(--tracking-widest, 0.1em)',
} as const;

// ---------------------------------------------------------------------------
// Borders & Radii — var(--border-*), var(--radius-*)
// ---------------------------------------------------------------------------

/**
 * Border width scale referencing CSS custom properties.
 *
 * Example: `border-1` → `var(--border-1, 1px)`
 */
const borderWidthScale = {
  none: 'var(--border-none, 0px)',
  '1':  'var(--border-1, 1px)',
  '2':  'var(--border-2, 2px)',
  '4':  'var(--border-4, 4px)',
  '8':  'var(--border-8, 8px)',
} as const;

/**
 * Border radius scale referencing CSS custom properties.
 *
 * Example: `rounded-lg` → `var(--radius-lg, 0.75rem)`
 */
const borderRadiusScale = {
  none:    'var(--radius-none, 0px)',
  sm:      'var(--radius-sm, 0.125rem)',
  default: 'var(--radius-default, 0.375rem)',
  md:      'var(--radius-md, 0.5rem)',
  lg:      'var(--radius-lg, 0.75rem)',
  xl:      'var(--radius-xl, 1rem)',
  '2xl':   'var(--radius-2xl, 1.5rem)',
  '3xl':   'var(--radius-3xl, 2rem)',
  full:    'var(--radius-full, 9999px)',
} as const;

// ---------------------------------------------------------------------------
// Shadows — var(--shadow-*)
// ---------------------------------------------------------------------------

/**
 * Box shadow scale referencing CSS custom properties.
 *
 * Example: `shadow-md` → `var(--shadow-md, 0 4px 6px -1px …)`
 */
const boxShadowScale = {
  sm:      'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.04))',
  DEFAULT: 'var(--shadow-DEFAULT, 0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04))',
  md:      'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.04))',
  lg:      'var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.04))',
  xl:      'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.04))',
  '2xl':   'var(--shadow-2xl, 0 25px 50px -12px rgba(0, 0, 0, 0.08))',
  inner:   'var(--shadow-inner, inset 0 2px 4px 0 rgba(0, 0, 0, 0.04))',
} as const;

// ---------------------------------------------------------------------------
// Transitions — var(--duration-*), var(--ease-*)
// ---------------------------------------------------------------------------

/**
 * Transition duration scale referencing CSS custom properties.
 *
 * Example: `duration-fast` → `var(--duration-fast, 150ms)`
 */
const transitionDurationScale = {
  fast:   'var(--duration-fast, 150ms)',
  normal: 'var(--duration-normal, 200ms)',
  slow:   'var(--duration-slow, 300ms)',
} as const;

/**
 * Transition timing (easing) scale referencing CSS custom properties.
 *
 * Example: `ease-default` → `var(--ease-DEFAULT, cubic-bezier(0.0, 0.0, 0.2, 1))`
 */
const transitionTimingScale = {
  DEFAULT: 'var(--ease-DEFAULT, cubic-bezier(0.0, 0.0, 0.2, 1))',
  linear:  'var(--ease-linear, cubic-bezier(0.0, 0.0, 1.0, 1.0))',
  in:      'var(--ease-in, cubic-bezier(0.4, 0.0, 1.0, 1.0))',
  out:     'var(--ease-out, cubic-bezier(0.0, 0.0, 0.2, 1.0))',
  'in-out':'var(--ease-in-out, cubic-bezier(0.4, 0.0, 0.2, 1.0))',
} as const;

// ---------------------------------------------------------------------------
// Breakpoints — var(--breakpoint-*)
// ---------------------------------------------------------------------------

/**
 * Responsive breakpoint scale referencing CSS custom properties.
 *
 * Example: `md:grid-cols-2` → `@media (min-width: var(--breakpoint-md, 768px)) { … }`
 */
const screensScale = {
  sm:   'var(--breakpoint-sm, 640px)',
  md:   'var(--breakpoint-md, 768px)',
  lg:   'var(--breakpoint-lg, 1024px)',
  xl:   'var(--breakpoint-xl, 1280px)',
  '2xl':'var(--breakpoint-2xl, 1536px)',
} as const;

// ---------------------------------------------------------------------------
// Assembled Preset
// ---------------------------------------------------------------------------

/**
 * The Tailwind CSS v4 preset for the PreOne Enterprise Platform.
 *
 * This is the single object that should be passed to Tailwind's `presets`
 * array (v3) or referenced via `@config` (v4). Every token resolves to a
 * CSS custom property so that theme switching (light ↔ dark) is automatic
 * when the underlying variables change.
 *
 * @example
 * ```ts
 * // tailwind.config.ts (v3)
 * import { tailwindPreset } from '@preone/config/tailwind';
 * export default { presets: [tailwindPreset] };
 * ```
 *
 * @example
 * ```css
 * /* app.css (v4) * /
 * @import "tailwindcss";
 * @config "../node_modules/@preone/config/src/tailwind-preset.ts";
 * ```
 */
export const tailwindPreset = {
  theme: {
    screens: screensScale,

    colors: {
      ...colorScale,
      ...semanticColors,
    },

    spacing: spacingScale,

    fontFamily: fontFamilyScale,
    fontSize: fontSizeScale,
    fontWeight: fontWeightScale,
    lineHeight: lineHeightScale,
    letterSpacing: letterSpacingScale,

    borderWidth: borderWidthScale,
    borderRadius: borderRadiusScale,

    boxShadow: boxShadowScale,

    transitionDuration: transitionDurationScale,
    transitionTimingFunction: transitionTimingScale,
  },
} as const;

/**
 * Type representing the full Tailwind CSS preset object.
 * Useful for consumers that need to extend or merge the preset.
 */
export type TailwindPreset = typeof tailwindPreset;
