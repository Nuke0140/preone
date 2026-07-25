// ============================================================================
// @preone/core — Types
// Pure TypeScript type utilities, domain types, and shared contracts
// ============================================================================

// ----------------------------------------------------------------------------
// Branded / Nominal Types
// ----------------------------------------------------------------------------

/** Branded type for nominal typing — prevents accidental structural equivalence. */
export type Branded<T, B extends string> = T & { readonly __brand: B };

// ----------------------------------------------------------------------------
// Utility Types
// ----------------------------------------------------------------------------

/** Makes T nullable (T | null). */
export type Nullable<T> = T | null;

/** Makes T optional (T | undefined). */
export type Optional<T> = T | undefined;

/** Deep partial — makes every nested property optional. */
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/** Deep readonly — makes every nested property readonly. */
export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

/** Deep required — makes every nested property required. */
export type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

/** Flatten type display for IDE hover — removes intersection/union noise. */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** Type-level equality check — resolves to true if A and B are identical, else false. */
export type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Extract required keys from T as a union. */
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/** Extract optional keys from T as a union. */
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

/** Pick keys K from T and make them required. */
export type PickRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Union of values from an object type. */
export type ValueOf<T> = T[keyof T];

/** [key, value] tuple entries from an object type. */
export type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][];

// ----------------------------------------------------------------------------
// Result Type
// ----------------------------------------------------------------------------

/** Successful result. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
  readonly error?: never;
}

/** Failed result. */
export interface Err<E> {
  readonly ok: false;
  readonly value?: never;
  readonly error: E;
}

/** Result type — a discriminated union for success/error patterns. */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/** Async result — Promise of Result. */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// ----------------------------------------------------------------------------
// Pagination
// ----------------------------------------------------------------------------

export interface PaginationParams {
  readonly page: number;
  readonly pageSize: number;
  readonly cursor?: string;
}

export interface PaginatedResponse<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
  readonly nextCursor?: string;
}

// ----------------------------------------------------------------------------
// Sorting
// ----------------------------------------------------------------------------

export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  readonly field: string;
  readonly direction: SortDirection;
}

// ----------------------------------------------------------------------------
// Filtering
// ----------------------------------------------------------------------------

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull'
  | 'between';

export interface FilterParams {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value?: string | number | boolean | readonly (string | number | boolean)[];
}

// ----------------------------------------------------------------------------
// API
// ----------------------------------------------------------------------------

export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ApiError;
  readonly meta?: Record<string, unknown>;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly statusCode?: number;
}

// ----------------------------------------------------------------------------
// Permissions & Roles
// ----------------------------------------------------------------------------

export enum PermissionLayer {
  Route = 'route',
  Menu = 'menu',
  Screen = 'screen',
  Component = 'component',
  Button = 'button',
  Field = 'field',
  Api = 'api',
}

export interface Permission {
  readonly name: string;
  readonly resource: string;
  readonly action: string;
  readonly layer: PermissionLayer;
}

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly permissions: Permission[];
}

// ----------------------------------------------------------------------------
// Navigation
// ----------------------------------------------------------------------------

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly path?: string;
  readonly icon?: string;
  readonly children?: NavigationItem[];
  readonly permissions?: Permission[];
  readonly badge?: string | number;
  readonly external?: boolean;
  readonly disabled?: boolean;
}

export type NavigationTree = NavigationItem[];

// ----------------------------------------------------------------------------
// Theme
// ----------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  readonly mode: ThemeMode;
  readonly primaryColor?: string;
  readonly accentColor?: string;
  readonly borderRadius?: number;
  readonly fontFamily?: string;
}

// ----------------------------------------------------------------------------
// Notifications
// ----------------------------------------------------------------------------

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationConfig {
  readonly type: NotificationType;
  readonly title: string;
  readonly message?: string;
  readonly duration?: number;
  readonly dismissible?: boolean;
  readonly action?: {
    readonly label: string;
    readonly handler: () => void;
  };
}

// ----------------------------------------------------------------------------
// Application Config
// ----------------------------------------------------------------------------

export interface ApplicationConfig {
  readonly name: string;
  readonly version: string;
  readonly environment: 'development' | 'staging' | 'production' | 'test';
  readonly apiUrl: string;
  readonly theme: ThemeConfig;
  readonly features?: Record<string, boolean>;
  readonly locale?: string;
}
