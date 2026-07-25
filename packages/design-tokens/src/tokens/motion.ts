/**
 * Motion / animation tokens for PreOne design system.
 * Duration, easing, and named animations.
 */

export interface DurationTokens {
  instant:  string;
  fast:     string;
  normal:   string;
  slow:     string;
  slower:   string;
  slowest:  string;
}

export interface EasingTokens {
  default: string;
  linear:  string;
  in:      string;
  out:     string;
  inOut:   string;
  bounce:  string;
  spring:  string;
}

export interface AnimationTokens {
  fadeIn:   string;
  fadeOut:  string;
  slideIn:  string;
  slideOut: string;
  scaleIn:  string;
  scaleOut: string;
  spin:     string;
  pulse:    string;
  bounce:   string;
}

export interface MotionTokens {
  duration:  DurationTokens;
  easing:    EasingTokens;
  animation: AnimationTokens;
}

export const motionTokens: MotionTokens = Object.freeze({
  duration: Object.freeze({
    instant: "0ms",
    fast:    "150ms",
    normal:  "200ms",
    slow:    "300ms",
    slower:  "500ms",
    slowest: "700ms",
  }),

  easing: Object.freeze({
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    linear:  "linear",
    in:      "cubic-bezier(0.4, 0, 1, 1)",
    out:     "cubic-bezier(0, 0, 0.2, 1)",
    inOut:   "cubic-bezier(0.4, 0, 0.2, 1)",
    bounce:  "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    spring:  "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  }),

  animation: Object.freeze({
    fadeIn:   "preone-fade-in 200ms ease-out",
    fadeOut:  "preone-fade-out 200ms ease-in",
    slideIn:  "preone-slide-in 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    slideOut: "preone-slide-out 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    scaleIn:  "preone-scale-in 200ms cubic-bezier(0.4, 0, 0.2, 1)",
    scaleOut: "preone-scale-out 200ms cubic-bezier(0.4, 0, 0.2, 1)",
    spin:     "preone-spin 1000ms linear infinite",
    pulse:    "preone-pulse 2000ms cubic-bezier(0.4, 0, 0.6, 1) infinite",
    bounce:   "preone-bounce 1000ms infinite",
  }),
});

/** Keyframe definitions (for CSS generator) */
export const keyframes: Record<string, string> = Object.freeze({
  "preone-fade-in": `
    from { opacity: 0; }
    to   { opacity: 1; }
  `,
  "preone-fade-out": `
    from { opacity: 1; }
    to   { opacity: 0; }
  `,
  "preone-slide-in": `
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  `,
  "preone-slide-out": `
    from { transform: translateY(0);   opacity: 1; }
    to   { transform: translateY(8px); opacity: 0; }
  `,
  "preone-scale-in": `
    from { transform: scale(0.95); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  `,
  "preone-scale-out": `
    from { transform: scale(1);    opacity: 1; }
    to   { transform: scale(0.95); opacity: 0; }
  `,
  "preone-spin": `
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  `,
  "preone-pulse": `
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.5; }
  `,
  "preone-bounce": `
    0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
    50%      { transform: translateY(0);    animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
  `,
});
