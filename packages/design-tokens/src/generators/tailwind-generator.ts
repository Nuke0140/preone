/**
 * Tailwind theme generator.
 * Maps PreOne design tokens to a Tailwind CSS theme configuration object.
 */

import type { DesignTokens } from "../tokens/index";
import { keyframes as motionKeyframes } from "../tokens/motion";

/** Build the color mapping for Tailwind from our color scales + semantic. */
function buildColors(tokens: DesignTokens): Record<string, Record<string, string>> {
  const colors: Record<string, Record<string, string>> = {};

  // 21 color scales
  const scaleNames = Object.keys(tokens.colors.scales) as Array<
    keyof typeof tokens.colors.scales
  >;

  for (const name of scaleNames) {
    colors[name] = { ...tokens.colors.scales[name] };
  }

  // Semantic colors — flattened as "semantic-*"
  const semanticEntries = Object.entries(tokens.colors.semantic);
  for (const [key, value] of semanticEntries) {
    if (!colors["semantic"]) {
      colors["semantic"] = {};
    }
    colors["semantic"][key] = value;
  }

  return colors;
}

/** Build the spacing mapping for Tailwind from our spacing tokens. */
function buildSpacing(tokens: DesignTokens): Record<string, string> {
  return { ...tokens.spacing };
}

/** Build the border radius mapping for Tailwind. */
function buildBorderRadius(tokens: DesignTokens): Record<string, string> {
  return { ...tokens.borders.borderRadius };
}

/** Build the boxShadow mapping for Tailwind. */
function buildBoxShadow(tokens: DesignTokens): Record<string, string> {
  return { ...tokens.shadows };
}

/** Build the opacity mapping for Tailwind. */
function buildOpacity(tokens: DesignTokens): Record<string, number> {
  return { ...tokens.opacity };
}

/** Build the fontSize mapping for Tailwind. */
function buildFontSize(
  tokens: DesignTokens,
): Record<string, [string, { lineHeight: string }]> {
  const result: Record<string, [string, { lineHeight: string }]> = {};
  const entries = Object.entries(tokens.typography.fontSize) as Array<
    [string, { value: string; lineHeight: string }]
  >;

  for (const [key, scale] of entries) {
    result[key] = [scale.value, { lineHeight: scale.lineHeight }];
  }

  return result;
}

/** Build the screens (breakpoints) mapping for Tailwind. */
function buildScreens(tokens: DesignTokens): Record<string, string> {
  return { ...tokens.breakpoints };
}

/** Build the keyframes mapping for Tailwind. */
function buildKeyframes(): Record<string, Record<string, Record<string, string>>> {
  const result: Record<string, Record<string, Record<string, string>>> = {};

  for (const [name, rawBody] of Object.entries(motionKeyframes)) {
    // Parse the keyframe body into structured format
    const frames: Record<string, Record<string, string>> = {};
    const lines = rawBody.trim().split("\n").map((l: string) => l.trim()).filter(Boolean);

    let currentSelector = "";
    const currentProps: Record<string, string> = {};

    for (const line of lines) {
      if (line.endsWith("{")) {
        // Save previous
        if (currentSelector && Object.keys(currentProps).length > 0) {
          frames[currentSelector] = { ...currentProps };
        }
        currentSelector = line.replace("{", "").trim();
        for (const k of Object.keys(currentProps)) {
          delete currentProps[k];
        }
      } else if (line.endsWith("}")) {
        if (currentSelector && Object.keys(currentProps).length > 0) {
          frames[currentSelector] = { ...currentProps };
        }
        currentSelector = "";
        for (const k of Object.keys(currentProps)) {
          delete currentProps[k];
        }
      } else if (line.includes(":")) {
        const colonIdx = line.indexOf(":");
        const prop = line.substring(0, colonIdx).trim();
        const val = line.substring(colonIdx + 1).replace(";", "").trim();
        currentProps[prop] = val;
      }
    }

    // Tailwind expects the keyframe name without our prefix when used
    result[name] = frames;
  }

  return result;
}

/** Build the animation mapping for Tailwind. */
function buildAnimation(tokens: DesignTokens): Record<string, string> {
  return { ...tokens.motion.animation };
}

/** Build the zIndex mapping for Tailwind. */
function buildZIndex(tokens: DesignTokens): Record<string, number | string> {
  return { ...tokens.zIndex };
}

/** Build the letterSpacing mapping for Tailwind. */
function buildLetterSpacing(tokens: DesignTokens): Record<string, string> {
  return { ...tokens.typography.letterSpacing };
}

/** Build the lineHeight mapping for Tailwind. */
function buildLineHeight(tokens: DesignTokens): Record<string, string> {
  return { ...tokens.typography.lineHeight };
}

/** Build the fontWeight mapping for Tailwind. */
function buildFontWeight(tokens: DesignTokens): Record<string, number> {
  return { ...tokens.typography.fontWeight };
}

/** Build the fontFamily mapping for Tailwind. */
function buildFontFamily(tokens: DesignTokens): Record<string, string> {
  return {
    sans: tokens.typography.fontFamily.sans.join(", "),
    mono: tokens.typography.fontFamily.mono.join(", "),
  };
}

/** Build the transitionTimingFunction mapping for Tailwind. */
function buildTransitionTimingFunction(
  tokens: DesignTokens,
): Record<string, string> {
  return { ...tokens.motion.easing };
}

/** Build the transitionDuration mapping for Tailwind. */
function buildTransitionDuration(tokens: DesignTokens): Record<string, string> {
  return { ...tokens.motion.duration };
}

/** Build the container maxWidth mapping for Tailwind. */
function buildContainer(tokens: DesignTokens): Record<string, string> {
  return { ...tokens.container };
}

export function generateTailwindTheme(tokens: DesignTokens): string {
  const theme = {
    colors: buildColors(tokens),
    spacing: buildSpacing(tokens),
    borderRadius: buildBorderRadius(tokens),
    boxShadow: buildBoxShadow(tokens),
    opacity: buildOpacity(tokens),
    fontSize: buildFontSize(tokens),
    screens: buildScreens(tokens),
    keyframes: buildKeyframes(),
    animation: buildAnimation(tokens),
    zIndex: buildZIndex(tokens),
    letterSpacing: buildLetterSpacing(tokens),
    lineHeight: buildLineHeight(tokens),
    fontWeight: buildFontWeight(tokens),
    fontFamily: buildFontFamily(tokens),
    transitionTimingFunction: buildTransitionTimingFunction(tokens),
    transitionDuration: buildTransitionDuration(tokens),
    container: buildContainer(tokens),
  };

  // Produce a JS module that can be spread into tailwind.config
  return `// @generated — PreOne Design Tokens Tailwind Theme
// DO NOT EDIT — regenerate via \`npm run generate\`

/** @type {import('tailwindcss').Config['theme']} */
const preoneTheme = ${JSON.stringify(theme, null, 2)};

module.exports = preoneTheme;
`;
}
