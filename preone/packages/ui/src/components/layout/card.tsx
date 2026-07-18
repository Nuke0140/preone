/**
 * @preone/ui — Card Component
 *
 * A composable card system inspired by Metro/Fluent Design tiles.
 * Light, breathing feel with generous whitespace and soft shadows.
 *
 * Sub-components: Card, CardHeader, CardTitle, CardDescription,
 * CardContent, CardFooter.
 *
 * Variants: `default`, `elevated`, `outlined`, `ghost`.
 *
 * @example
 * ```tsx
 * <Card variant="elevated">
 *   <CardHeader>
 *     <CardTitle>Student Enrollment</CardTitle>
 *     <CardDescription>Academic year 2025-26</CardDescription>
 *   </CardHeader>
 *   <CardContent>...</CardContent>
 *   <CardFooter>...</CardFooter>
 * </Card>
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Card Variants
// ---------------------------------------------------------------------------

const cardVariants = cva(
  [
    'rounded-[var(--radius-lg)] text-[var(--card-foreground)]',
    'transition-shadow duration-[var(--duration-normal)] ease-[var(--ease-default)]',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Clean surface with subtle border — the default Metro tile. */
        default: 'bg-[var(--card)] border border-[var(--border)] shadow-[var(--shadow-sm)]',
        /** Elevated tile with prominent soft shadow. */
        elevated: 'bg-[var(--card)] shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]',
        /** Bordered tile with no shadow. */
        outlined: 'bg-[var(--card)] border border-[var(--border)]',
        /** Ghost tile — no border, no shadow, transparent bg. */
        ghost: 'bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/** Props for the {@link Card} component. */
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

/**
 * Card container — a Metro/Fluent-style tile with light, breathing feel.
 *
 * @see {@link cardVariants} for available variants.
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

// ---------------------------------------------------------------------------
// CardHeader
// ---------------------------------------------------------------------------

/** Props for the {@link CardHeader} component. */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Card header area — stacks title and description vertically with spacing.
 */
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1.5 p-6', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

// ---------------------------------------------------------------------------
// CardTitle
// ---------------------------------------------------------------------------

/** Props for the {@link CardTitle} component. */
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

/**
 * Card title — semibold heading inside a card header.
 */
const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-none tracking-[var(--tracking-tight)]',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

// ---------------------------------------------------------------------------
// CardDescription
// ---------------------------------------------------------------------------

/** Props for the {@link CardDescription} component. */
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

/**
 * Card description — muted text below the card title.
 */
const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-[var(--muted-foreground)]', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

// ---------------------------------------------------------------------------
// CardContent
// ---------------------------------------------------------------------------

/** Props for the {@link CardContent} component. */
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Card content area — padded region for the main card body.
 */
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

// ---------------------------------------------------------------------------
// CardFooter
// ---------------------------------------------------------------------------

/** Props for the {@link CardFooter} component. */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Card footer — right-aligned action area at the bottom of a card.
 */
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
