/**
 * @preone/storybook — createStory Helper
 *
 * A typed factory function that reduces boilerplate when defining
 * Storybook CSF 3 stories. Instead of repeating `args`, `parameters`,
 * and `decorators` for every story, use `createStory` to build a
 * story object with sensible defaults.
 *
 * ## Motivation
 *
 * CSF 3 stories require each story to be an object with at least an `args`
 * property. When you have many stories for the same component, the
 * repetitive typing becomes error-prone. `createStory` encapsulates
 * the common pattern:
 *
 * ```tsx
 * // Without createStory — verbose:
 * export const Primary: Story = {
 *   args: { variant: 'primary', children: 'Click me' },
 *   parameters: { docs: { description: { story: 'Primary button' } } },
 * };
 *
 * // With createStory — concise:
 * export const Primary = createStory({
 *   args: { variant: 'primary', children: 'Click me' },
 *   description: 'Primary button',
 * });
 * ```
 *
 * @example
 * ```tsx
 * import type { Meta, StoryObj } from '@storybook/react';
 * import { createStory } from '@preone/storybook';
 * import { Button } from './Button';
 *
 * const meta: Meta<typeof Button> = {
 *   title: 'UI/Button',
 *   component: Button,
 * };
 * export default meta;
 *
 * type Story = StoryObj<typeof Button>;
 *
 * export const Primary = createStory<Story>({
 *   args: { variant: 'primary', children: 'Click me' },
 *   name: 'Primary Button',
 *   description: 'The default primary action button.',
 * });
 *
 * export const Destructive = createStory<Story>({
 *   args: { variant: 'destructive', children: 'Delete' },
 *   name: 'Destructive Button',
 *   description: 'Used for destructive or irreversible actions.',
 *   tags: ['destructive'],
 * });
 * ```
 */

import type { StoryObj } from '@storybook/react';

// ---------------------------------------------------------------------------
// StoryOptions
// ---------------------------------------------------------------------------

/**
 * Options for creating a new story via {@link createStory}.
 *
 * Extends the standard `StoryObj` shape with convenience fields:
 * - `name` — overrides the story's display name in the sidebar.
 * - `description` — adds a docs description for the story.
 * - `tags` — Storybook tags (e.g., `'autodocs'`, `'playground'`).
 *
 * All fields except `args` are optional.
 */
export interface StoryOptions<T> {
  /** The props / args to pass to the component in this story. */
  args: T extends StoryObj<infer A> ? (A extends Record<string, unknown> ? Partial<A> : never) : Record<string, unknown>;

  /**
   * Display name for the story in the Storybook sidebar.
   * If omitted, the export name is used (CSF default).
   */
  name?: string;

  /**
   * A short description of what this story demonstrates.
   * Displayed in the Docs tab under the story heading.
   */
  description?: string;

  /**
   * Storybook tags for categorisation and filtering.
   * Common values: `'autodocs'`, `'playground'`, `'snapshot'`.
   */
  tags?: string[];

  /**
   * Additional Storybook parameters to merge.
   * Use this for argTypes overrides, backgrounds, etc.
   */
  parameters?: Record<string, unknown>;

  /**
   * Story-level decorators.
   * Appended after global decorators.
   */
  decorators?: StoryObj['decorators'];

  /**
   * Play function for interaction testing.
   * Runs after the story renders — use for user-interaction simulations.
   */
  play?: StoryObj['play'];

  /**
   * Whether to render the story inline in the Docs page.
   * Defaults to `true` for compact, documentation-friendly layout.
   */
  inline?: boolean;
}

// ---------------------------------------------------------------------------
// createStory
// ---------------------------------------------------------------------------

/**
 * Creates a fully-typed Storybook story object with minimal boilerplate.
 *
 * This helper wraps the CSF 3 story format (`StoryObj`) and provides
 * convenience fields (`name`, `description`, `tags`) that are automatically
 * mapped to the correct locations in the story object.
 *
 * @typeParam T - The `StoryObj` type for the component (e.g., `StoryObj<typeof Button>`).
 * @param options - The story configuration options.
 * @returns A CSF 3–compatible `StoryObj` ready for export.
 *
 * @example
 * ```tsx
 * type Story = StoryObj<typeof Button>;
 *
 * export const Primary = createStory<Story>({
 *   args: { variant: 'primary', children: 'Click me' },
 *   name: 'Primary Button',
 *   description: 'The default primary action button.',
 *   tags: ['autodocs'],
 * });
 * ```
 */
export function createStory<T extends StoryObj>(
  options: StoryOptions<T>,
): T {
  const {
    args,
    name,
    description,
    tags,
    parameters: extraParams,
    decorators,
    play,
    inline = true,
  } = options;

  /** Build the parameters object with optional docs description. */
  const parameters: Record<string, unknown> = {
    ...extraParams,
    ...(description !== undefined
      ? {
          docs: {
            ...((extraParams?.['docs'] as Record<string, unknown>) ?? {}),
            description: {
              story: description,
            },
          },
        }
      : {}),
  };

  /** Build the story object. */
  const story: Record<string, unknown> = {
    args,
    ...(name !== undefined ? { name } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
    ...(decorators !== undefined ? { decorators } : {}),
    ...(play !== undefined ? { play } : {}),
  };

  /**
   * If `inline` is `true` (default), configure the story to render
   * inside the Docs page rather than as a separate iframe.
   */
  if (inline) {
    story.parameters = {
      ...(story.parameters as Record<string, unknown>),
      docs: {
        ...((story.parameters as Record<string, unknown>)?.['docs'] as Record<string, unknown>),
        inline: true,
      },
    };
  }

  return story as T;
}

/**
 * Type representing the createStory factory function.
 * Useful for type-safe re-exports or wrappers.
 */
export type CreateStoryFn = typeof createStory;
