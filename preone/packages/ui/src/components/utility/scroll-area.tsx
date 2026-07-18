/**
 * @preone/ui — ScrollArea Component
 *
 * A custom scrollable container built on @radix-ui/react-scroll-area
 * with premium scrollbar styling that matches the PreOne design language.
 *
 * Features:
 * - **Custom scrollbar**: Thin, rounded scrollbars with hover expansion
 * - **Variants**: default, minimal (thinner), overlay (appears on hover only)
 * - **Sizes**: sm, default, lg (scrollbar thickness)
 * - **forwardRef**: Full ref forwarding to the Radix Root
 * - **ARIA**: Accessible via Radix primitives
 * - **Design tokens**: All styling via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * Design Rules:
 * - Rounded corners (var(--radius-lg))
 * - Soft shadows only
 * - NO heavy borders, NO glossy, NO gradients
 * - Premium minimal scrollbar appearance
 *
 * @example
 * ```tsx
 * import { ScrollArea } from '@preone/ui';
 *
 * <ScrollArea className="h-72">
 *   <div className="p-4">
 *     {longContent.map(item => <p key={item.id}>{item.text}</p>)}
 *   </div>
 * </ScrollArea>
 *
 * <ScrollArea variant="overlay" size="sm" orientation="horizontal">
 *   <div className="flex gap-4 p-4">{items}</div>
 * </ScrollArea>
 * ```
 *
 * @module scroll-area
 */

import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/**
 * ScrollArea variant definitions.
 *
 * CSS Variable Reference:
 * - `--border` — scrollbar track colour
 * - `--muted-foreground` — scrollbar thumb colour
 * - `--primary` — scrollbar thumb hover colour
 * - `--radius-full` — scrollbar thumb border radius
 * - `--radius-lg` — ScrollArea corner radius
 * - `--duration-fast` — transition duration
 * - `--ease-default` — transition easing
 */
export const scrollAreaVariants = cva(
  [
    'relative',
    'overflow-hidden',
    'rounded-[var(--radius-lg,0.75rem)]',
  ].join(' '),
  {
    variants: {
      variant: {
        /**
         * Default — always-visible thin scrollbar with subtle track.
         */
        default: '',

        /**
         * Minimal — ultra-thin scrollbar, barely visible until hovered.
         */
        minimal: '',

        /**
         * Overlay — scrollbar appears only on hover, overlaying content.
         */
        overlay: '',
      },

      size: {
        /**
         * Small — 6px scrollbar thumb.
         */
        sm: '',

        /**
         * Default — 8px scrollbar thumb.
         */
        default: '',

        /**
         * Large — 12px scrollbar thumb.
         */
        lg: '',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/** Visual style variant for the ScrollArea component. */
export type ScrollAreaVariant = 'default' | 'minimal' | 'overlay';

/** Size variant for the ScrollArea component. */
export type ScrollAreaSize = 'sm' | 'default' | 'lg';

// ---------------------------------------------------------------------------
// Scrollbar styling
// ---------------------------------------------------------------------------

/**
 * Generates the scrollbar CSS class string based on variant and size.
 * We use a data-attribute approach to enable variant-specific styling
 * in Tailwind utility classes.
 */
const getScrollbarClasses = (variant: ScrollAreaVariant, size: ScrollAreaSize) => {
  const sizeMap: Record<ScrollAreaSize, string> = {
    sm: 'w-1.5 h-1.5',
    default: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const thumbSizeMap: Record<ScrollAreaSize, string> = {
    sm: 'w-1 h-1',
    default: 'w-1.5 h-1.5',
    lg: 'w-2.5 h-2.5',
  };

  const baseTrack = [
    'flex',
    'touch-none',
    'select-none',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
  ].join(' ');

  const baseThumb = [
    'relative',
    'flex-1',
    'rounded-full',
    'bg-[var(--muted-foreground)]/30',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'hover:bg-[var(--muted-foreground)]/50',
    'active:bg-[var(--primary)]/50',
  ].join(' ');

  const variantModifiers: Record<ScrollAreaVariant, { track: string; thumb: string }> = {
    default: {
      track: `${sizeMap[size]} ${variant === 'default' ? 'bg-[var(--border)]/20' : ''}`,
      thumb: thumbSizeMap[size],
    },
    minimal: {
      track: `${sizeMap[size]}`,
      thumb: `${thumbSizeMap[size]} bg-[var(--muted-foreground)]/15 hover:bg-[var(--muted-foreground)]/30`,
    },
    overlay: {
      track: `${sizeMap[size]}`,
      thumb: `${thumbSizeMap[size]} opacity-0 group-hover/scroll:opacity-100 group-hover/scroll:bg-[var(--muted-foreground)]/40 group-hover/scroll:hover:bg-[var(--muted-foreground)]/60`,
    },
  };

  return { track: `${baseTrack} ${variantModifiers[variant].track}`, thumb: `${baseThumb} ${variantModifiers[variant].thumb}` };
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the ScrollArea component. */
export interface ScrollAreaProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>,
    VariantProps<typeof scrollAreaVariants> {
  /** Visual variant of the scrollbar. @default 'default' */
  variant?: ScrollAreaVariant;
  /** Size of the scrollbar. @default 'default' */
  size?: ScrollAreaSize;
  /**
   * Scrollbar orientation.
   * - `'vertical'` — visible vertical scrollbar
   * - `'horizontal'` — visible horizontal scrollbar
   * - `'both'` — both scrollbars visible
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** Content rendered inside the scrollable area. */
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ScrollArea — A premium custom scroll container.
 *
 * Wraps @radix-ui/react-scroll-area with PreOne design system styling.
 * Provides thin, rounded scrollbars that match the premium minimal aesthetic.
 *
 * **Accessibility:**
 * - Keyboard scrollable via arrow keys (Radix)
 * - ARIA scroll role via Radix primitives
 * - Focus ring support
 *
 * @param props - {@link ScrollAreaProps}
 * @param ref - Forwarded ref to the Radix ScrollArea.Root element.
 * @returns The rendered ScrollArea component.
 */
export const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      orientation = 'vertical',
      children,
      ...props
    },
    ref,
  ) => {
    const scrollbarStyles = getScrollbarClasses(variant, size);

    const showVertical = orientation === 'vertical' || orientation === 'both';
    const showHorizontal = orientation === 'horizontal' || orientation === 'both';

    return (
      <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn(
          scrollAreaVariants({ variant, size }),
          'group/scroll',
          className,
        )}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
          {children}
        </ScrollAreaPrimitive.Viewport>

        {showVertical && (
          <ScrollAreaPrimitive.Scrollbar
            orientation="vertical"
            className={cn(
              scrollbarStyles.track,
              'right-0.5 top-1 bottom-1',
            )}
          >
            <ScrollAreaPrimitive.Thumb
              className={cn(scrollbarStyles.thumb)}
            />
          </ScrollAreaPrimitive.Scrollbar>
        )}

        {showHorizontal && (
          <ScrollAreaPrimitive.Scrollbar
            orientation="horizontal"
            className={cn(
              scrollbarStyles.track,
              'bottom-0.5 left-1 right-1',
            )}
          >
            <ScrollAreaPrimitive.Thumb
              className={cn(scrollbarStyles.thumb)}
            />
          </ScrollAreaPrimitive.Scrollbar>
        )}

        <ScrollAreaPrimitive.Corner className="bg-transparent" />
      </ScrollAreaPrimitive.Root>
    );
  },
);

ScrollArea.displayName = 'ScrollArea';
