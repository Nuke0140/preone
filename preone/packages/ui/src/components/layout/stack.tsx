/**
 * @preone/ui — Stack Component
 *
 * Flex stack: vertical or horizontal, with gap, align, justify, wrap.
 * Includes HStack and VStack convenience components.
 *
 * @example
 * ```tsx
 * <VStack gap="md" align="center">
 *   <Card>...</Card>
 *   <Card>...</Card>
 * </VStack>
 *
 * <HStack gap="sm" justify="between">
 *   <Button>Cancel</Button>
 *   <Button>Save</Button>
 * </HStack>
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Stack Variants
// ---------------------------------------------------------------------------

const stackVariants = cva('flex', {
  variants: {
    direction: {
      horizontal: 'flex-row',
      vertical: 'flex-col',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
      '2xl': 'gap-12',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    wrap: {
      true: 'flex-wrap',
      false: 'flex-nowrap',
    },
  },
  defaultVariants: {
    direction: 'vertical',
    gap: 'md',
    align: 'stretch',
    justify: 'start',
    wrap: false,
  },
});

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------

/** Props for the {@link Stack} component. */
export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {}

/**
 * Flex stack — a flexible layout primitive supporting both vertical
 * and horizontal directions with gap, alignment, and wrapping.
 */
const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, direction, gap, align, justify, wrap, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(stackVariants({ direction, gap, align, justify, wrap }), className)}
      {...props}
    />
  )
);
Stack.displayName = 'Stack';

// ---------------------------------------------------------------------------
// VStack
// ---------------------------------------------------------------------------

/** Props for the {@link VStack} component. */
export interface VStackProps extends Omit<StackProps, 'direction'> {}

/**
 * Vertical stack — a convenience wrapper around Stack with `direction="vertical"`.
 */
const VStack = React.forwardRef<HTMLDivElement, VStackProps>(
  ({ className, ...props }, ref) => (
    <Stack ref={ref} direction="vertical" className={className} {...props} />
  )
);
VStack.displayName = 'VStack';

// ---------------------------------------------------------------------------
// HStack
// ---------------------------------------------------------------------------

/** Props for the {@link HStack} component. */
export interface HStackProps extends Omit<StackProps, 'direction'> {}

/**
 * Horizontal stack — a convenience wrapper around Stack with `direction="horizontal"`.
 */
const HStack = React.forwardRef<HTMLDivElement, HStackProps>(
  ({ className, ...props }, ref) => (
    <Stack ref={ref} direction="horizontal" className={className} {...props} />
  )
);
HStack.displayName = 'HStack';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Stack, VStack, HStack, stackVariants };
