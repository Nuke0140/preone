/**
 * @preone/ui — Utility Components
 *
 * Barrel export for all utility components.
 *
 * Utility components provide cross-cutting UI functionality:
 * - ScrollArea: Custom scrollable container
 * - ResizablePanel: Resizable panel layout system
 * - ClipboardButton: Copy-to-clipboard button
 * - ThemeToggle: Light/dark mode toggle
 * - LanguageSwitcher: Language selection dropdown
 * - PermissionWrapper: Permission-based conditional rendering
 */

export {
  ScrollArea,
  scrollAreaVariants,
  type ScrollAreaProps,
  type ScrollAreaVariant,
  type ScrollAreaSize,
} from './scroll-area.js';

export {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  resizablePanelGroupVariants,
  resizableHandleVariants,
  type ResizablePanelGroupProps,
  type ResizablePanelProps,
  type ResizableHandleProps,
  type ResizableDirection,
} from './resizable-panel.js';

export {
  ClipboardButton,
  clipboardButtonVariants,
  type ClipboardButtonProps,
  type ClipboardButtonVariant,
  type ClipboardButtonSize,
} from './clipboard-button.js';

export {
  ThemeToggle,
  themeToggleVariants,
  type ThemeToggleProps,
  type ThemeToggleVariant,
  type ThemeToggleSize,
} from './theme-toggle.js';

export {
  LanguageSwitcher,
  languageSwitcherVariants,
  type LanguageSwitcherProps,
  type LanguageSwitcherVariant,
  type LanguageSwitcherSize,
  type LanguageOption,
} from './language-switcher.js';

export {
  PermissionWrapper,
  type PermissionWrapperProps,
} from './permission-wrapper.js';
