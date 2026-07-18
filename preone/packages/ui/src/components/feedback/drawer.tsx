/**
 * @preone/ui — Drawer Component
 *
 * A side drawer using @radix-ui/react-dialog for accessible slide-in panels.
 * Supports four sides: left, right, top, bottom.
 *
 * Features:
 * - **@radix-ui/react-dialog**: Full accessibility with focus trapping and scroll lock
 * - **Sub-components**: Drawer, DrawerTrigger, DrawerContent, DrawerHeader,
 *   DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose
 * - **Side**: left, right, top, bottom
 * - **Overlay animation**: Smooth slide-in with backdrop blur
 * - **forwardRef**: Full ref forwarding on all sub-components
 * - **ARIA**: Complete accessibility via Radix primitives
 * - **Design tokens**: All colours and spacing via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import {
 *   Drawer, DrawerTrigger, DrawerContent,
 *   DrawerHeader, DrawerTitle, DrawerDescription,
 *   DrawerFooter, DrawerClose,
 * } from '@preone/ui/feedback';
 *
 * <Drawer>
 *   <DrawerTrigger asChild>
 *     <Button>Open Drawer</Button>
 *   </DrawerTrigger>
 *   <DrawerContent side="right">
 *     <DrawerHeader>
 *       <DrawerTitle>Settings</DrawerTitle>
 *       <DrawerDescription>Manage your preferences.</DrawerDescription>
 *     </DrawerHeader>
 *     <DrawerFooter>
 *       <DrawerClose asChild>
 *         <Button variant="outline">Cancel</Button>
 *       </DrawerClose>
 *       <Button>Save</Button>
 *     </DrawerFooter>
 *   </DrawerContent>
 * </Drawer>
 * ```
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Side Variants
// ---------------------------------------------------------------------------

/** Side from which the drawer slides in. */
export type DrawerSide = 'left' | 'right' | 'top' | 'bottom';

/**
 * DrawerContent side definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-card` / `--color-card-foreground` — drawer surface
 * - `--color-border` — border colour
 * - `--radius-lg` — drawer radius
 * - `--shadow-lg` — elevation shadow
 */
export const drawerContentVariants = cva(
  [
    'fixed z-50',
    'border border-[var(--color-border)]',
    'bg-[var(--color-card)] text-[var(--color-card-foreground)]',
    'shadow-[var(--shadow-lg)]',
    'flex flex-col',
    // Transitions
    'duration-[var(--duration-normal,300ms)]',
  ].join(' '),
  {
    variants: {
      side: {
        /** Left drawer — slides in from the left edge. */
        left: [
          'inset-y-0 left-0 h-full w-[400px] max-w-[85vw]',
          'rounded-r-[var(--radius-lg)]',
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-left',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left',
        ].join(' '),

        /** Right drawer — slides in from the right edge. */
        right: [
          'inset-y-0 right-0 h-full w-[400px] max-w-[85vw]',
          'rounded-l-[var(--radius-lg)]',
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
        ].join(' '),

        /** Top drawer — slides in from the top edge. */
        top: [
          'inset-x-0 top-0 w-full h-auto max-h-[85vh]',
          'rounded-b-[var(--radius-lg)]',
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-top',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top',
        ].join(' '),

        /** Bottom drawer — slides in from the bottom edge. */
        bottom: [
          'inset-x-0 bottom-0 w-full h-auto max-h-[85vh]',
          'rounded-t-[var(--radius-lg)]',
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
        ].join(' '),
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
);

// ---------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Drawer} component.
 *
 * Extends Radix Dialog root props.
 */
export interface DrawerProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {}

/**
 * PreOne Drawer — the root container that manages open/close state.
 *
 * @param props - Radix Dialog root props.
 */
export const Drawer = DialogPrimitive.Root;

// ---------------------------------------------------------------------------
// DrawerTrigger
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DrawerTrigger} component.
 */
export interface DrawerTriggerProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> {}

/**
 * PreOne DrawerTrigger — the element that opens the drawer.
 */
export const DrawerTrigger = DialogPrimitive.Trigger;

// ---------------------------------------------------------------------------
// DrawerPortal
// ---------------------------------------------------------------------------

/** Internal portal. */
const DrawerPortal = DialogPrimitive.Portal;

// ---------------------------------------------------------------------------
// DrawerOverlay
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DrawerOverlay} component.
 */
export interface DrawerOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {}

/**
 * PreOne DrawerOverlay — the semi-transparent backdrop behind the drawer.
 *
 * @param props - Radix DialogOverlay props.
 * @param ref - Forwarded ref.
 */
export const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  DrawerOverlayProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50',
      'bg-black/40 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = 'DrawerOverlay';

// ---------------------------------------------------------------------------
// DrawerContent
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DrawerContent} component.
 */
export interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof drawerContentVariants> {}

/**
 * PreOne DrawerContent — the main content area of the drawer.
 *
 * Includes the overlay and close button.
 *
 * @param props - All DrawerContentProps plus Radix DialogContent props.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 */
export const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DrawerContentProps
>(({ className, side, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(drawerContentVariants({ side }), 'p-6 gap-4', className)}
      {...props}
    >
      {/* Close button */}
      <DialogPrimitive.Close
        className={cn(
          'absolute right-4 top-4',
          'inline-flex items-center justify-center',
          'h-7 w-7 rounded-[var(--radius-md)]',
          'text-[var(--color-muted-foreground)]',
          'hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        )}
        aria-label="Close"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </DialogPrimitive.Close>
      {children}
    </DialogPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = 'DrawerContent';

// ---------------------------------------------------------------------------
// DrawerHeader
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DrawerHeader} component.
 */
export interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * PreOne DrawerHeader — stacks title and description vertically.
 *
 * @param props - Standard `<div>` HTML attributes.
 * @param ref - Forwarded ref.
 */
export const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  ),
);
DrawerHeader.displayName = 'DrawerHeader';

// ---------------------------------------------------------------------------
// DrawerTitle
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DrawerTitle} component.
 */
export interface DrawerTitleProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {}

/**
 * PreOne DrawerTitle — the drawer heading.
 *
 * @param props - Radix DialogTitle props.
 * @param ref - Forwarded ref.
 */
export const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  DrawerTitleProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-[var(--tracking-tight,-0.01em)]',
      'text-[var(--color-foreground)]',
      className,
    )}
    {...props}
  />
));
DrawerTitle.displayName = 'DrawerTitle';

// ---------------------------------------------------------------------------
// DrawerDescription
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DrawerDescription} component.
 */
export interface DrawerDescriptionProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> {}

/**
 * PreOne DrawerDescription — muted description below the title.
 *
 * @param props - Radix DialogDescription props.
 * @param ref - Forwarded ref.
 */
export const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  DrawerDescriptionProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-[var(--color-muted-foreground)]', className)}
    {...props}
  />
));
DrawerDescription.displayName = 'DrawerDescription';

// ---------------------------------------------------------------------------
// DrawerFooter
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DrawerFooter} component.
 */
export interface DrawerFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * PreOne DrawerFooter — action area at the bottom of the drawer.
 *
 * @param props - Standard `<div>` HTML attributes.
 * @param ref - Forwarded ref.
 */
export const DrawerFooter = React.forwardRef<HTMLDivElement, DrawerFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mt-auto pt-4',
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3',
        className,
      )}
      {...props}
    />
  ),
);
DrawerFooter.displayName = 'DrawerFooter';

// ---------------------------------------------------------------------------
// DrawerClose
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DrawerClose} component.
 */
export interface DrawerCloseProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close> {}

/**
 * PreOne DrawerClose — a button that closes the drawer.
 */
export const DrawerClose = DialogPrimitive.Close;
