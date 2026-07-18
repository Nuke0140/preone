/**
 * @preone/ui — Divider Component
 *
 * Horizontal/vertical divider using @radix-ui/react-separator.
 *
 * @example
 * ```tsx
 * <Divider orientation="horizontal" />
 * <Divider orientation="vertical" decorative />
 * ```
 */

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

/** Props for the {@link Divider} component. */
export interface DividerProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  /** Whether to add vertical margin for horizontal dividers. */
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

const spacingClasses = {
  none: '',
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-6',
};

/**
 * Divider — horizontal or vertical separator using Radix UI.
 *
 * Follows WAI-ARIA separator pattern with proper `role` and `aria-orientation`.
 */
const Divider = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  DividerProps
>(({ className, orientation = 'horizontal', decorative = true, spacing = 'md', ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-[var(--border)]',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      orientation === 'horizontal' && spacingClasses[spacing],
      className
    )}
    {...props}
  />
));
Divider.displayName = 'Divider';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Divider };
