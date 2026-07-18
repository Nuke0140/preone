/**
 * @preone/ui — Data Components Barrel Export
 *
 * Re-exports all data display components and types.
 * Import from `@preone/ui/data` for tree-shaking, or
 * from `@preone/ui` for convenience.
 */

export {
  Badge,
  badgeVariants,
  type BadgeProps,
  type BadgeVariant,
  type BadgeSize,
} from './badge.js';

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
} from './avatar.js';

export {
  Progress,
  progressVariants,
  type ProgressProps,
  type ProgressVariant,
  type ProgressSize,
} from './progress.js';

export {
  StatCard,
  statCardVariants,
  type StatCardProps,
  type StatCardVariant,
  type StatChange,
  type ChangeDirection,
} from './stat-card.js';

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
} from './timeline.js';

export {
  EmptyState,
  emptyStateVariants,
  type EmptyStateProps,
  type EmptyStateVariant,
} from './empty-state.js';

export {
  LoadingState,
  loadingStateVariants,
  type LoadingStateProps,
  type LoadingStateVariant,
} from './loading-state.js';

export {
  Skeleton,
  skeletonVariants,
  type SkeletonProps,
  type SkeletonVariant,
} from './skeleton.js';

export {
  Spinner,
  spinnerVariants,
  type SpinnerProps,
  type SpinnerSize,
} from './spinner.js';
