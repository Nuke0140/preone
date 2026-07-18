/**
 * @preone/ui — Container Component
 *
 * Max-width container with responsive padding.
 * Sizes: sm, md, lg, xl, full.
 *
 * @example
 * ```tsx
 * <Container size="lg">
 *   <PageHeader title="Dashboard" />
 * </Container>
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Container Variants
// ---------------------------------------------------------------------------

const containerVariants = cva(
  'mx-auto w-full px-4 sm:px-6 lg:px-8',
  {
    variants: {
      size: {
        /** Small container — 640px max. */
        sm: 'max-w-screen-sm',
        /** Medium container — 768px max. */
        md: 'max-w-screen-md',
        /** Large container — 1024px max. */
        lg: 'max-w-screen-lg',
        /** Extra-large container — 1280px max. */
        xl: 'max-w-screen-xl',
        /** Full-width container — no max width. */
        full: 'max-w-none',
      },
    },
    defaultVariants: {
      size: 'xl',
    },
  }
);

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

/** Props for the {@link Container} component. */
export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

/**
 * Max-width container with responsive padding.
 *
 * Centers content horizontally and applies responsive horizontal
 * padding that increases at larger breakpoints.
 */
const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(containerVariants({ size }), className)}
      {...props}
    />
  )
);
Container.displayName = 'Container';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Container, containerVariants };
