/**
 * @preone/core — Core utilities, types, and shared primitives for the PreOne platform.
 *
 * @module
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export {
  type Brand,
  type Nullable,
  type Optional,
  type DeepPartial,
  type DeepReadonly,
  type Prettify,
  type Equals,
  brand,
  unbrand,
} from './types/index.js';

// ─── String utilities ───────────────────────────────────────────────────────

export {
  capitalize,
  camelCase,
  kebabCase,
  snakeCase,
  truncate,
  slugify,
  isNonEmptyString,
} from './utils/string.js';

// ─── Array utilities ────────────────────────────────────────────────────────

export {
  groupBy,
  uniqueBy,
  chunk,
  flatten,
  partition,
  moveItem,
  range,
} from './utils/array.js';

// ─── Object utilities ───────────────────────────────────────────────────────

export {
  deepMerge,
  pick,
  omit,
  getNestedValue,
  setNestedValue,
  isEmpty,
  isObject,
} from './utils/object.js';

// ─── Async utilities ────────────────────────────────────────────────────────

export {
  debounce,
  throttle,
  sleep,
  retry,
  timeout,
  TimeoutError,
  type RetryOptions,
} from './utils/async.js';

// ─── Logger ─────────────────────────────────────────────────────────────────

export {
  createLogger,
  logger,
  type LogLevel,
  type LogContext,
  type LoggerConfig,
} from './logger/index.js';

// ─── Events ─────────────────────────────────────────────────────────────────

export {
  EventBus,
  type EventHandler,
  type EventBusConfig,
} from './events/index.js';

// ─── Errors ─────────────────────────────────────────────────────────────────

export {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  type ErrorCode,
  type ErrorContext,
} from './errors/index.js';

// ─── cn utility ─────────────────────────────────────────────────────────────

export { cn } from './cn.js';
