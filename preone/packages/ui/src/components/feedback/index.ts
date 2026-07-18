/**
 * @preone/ui — Feedback Components Barrel Export
 *
 * Re-exports all feedback/display components and types.
 * Import from `@preone/ui/feedback` for tree-shaking, or
 * from `@preone/ui` for convenience.
 */

export {
  Alert,
  alertVariants,
  type AlertProps,
  type AlertVariant,
} from './alert.js';

export {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  ToastViewport,
  toastVariants,
  type ToastProps,
  type ToastTitleProps,
  type ToastDescriptionProps,
  type ToastActionProps,
  type ToastCloseProps,
  type ToastViewportProps,
  type ToastVariant,
} from './toast.js';

export {
  NotificationCard,
  notificationCardVariants,
  type NotificationCardProps,
} from './notification-card.js';

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogOverlay,
  dialogContentVariants,
  type DialogProps,
  type DialogTriggerProps,
  type DialogContentProps,
  type DialogHeaderProps,
  type DialogTitleProps,
  type DialogDescriptionProps,
  type DialogFooterProps,
  type DialogCloseProps,
  type DialogOverlayProps,
  type DialogSize,
} from './dialog.js';

export {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  DrawerOverlay,
  drawerContentVariants,
  type DrawerProps,
  type DrawerTriggerProps,
  type DrawerContentProps,
  type DrawerHeaderProps,
  type DrawerTitleProps,
  type DrawerDescriptionProps,
  type DrawerFooterProps,
  type DrawerCloseProps,
  type DrawerOverlayProps,
  type DrawerSide,
} from './drawer.js';

export {
  ConfirmDialog,
  confirmButtonVariants,
  type ConfirmDialogProps,
  type ConfirmDialogVariant,
} from './confirm-dialog.js';

export {
  SuccessDialog,
  type SuccessDialogProps,
} from './success-dialog.js';

export {
  ErrorDialog,
  type ErrorDialogProps,
} from './error-dialog.js';
