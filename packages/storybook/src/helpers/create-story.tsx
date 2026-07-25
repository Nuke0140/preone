/**
 * createStory — Type-safe Story Factory for Storybook 8
 *
 * Creates a typed story from a component's Meta, automatically
 * setting up common args and providing full type safety.
 */

import type { StoryObj } from '@storybook/react';

/**
 * Create a typed story with args.
 *
 * Usage:
 * ```tsx
 * type Story = StoryObj<typeof Button>;
 * export const Primary: Story = { args: { variant: "primary" } };
 * ```
 */
export function createStory<T>(args: T): StoryObj<{ args: T }> {
  return { args } as StoryObj<{ args: T }>;
}

/**
 * Create a typed story factory function bound to a specific set of args.
 *
 * Usage:
 * ```tsx
 * const story = storyFactory<ButtonArgs>;
 * export const Primary = story({ variant: "primary" });
 * ```
 */
export function storyFactory<T>(): (args: T) => StoryObj<{ args: T }> {
  return (args) => createStory(args);
}
