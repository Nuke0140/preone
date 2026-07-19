/**
 * Changeset configuration for PreOne monorepo versioning.
 *
 * @example
 * ```ts
 * import { changesetConfig } from '@preone/config/changesets';
 * // Use as .changeset/config.json content
 * ```
 */

/** Options for customizing the Changeset configuration. */
export interface ChangesetConfigOptions {
  /** Access level for npm packages. Default: "restricted" */
  access?: 'public' | 'restricted';
  /** Base branch for changesets. Default: "main" */
  baseBranch?: string;
  /** Whether to update internal dependencies during versioning. Default: true */
  updateInternalDependencies?: boolean;
  /** Version preset to use. Default: "independent" */
  versionPreset?: 'independent' | 'fixed';
  /** Prefix for commit messages. Default: "chore:" */
  commitPrefix?: string;
  /** Title for changelogs. */
  changelogTitle?: string;
}

/** A changelog entry — either a package name or a config tuple. */
export type ChangelogEntry = string | [string, Record<string, string>];

/** The full Changeset configuration object. */
export interface ChangesetConfig {
  $schema: string;
  changelog: ChangelogEntry[];
  commit: boolean;
  fixed: string[];
  linked: string[];
  access: 'public' | 'restricted';
  baseBranch: string;
  updateInternalDependencies: 'patch' | 'minor' | false;
  ignore: string[];
  commitPrefix?: string;
  ___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH: {
    updateInternalDependencies: 'patch' | 'minor';
    onlyUpdatePeerDependentsWhenOutOfRange: boolean;
  };
}

/** The shared Changeset configuration object. */
export const changesetConfig: ChangesetConfig = {
  $schema: 'https://unpkg.com/@changesets/config@3.1.1/schema.json',
  changelog: [
    '@changesets/changelog-github',
    { repo: 'preone/preone' },
  ] as ChangelogEntry[],
  commit: true,
  fixed: [],
  linked: [],
  access: 'restricted',
  baseBranch: 'main',
  updateInternalDependencies: 'patch',
  ignore: [],
  ___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH: {
    updateInternalDependencies: 'patch',
    onlyUpdatePeerDependentsWhenOutOfRange: false,
  },
};

/**
 * Create a customized Changeset configuration by merging overrides
 * into the shared base config.
 *
 * @example
 * ```ts
 * import { createChangesetConfig } from '@preone/config/changesets';
 * const config = createChangesetConfig({ access: 'public' });
 * ```
 */
export function createChangesetConfig(
  options: ChangesetConfigOptions = {},
): ChangesetConfig {
  const {
    access = 'restricted',
    baseBranch = 'main',
    updateInternalDependencies = true,
    commitPrefix,
  } = options;

  const config: ChangesetConfig = {
    ...changesetConfig,
    access,
    baseBranch,
    updateInternalDependencies: updateInternalDependencies ? 'patch' : false,
  };

  // Store commitPrefix as a custom field that tooling can read
  if (commitPrefix) {
    config.commitPrefix = commitPrefix;
  }

  return config;
}
