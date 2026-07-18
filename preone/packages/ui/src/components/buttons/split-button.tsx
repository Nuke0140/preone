/**
 * @preone/ui — SplitButton Component
 *
 * A composite button that combines a primary action button with a
 * dropdown menu for secondary actions. Inspired by Microsoft's
 * SplitButton pattern from Fluent Design.
 *
 * Features:
 * - **Primary action**: Click the main button to trigger the primary action
 * - **Dropdown**: Click the chevron to reveal secondary action options
 * - **Variants**: Inherits Button variants for visual consistency
 * - **Sizes**: Inherits Button sizes
 * - **forwardRef**: Full ref forwarding on the primary button
 * - **ARIA**: Complete keyboard navigation and screen reader support
 * - **Design tokens**: All styling via CSS custom properties
 *
 * @example
 * ```tsx
 * import { SplitButton } from '@preone/ui';
 *
 * <SplitButton
 *   label="Save"
 *   onClick={() => handleSave()}
 *   actions={[
 *     { label: 'Save as Draft', onClick: () => handleSaveDraft() },
 *     { label: 'Save as Template', onClick: () => handleSaveTemplate() },
 *   ]}
 * />
 * ```
 */

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { Button, buttonVariants, type ButtonVariant, type ButtonSize } from './button.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single action item within the SplitButton dropdown.
 */
export interface SplitButtonAction {
  /** Display label for the action. */
  label: string;

  /** Click handler for the action. */
  onClick: () => void;

  /**
   * Optional icon to display beside the label.
   * Must be a Lucide icon component.
   */
  icon?: React.ComponentType<{ size?: number; className?: string }>;

  /**
   * Whether this action is destructive (styled with danger colour).
   * @default false
   */
  destructive?: boolean;

  /** Whether this action is currently disabled. */
  disabled?: boolean;
}

/**
 * Props for the SplitButton component.
 */
export interface SplitButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /**
   * The label displayed on the primary action button.
   */
  label: ReactNode;

  /**
   * Click handler for the primary action.
   * Fired when the user clicks the main button area.
   */
  onClick: () => void;

  /**
   * Secondary actions displayed in the dropdown menu.
   * Must contain at least one action.
   */
  actions: SplitButtonAction[];

  /**
   * Visual style variant for the button.
   * Applies to both the primary button and the dropdown trigger.
   *
   * @default 'default'
   */
  variant?: ButtonVariant;

  /**
   * Size of the button.
   * Applies to both the primary button and the dropdown trigger.
   *
   * @default 'default'
   */
  size?: ButtonSize;

  /**
   * When `true`, the primary action shows a loading spinner.
   *
   * @default false
   */
  loading?: boolean;

  /**
   * Whether the primary action is disabled.
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * Alignment of the dropdown menu relative to the trigger.
   *
   * @default 'end'
   */
  menuAlign?: 'start' | 'center' | 'end';

  /**
   * Side of the trigger the dropdown menu appears on.
   *
   * @default 'bottom'
   */
  menuSide?: 'top' | 'right' | 'bottom' | 'left';

  /**
   * Accessible label for the dropdown trigger button.
   * Screen readers announce this to indicate the dropdown's purpose.
   *
   * @default 'More actions'
   */
  dropdownLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne SplitButton — a primary action combined with a dropdown.
 *
 * The component renders as a visually joined pair of buttons:
 * 1. **Primary button**: Shows the `label` and fires `onClick`
 * 2. **Dropdown trigger**: Shows a chevron icon, opens a dropdown with `actions`
 *
 * **Accessibility:**
 * - The primary button has standard button semantics
 * - The dropdown trigger has `aria-haspopup` and `aria-expanded`
 * - Dropdown items are navigable via keyboard (arrow keys, Enter, Escape)
 * - `aria-label` on the dropdown trigger provides context
 *
 * @param props - All SplitButtonProps.
 * @param ref - Forwarded ref to the primary button element.
 *
 * @example
 * ```tsx
 * <SplitButton
 *   label="Save"
 *   onClick={() => save()}
 *   actions={[
 *     { label: 'Save as Draft', onClick: () => saveDraft() },
 *     { label: 'Save as Template', onClick: () => saveTemplate() },
 *   ]}
 * />
 *
 * // Destructive variant
 * <SplitButton
 *   label="Delete"
 *   variant="destructive"
 *   onClick={() => deleteItem()}
 *   actions={[
 *     { label: 'Delete permanently', onClick: () => permanentDelete(), destructive: true },
 *   ]}
 * />
 * ```
 */
export const SplitButton = forwardRef<HTMLButtonElement, SplitButtonProps>(
  (
    {
      className,
      label,
      onClick,
      actions,
      variant = 'default',
      size = 'default',
      loading = false,
      disabled = false,
      menuAlign = 'end',
      menuSide = 'bottom',
      dropdownLabel = 'More actions',
      ...props
    },
    ref,
  ) => {
    return (
      <div className={cn('inline-flex', className)} role="group">
        {/* ── Primary Action Button ────────────────────────────────── */}
        <Button
          ref={ref}
          variant={variant}
          size={size}
          loading={loading}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            buttonVariants({ variant, size }),
            'rounded-r-none border-r-0',
          )}
          {...props}
        >
          {label}
        </Button>

        {/* ── Dropdown Trigger ─────────────────────────────────────── */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              variant={variant}
              size={size}
              disabled={disabled}
              className={cn(
                buttonVariants({ variant, size }),
                'rounded-l-none px-2',
                'border-l border-[var(--primary)]/20',
              )}
              aria-label={dropdownLabel}
              aria-haspopup="menu"
            >
              <ChevronDown size={16} aria-hidden="true" />
            </Button>
          </DropdownMenu.Trigger>

          {/* ── Dropdown Content ────────────────────────────────────── */}
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align={menuAlign}
              side={menuSide}
              sideOffset={4}
              className={cn(
                'z-50 min-w-[180px] overflow-hidden',
                'rounded-[var(--radius-lg)]',
                'bg-[var(--popover)] text-[var(--popover-foreground)]',
                'border border-[var(--border)]',
                'shadow-[var(--shadow-lg)]',
                'p-1',
                'animate-in fade-in-0 zoom-in-95',
                'data-[side=bottom]:slide-in-from-top-2',
                'data-[side=top]:slide-in-from-bottom-2',
                'data-[side=left]:slide-in-from-right-2',
                'data-[side=right]:slide-in-from-left-2',
              )}
            >
              {actions.map((action, index) => (
                <DropdownMenu.Item
                  key={index}
                  className={cn(
                    'relative flex items-center gap-2',
                    'rounded-[var(--radius-md)] px-3 py-2',
                    'text-[var(--text-sm)]',
                    'cursor-pointer select-none',
                    'outline-none',
                    'transition-colors',
                    'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
                    'focus:bg-[var(--accent)] focus:text-[var(--accent-foreground)]',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    action.destructive && 'text-[var(--destructive)]',
                    action.destructive && 'hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]',
                    action.destructive && 'focus:bg-[var(--destructive)]/10 focus:text-[var(--destructive)]',
                  )}
                  disabled={action.disabled}
                  onSelect={action.onClick}
                >
                  {action.icon && (
                    <action.icon size={16} className="shrink-0" aria-hidden="true" />
                  )}
                  {action.label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    );
  },
);

SplitButton.displayName = 'SplitButton';
