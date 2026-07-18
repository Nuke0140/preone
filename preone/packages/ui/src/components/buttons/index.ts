/**
 * @preone/ui — Buttons Barrel Export
 *
 * Re-exports all button-related components and types.
 * Import from `@preone/ui/button` for tree-shaking, or
 * from `@preone/ui` for convenience.
 */

export {
  Button,
  buttonVariants,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './button.js';

export {
  IconButton,
  iconButtonVariants,
  type IconButtonProps,
} from './icon-button.js';

export {
  SplitButton,
  type SplitButtonProps,
  type SplitButtonAction,
} from './split-button.js';

export {
  FloatingActionButton,
  fabVariants,
  type FloatingActionButtonProps,
  type FabVariant,
  type FabSize,
  type FabPosition,
} from './fab.js';
