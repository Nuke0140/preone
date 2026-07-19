// ============================================================================
// @preone/core — Main Barrel Export
// ============================================================================

// Types
export type {
  Branded,
  Nullable,
  Optional,
  DeepPartial,
  DeepReadonly,
  DeepRequired,
  Prettify,
  Equals,
  RequiredKeys,
  OptionalKeys,
  PickRequired,
  ValueOf,
  Entries,
  Result,
  AsyncResult,
  Ok,
  Err,
  PaginationParams,
  PaginatedResponse,
  SortDirection,
  SortParams,
  FilterOperator,
  FilterParams,
  ApiResponse,
  ApiError,
  Permission,
  Role,
  NavigationItem,
  NavigationTree,
  ThemeConfig,
  ThemeMode,
  NotificationType,
  NotificationConfig,
  ApplicationConfig,
} from './types';

export { PermissionLayer } from './types';

// Utils
export {
  capitalize,
  camelCase,
  kebabCase,
  snakeCase,
  pascalCase,
  truncate,
  slugify,
  isNonEmptyString,
  maskEmail,
  maskPhone,
  templateString,
  groupBy,
  uniqueBy,
  chunk,
  flatten,
  partition,
  moveItem,
  range,
  shuffle,
  sortBy,
  findAndReplace,
  zip,
  deepMerge,
  pick,
  omit,
  getNestedValue,
  setNestedValue,
  isEmpty,
  isObject,
  mapKeys,
  mapValues,
  pickBy,
  omitBy,
  freeze,
  debounce,
  throttle,
  sleep,
  retry,
  timeout,
  withRetry,
  sequential,
  parallel,
  ConcurrentPool,
  formatDate,
  parseDate,
  isDateBefore,
  isDateAfter,
  daysBetween,
  addDays,
  startOfDay,
  endOfDay,
  relativeTime,
  isValidDate,
  clamp,
  randomInt,
  formatNumber,
  formatCurrency,
  formatPercent,
  parseNumber,
  roundTo,
  isInRange,
  CURRENCY_SYMBOLS,
  formatCurrencyWithCode,
  parseCurrency,
  convertCurrency,
  generateUUID,
  generateShortId,
  isValidUUID,
} from './utils';

export type {
  CurrencyCode,
  CurrencyConverter,
} from './utils';

// Errors
export {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ServerError,
  createError,
  fromUnknown,
  isAppError,
  getErrorType,
  ok,
  err,
  isOk,
  isErr,
  tryCatch,
  tryCatchAsync,
} from './errors';

export type {
  AppErrorType,
  AppErrorOptions,
} from './errors';

// Logger
export {
  createLogger,
  jsonFormatter,
  humanReadableFormatter,
} from './logger';

export type {
  LogLevel,
  LogEntry,
  LogFormatter,
  Logger,
} from './logger';

// Events
export {
  createEventBus,
} from './events';

export type {
  EventMap,
  EventHandler,
  EventBus,
} from './events';

// Storage
export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  createStorageAdapter,
} from './storage';

export type {
  StorageAdapter,
  StorageAdapterType,
} from './storage';

// Feature Flags
export {
  createFeatureFlagProvider,
} from './flags';

export type {
  FeatureFlag,
  FeatureFlagProvider,
} from './flags';
