/**
 * @preone/storybook — Shared Storybook 8 Configuration for PreOne
 *
 * Re-exports all decorators, helpers, and utilities for building
 * consistent, token-driven Storybook stories across the PreOne ecosystem.
 */

// ─── Decorators ─────────────────────────────────────────────────────────────

export {
  withDesignTokens,
  type BrandOverrides,
} from './decorators/with-design-tokens';

export {
  withTheme,
  themeBackgrounds,
  themeForegrounds,
  type PreOneTheme,
} from './decorators/with-theme';

export { withCenter } from './decorators/with-center';

export { withResponsive } from './decorators/with-responsive';

// ─── Helpers ────────────────────────────────────────────────────────────────

export {
  createStory,
  storyFactory,
} from './helpers/create-story';

export {
  createMeta,
  type CreateMetaOptions,
  type PreOneParameters,
} from './helpers/create-meta';
