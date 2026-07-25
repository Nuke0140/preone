/**
 * createMeta — Type-safe Meta Factory for Storybook 8
 *
 * Creates a typed Meta object with standard PreOne argTypes and parameters.
 * Automatically generates control types based on the component's prop types.
 */

import type { Meta } from '@storybook/react';
import type { ComponentType } from 'react';

/** Standard PreOne Storybook parameters */
interface PreOneParameters {
  /** Layout mode for the story canvas */
  layout?: 'centered' | 'fullscreen' | 'padded';
  /** Docs configuration */
  docs?: {
    /** Auto-generate docs page */
    autodocs?: boolean;
    /** Description for the component */
    description?: string;
  };
  /** Status of the component */
  status?: {
    type: 'stable' | 'experimental' | 'deprecated';
  };
}

/** Options for createMeta */
interface CreateMetaOptions {
  /** The React component */
  component: ComponentType<Record<string, unknown>>;
  /** Title for the story group (e.g., "Components/Button") */
  title?: string;
  /** Component description */
  description?: string;
  /** Tags for the story (e.g., ["autodocs"]) */
  tags?: string[];
  /** Default args */
  args?: Record<string, unknown>;
  /** ArgTypes override */
  argTypes?: Record<string, unknown>;
  /** Parameters */
  parameters?: PreOneParameters;
  /** Exclude specific props from controls */
  excludeArgs?: string[];
}

/**
 * Create a typed Meta object with PreOne defaults.
 *
 * - Sets `tags` to `["autodocs"]` by default
 * - Configures standard controls
 * - Merges custom argTypes
 * - Applies standard PreOne parameters
 */
export function createMeta(options: CreateMetaOptions): Meta {
  const {
    component,
    title,
    description,
    tags = ['autodocs'],
    args,
    argTypes,
    parameters,
    excludeArgs,
  } = options;

  // Build the exclude set for argTypes
  const excludeSet = new Set(excludeArgs ?? []);

  // Filter argTypes to exclude specified props
  const filteredArgTypes: Record<string, unknown> = {};
  if (argTypes) {
    for (const [key, value] of Object.entries(argTypes)) {
      if (!excludeSet.has(key)) {
        filteredArgTypes[key] = value;
      }
    }
  }

  const meta: Meta = {
    component,
    tags,
    ...(title ? { title } : {}),
    ...(args ? { args } : {}),
    ...(Object.keys(filteredArgTypes).length > 0
      ? { argTypes: filteredArgTypes as Meta['argTypes'] }
      : {}),
    parameters: {
      layout: parameters?.layout ?? 'padded',
      docs: {
        ...(parameters?.docs ?? {}),
        description: {
          component: parameters?.docs?.description ?? description,
        },
      },
      ...(parameters?.status
        ? {
            status: {
              type: parameters.status.type,
            },
          }
        : {}),
    },
  };

  return meta;
}

export type { CreateMetaOptions, PreOneParameters };
