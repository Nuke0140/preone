/**
 * @preone/ui — PreOne Enterprise UI Component Library
 *
 * Central barrel export for all UI components, hooks, and utilities.
 * Import from `@preone/ui` for full access, or use deep imports
 * for tree-shaking: `@preone/ui/button`, `@preone/ui/input`, etc.
 *
 * Design Language:
 * - Very large whitespace (generous padding)
 * - Rounded corners (var(--radius-lg) = 12px default)
 * - Soft shadows only
 * - NO heavy borders, NO glossy, NO gradients
 * - Inter font family
 * - 8-point spacing grid
 * - All colors via CSS variables from @preone/design-tokens
 * - Premium, minimal, clean, professional
 */

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export { cn } from './utils/cn.js';
export { createComponent, type CreateComponentOptions, type PreOneComponent } from './utils/create-component.js';

// ---------------------------------------------------------------------------
// Components — Buttons
// ---------------------------------------------------------------------------

export {
  Button,
  buttonVariants,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './components/buttons/button.js';

export {
  IconButton,
  iconButtonVariants,
  type IconButtonProps,
} from './components/buttons/icon-button.js';

export {
  SplitButton,
  type SplitButtonProps,
  type SplitButtonAction,
} from './components/buttons/split-button.js';

export {
  FloatingActionButton,
  fabVariants,
  type FloatingActionButtonProps,
  type FabVariant,
  type FabSize,
} from './components/buttons/fab.js';

// ---------------------------------------------------------------------------
// Components — Layout
// ---------------------------------------------------------------------------

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
  type CardProps,
} from './components/layout/card.js';

export {
  Tile,
  StatusDot,
  tileVariants,
  statusDotVariants,
  type TileProps,
  type StatusDotProps,
} from './components/layout/tile.js';

export {
  PageHeader,
  type PageHeaderProps,
} from './components/layout/page-header.js';

export {
  Section,
  type SectionProps,
} from './components/layout/section.js';

export {
  Container,
  containerVariants,
  type ContainerProps,
} from './components/layout/container.js';

export {
  Grid,
  GridItem,
  gridVariants,
  type GridProps,
  type GridItemProps,
} from './components/layout/grid.js';

export {
  Stack,
  VStack,
  HStack,
  stackVariants,
  type StackProps,
  type VStackProps,
  type HStackProps,
} from './components/layout/stack.js';

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarItem,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
  type SidebarProps,
  type SidebarHeaderProps,
  type SidebarContentProps,
  type SidebarFooterProps,
  type SidebarItemProps,
  type SidebarGroupProps,
  type SidebarGroupLabelProps,
} from './components/layout/sidebar.js';

export {
  Header,
  type HeaderProps,
} from './components/layout/header.js';

export {
  Footer,
  FooterSection,
  FooterLink,
  FooterBottom,
  type FooterProps,
  type FooterSectionProps,
  type FooterLinkProps,
  type FooterBottomProps,
} from './components/layout/footer.js';

export {
  BottomNavigation,
  BottomNavItem,
  type BottomNavigationProps,
  type BottomNavItemProps,
} from './components/layout/bottom-navigation.js';

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  type BreadcrumbProps,
  type BreadcrumbItemProps,
  type BreadcrumbSeparatorProps,
  type BreadcrumbEllipsisProps,
} from './components/layout/breadcrumb.js';

export {
  Divider,
  type DividerProps,
} from './components/layout/divider.js';

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  type AccordionProps,
  type AccordionItemProps,
  type AccordionTriggerProps,
  type AccordionContentProps,
} from './components/layout/accordion.js';

export {
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  tabListVariants,
  tabTriggerVariants,
  type TabsProps,
  type TabListProps,
  type TabTriggerProps,
  type TabContentProps,
} from './components/layout/tabs.js';

// ---------------------------------------------------------------------------
// Components — Navigation
// ---------------------------------------------------------------------------

export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuLabel,
  MenuSeparator,
  MenuGroup,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
  type MenuProps,
  type MenuTriggerProps,
  type MenuContentProps,
  type MenuItemProps,
  type MenuCheckboxItemProps,
  type MenuRadioGroupProps,
  type MenuRadioItemProps,
  type MenuLabelProps,
  type MenuSeparatorProps,
  type MenuGroupProps,
} from './components/navigation/menu.js';

export {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  DropdownGroup,
  type DropdownProps,
  type DropdownItemProps,
  type DropdownSeparatorProps,
  type DropdownLabelProps,
  type DropdownGroupProps,
} from './components/navigation/dropdown.js';

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  type PopoverProps,
  type PopoverTriggerProps,
  type PopoverContentProps,
  type PopoverCloseProps,
} from './components/navigation/popover.js';

export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  type TooltipProviderProps,
  type TooltipProps,
  type TooltipTriggerProps,
  type TooltipContentProps,
} from './components/navigation/tooltip.js';

export {
  CommandPalette,
  CommandPaletteTrigger,
  CommandPaletteContent,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
  type CommandPaletteProps,
  type CommandPaletteContentProps,
  type CommandInputProps,
  type CommandListProps,
  type CommandGroupProps,
  type CommandItemProps,
  type CommandEmptyProps,
  type CommandSeparatorProps,
} from './components/navigation/command-palette.js';

// ---------------------------------------------------------------------------
// Components — Inputs
// ---------------------------------------------------------------------------

export {
  Input,
  inputVariants,
} from './components/inputs/input.js';
export type { InputProps } from './components/inputs/input.js';

export {
  Textarea,
  textareaVariants,
} from './components/inputs/textarea.js';
export type { TextareaProps } from './components/inputs/textarea.js';

export {
  Password,
  passwordVariants,
} from './components/inputs/password.js';
export type { PasswordProps, PasswordStrength } from './components/inputs/password.js';

export {
  OTPInput,
  otpBoxVariants,
} from './components/inputs/otp-input.js';
export type { OTPInputProps } from './components/inputs/otp-input.js';

export {
  PhoneInput,
  phoneInputVariants,
  defaultCountries,
} from './components/inputs/phone-input.js';
export type { PhoneInputProps, CountryEntry } from './components/inputs/phone-input.js';

export {
  SearchInput,
  searchInputVariants,
} from './components/inputs/search-input.js';
export type { SearchInputProps } from './components/inputs/search-input.js';

export {
  NumberInput,
  numberInputVariants,
} from './components/inputs/number-input.js';
export type { NumberInputProps } from './components/inputs/number-input.js';

export {
  CurrencyInput,
  currencyInputVariants,
  currencies,
} from './components/inputs/currency-input.js';
export type { CurrencyInputProps, CurrencyConfig } from './components/inputs/currency-input.js';

export {
  DatePicker,
  datePickerVariants,
} from './components/inputs/date-picker.js';
export type { DatePickerProps } from './components/inputs/date-picker.js';

export {
  Select,
  selectTriggerVariants,
} from './components/inputs/select.js';
export type { SelectProps, SelectOption } from './components/inputs/select.js';

export {
  MultiSelect,
  multiSelectVariants,
} from './components/inputs/multi-select.js';
export type { MultiSelectProps, MultiSelectOption } from './components/inputs/multi-select.js';

export {
  Autocomplete,
  autocompleteVariants,
} from './components/inputs/autocomplete.js';
export type { AutocompleteProps, AutocompleteOption } from './components/inputs/autocomplete.js';

export {
  Checkbox,
  checkboxVariants,
} from './components/inputs/checkbox.js';
export type { CheckboxProps } from './components/inputs/checkbox.js';

export {
  RadioGroup,
  radioIndicatorVariants,
} from './components/inputs/radio.js';
export type { RadioGroupProps, RadioOption } from './components/inputs/radio.js';

export {
  Switch,
  switchTrackVariants,
  switchThumbVariants,
} from './components/inputs/switch.js';
export type { SwitchProps } from './components/inputs/switch.js';

export {
  Slider,
  sliderTrackVariants,
  sliderThumbVariants,
} from './components/inputs/slider.js';
export type { SliderProps } from './components/inputs/slider.js';

export {
  Rating,
  ratingVariants,
} from './components/inputs/rating.js';
export type { RatingProps } from './components/inputs/rating.js';

// ---------------------------------------------------------------------------
// Components — Data
// ---------------------------------------------------------------------------

export {
  Badge,
  badgeVariants,
  type BadgeProps,
  type BadgeVariant,
  type BadgeSize,
} from './components/data/badge.js';

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  avatarVariants,
  type AvatarProps,
  type AvatarImageProps,
  type AvatarFallbackProps,
  type AvatarGroupProps,
  type AvatarSize,
  type AvatarStatus,
} from './components/data/avatar.js';

export {
  Progress,
  progressVariants,
  type ProgressProps,
  type ProgressVariant,
  type ProgressSize,
} from './components/data/progress.js';

export {
  StatCard,
  statCardVariants,
  type StatCardProps,
  type StatCardVariant,
  type StatChange,
  type ChangeDirection,
} from './components/data/stat-card.js';

export {
  Timeline,
  TimelineItem,
  TimelineDot,
  TimelineContent,
  timelineVariants,
  timelineDotVariants,
  type TimelineProps,
  type TimelineItemProps,
  type TimelineDotProps,
  type TimelineContentProps,
  type TimelineVariant,
  type TimelineDotVariant,
} from './components/data/timeline.js';

export {
  EmptyState,
  emptyStateVariants,
  type EmptyStateProps,
  type EmptyStateVariant,
} from './components/data/empty-state.js';

export {
  LoadingState,
  loadingStateVariants,
  type LoadingStateProps,
  type LoadingStateVariant,
} from './components/data/loading-state.js';

export {
  Skeleton,
  skeletonVariants,
  type SkeletonProps,
  type SkeletonVariant,
} from './components/data/skeleton.js';

export {
  Spinner,
  spinnerVariants,
  type SpinnerProps,
  type SpinnerSize,
} from './components/data/spinner.js';

// ---------------------------------------------------------------------------
// Components — Feedback
// ---------------------------------------------------------------------------

export {
  Alert,
  alertVariants,
  type AlertProps,
  type AlertVariant,
} from './components/feedback/alert.js';

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
} from './components/feedback/toast.js';

export {
  NotificationCard,
  notificationCardVariants,
  type NotificationCardProps,
} from './components/feedback/notification-card.js';

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
} from './components/feedback/dialog.js';

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
} from './components/feedback/drawer.js';

export {
  ConfirmDialog,
  confirmButtonVariants,
  type ConfirmDialogProps,
  type ConfirmDialogVariant,
} from './components/feedback/confirm-dialog.js';

export {
  SuccessDialog,
  type SuccessDialogProps,
} from './components/feedback/success-dialog.js';

export {
  ErrorDialog,
  type ErrorDialogProps,
} from './components/feedback/error-dialog.js';

// ---------------------------------------------------------------------------
// Components — Utility
// ---------------------------------------------------------------------------

export {
  ScrollArea,
  scrollAreaVariants,
  type ScrollAreaProps,
  type ScrollAreaVariant,
  type ScrollAreaSize,
} from './components/utility/scroll-area.js';

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
} from './components/utility/resizable-panel.js';

export {
  ClipboardButton,
  clipboardButtonVariants,
  type ClipboardButtonProps,
  type ClipboardButtonVariant,
  type ClipboardButtonSize,
} from './components/utility/clipboard-button.js';

export {
  ThemeToggle,
  themeToggleVariants,
  type ThemeToggleProps,
  type ThemeToggleVariant,
  type ThemeToggleSize,
} from './components/utility/theme-toggle.js';

export {
  LanguageSwitcher,
  languageSwitcherVariants,
  type LanguageSwitcherProps,
  type LanguageSwitcherVariant,
  type LanguageSwitcherSize,
  type LanguageOption,
} from './components/utility/language-switcher.js';

export {
  PermissionWrapper,
  type PermissionWrapperProps,
} from './components/utility/permission-wrapper.js';
