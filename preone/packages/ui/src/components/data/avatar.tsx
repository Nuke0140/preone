/**
 * @preone/ui — Avatar Component
 *
 * A composable avatar system using @radix-ui/react-avatar.
 * Supports images, fallback text, status indicators, and group display.
 *
 * Features:
 * - **@radix-ui/react-avatar**: Accessible image/fallback handling
 * - **Sizes**: xs, sm, default, lg, xl
 * - **Status indicator**: online, offline, away, busy
 * - **AvatarGroup**: Overlapping group display with `+N` overflow
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: Complete accessibility via Radix primitives
 * - **Design tokens**: All colours and sizing via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from '@preone/ui/data';
 *
 * <Avatar size="lg" status="online">
 *   <AvatarImage src="/user.jpg" alt="Jane Doe" />
 *   <AvatarFallback>JD</AvatarFallback>
 * </Avatar>
 *
 * <AvatarGroup max={3}>
 *   <Avatar size="sm"><AvatarFallback>A</AvatarFallback></Avatar>
 *   <Avatar size="sm"><AvatarFallback>B</AvatarFallback></Avatar>
 *   <Avatar size="sm"><AvatarFallback>C</AvatarFallback></Avatar>
 *   <Avatar size="sm"><AvatarFallback>D</AvatarFallback></Avatar>
 * </AvatarGroup>
 * ```
 */

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Avatar Variants
// ---------------------------------------------------------------------------

/** Size variant for the Avatar component. */
export type AvatarSize = 'xs' | 'sm' | 'default' | 'lg' | 'xl';

/** Status indicator variant for the Avatar component. */
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

/**
 * Avatar size definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-muted` — fallback background
 * - `--color-muted-foreground` — fallback text
 * - `--radius-full` — circular shape
 */
export const avatarVariants = cva(
  [
    'relative inline-flex shrink-0 overflow-hidden',
    'rounded-[var(--radius-full)]',
  ].join(' '),
  {
    variants: {
      size: {
        /** Extra-small — 24×24px. */
        xs: 'h-6 w-6 text-[10px]',
        /** Small — 32×32px. */
        sm: 'h-8 w-8 text-xs',
        /** Default — 40×40px. */
        default: 'h-10 w-10 text-sm',
        /** Large — 48×48px. */
        lg: 'h-12 w-12 text-base',
        /** Extra-large — 64×64px. */
        xl: 'h-16 w-16 text-lg',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Status indicator
// ---------------------------------------------------------------------------

/** Maps status to colour classes. */
const statusColorMap: Record<AvatarStatus, string> = {
  online: 'bg-[var(--color-success)]',
  offline: 'bg-[var(--color-muted-foreground)]',
  away: 'bg-[var(--color-warning)]',
  busy: 'bg-[var(--color-destructive)]',
};

/** Maps avatar size to status dot size/position classes. */
const statusSizeMap: Record<AvatarSize, string> = {
  xs: 'h-1.5 w-1.5 border-[1.5px] bottom-0 right-0',
  sm: 'h-2 w-2 border-2 bottom-0 right-0',
  default: 'h-2.5 w-2.5 border-2 bottom-0.5 right-0.5',
  lg: 'h-3 w-3 border-2 bottom-0.5 right-0.5',
  xl: 'h-3.5 w-3.5 border-2 bottom-1 right-1',
};

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Avatar} component.
 *
 * Extends Radix Avatar root props with PreOne size and status variants.
 */
export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  /**
   * Status indicator displayed at the bottom-right corner of the avatar.
   * When `undefined`, no indicator is shown.
   */
  status?: AvatarStatus;
}

/**
 * PreOne Avatar — an image representation with fallback and status indicator.
 *
 * **Accessibility:**
 * - Built on @radix-ui/react-avatar for proper ARIA image/fallback handling
 * - Status dot is `aria-hidden="true"` (decorative)
 *
 * @param props - All AvatarProps plus Radix Avatar root props.
 * @param ref - Forwarded ref to the underlying `<span>` element.
 *
 * @example
 * ```tsx
 * <Avatar size="lg" status="online">
 *   <AvatarImage src="/photo.jpg" alt="User" />
 *   <AvatarFallback>JD</AvatarFallback>
 * </Avatar>
 * ```
 */
export const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, status, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size }), className)}
    {...props}
  >
    {props.children}
    {status && (
      <span
        className={cn(
          'absolute z-10 rounded-[var(--radius-full)] border-[var(--color-background)]',
          statusColorMap[status],
          statusSizeMap[(size as AvatarSize) || 'default'],
        )}
        aria-hidden="true"
      />
    )}
  </AvatarPrimitive.Root>
));
Avatar.displayName = 'Avatar';

// ---------------------------------------------------------------------------
// AvatarImage
// ---------------------------------------------------------------------------

/**
 * Props for the {@link AvatarImage} component.
 *
 * Extends Radix AvatarImage props.
 */
export interface AvatarImageProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {}

/**
 * PreOne AvatarImage — the image element within an Avatar.
 *
 * Falls back to `AvatarFallback` when the image fails to load.
 *
 * @param props - Radix AvatarImage props.
 * @param ref - Forwarded ref to the underlying `<img>` element.
 */
export const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

// ---------------------------------------------------------------------------
// AvatarFallback
// ---------------------------------------------------------------------------

/**
 * Props for the {@link AvatarFallback} component.
 *
 * Extends Radix AvatarFallback props.
 */
export interface AvatarFallbackProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {}

/**
 * PreOne AvatarFallback — text displayed when the image is unavailable.
 *
 * Typically shows initials or a generic user icon.
 *
 * @param props - Radix AvatarFallback props.
 * @param ref - Forwarded ref to the underlying `<span>` element.
 */
export const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center',
      'rounded-[var(--radius-full)]',
      'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
      'font-medium',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// ---------------------------------------------------------------------------
// AvatarGroup
// ---------------------------------------------------------------------------

/**
 * Props for the {@link AvatarGroup} component.
 *
 * Wraps multiple Avatars with an overlapping layout.
 */
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum number of avatars to display before showing the `+N` overflow.
   * When `undefined`, all avatars are shown.
   */
  max?: number;
}

/**
 * PreOne AvatarGroup — overlapping avatar display with overflow count.
 *
 * Renders children (Avatars) in an overlapping row. When `max` is set,
 * excess avatars are hidden and a `+N` badge is shown.
 *
 * @param props - All AvatarGroupProps plus standard div HTML attributes.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 *
 * @example
 * ```tsx
 * <AvatarGroup max={3}>
 *   <Avatar size="sm"><AvatarFallback>A</AvatarFallback></Avatar>
 *   <Avatar size="sm"><AvatarFallback>B</AvatarFallback></Avatar>
 *   <Avatar size="sm"><AvatarFallback>C</AvatarFallback></Avatar>
 *   <Avatar size="sm"><AvatarFallback>D</AvatarFallback></Avatar>
 * </AvatarGroup>
 * // Renders: A B C +1
 * ```
 */
export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max, children, ...props }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleChildren = max != null ? childArray.slice(0, max) : childArray;
    const overflowCount = max != null ? Math.max(childArray.length - max, 0) : 0;

    return (
      <div
        ref={ref}
        className={cn('flex items-center -space-x-3', className)}
        role="group"
        aria-label="Group of avatars"
        {...props}
      >
        {visibleChildren.map((child, index) => (
          <div
            key={index}
            className="relative ring-2 ring-[var(--color-background)] rounded-[var(--radius-full)]"
            style={{ zIndex: visibleChildren.length - index }}
          >
            {child}
          </div>
        ))}
        {overflowCount > 0 && (
          <div
            className={cn(
              'relative z-0',
              'flex items-center justify-center',
              'h-8 w-8 rounded-[var(--radius-full)]',
              'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
              'text-xs font-medium',
              'ring-2 ring-[var(--color-background)]',
            )}
            aria-label={`${overflowCount} more`}
          >
            +{overflowCount}
          </div>
        )}
      </div>
    );
  },
);
AvatarGroup.displayName = 'AvatarGroup';
