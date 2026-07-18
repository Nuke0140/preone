/**
 * Core branded and utility types for the PreOne platform.
 *
 * Branded types provide nominal typing on top of TypeScript's structural
 * system, preventing accidental substitution of values that share the same
 * underlying representation (e.g. `UserId` vs `SchoolId` — both `string`).
 *
 * @module types
 */

// ─── Branded Types ──────────────────────────────────────────────────────────

/**
 * Create a branded type by intersecting a base type with a unique phantom
 * brand property. This enables nominal typing within TypeScript's structural
 * type system.
 *
 * @typeParam T - The underlying (runtime) type being branded.
 * @typeParam B - A unique string literal used as the brand discriminator.
 *
 * @example
 * ```ts
 * type UserId = Brand<string, 'UserId'>;
 * type SchoolId = Brand<string, 'SchoolId'>;
 *
 * const uid: UserId = brand<string, 'UserId'>('abc');
 * const sid: SchoolId = brand<string, 'SchoolId'>('abc');
 *
 * // uid = sid; // ❌ Type error – different brands
 * ```
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/**
 * Brand a value with a unique discriminator, creating a nominal type.
 *
 * This is a type-safe identity function at runtime — it simply returns the
 * input value unchanged — but at the type level it attaches the brand.
 *
 * @typeParam T - The underlying runtime type.
 * @typeParam B - The unique brand discriminator string.
 * @param value - The value to brand.
 * @returns The same value with the branded type attached.
 */
export function brand<T, B extends string>(value: T): Brand<T, B> {
  return value as Brand<T, B>;
}

/**
 * Remove the brand from a branded value, recovering the underlying type.
 *
 * Like `brand`, this is an identity function at runtime.
 *
 * @typeParam T - The underlying runtime type.
 * @typeParam B - The brand discriminator string.
 * @param branded - The branded value to un-brand.
 * @returns The underlying value without the brand.
 */
export function unbrand<T, B extends string>(branded: Brand<T, B>): T {
  return branded as T;
}

// ─── Utility Types ──────────────────────────────────────────────────────────

/**
 * Make a type nullable — equivalent to `T | null`.
 *
 * @typeParam T - The type to make nullable.
 */
export type Nullable<T> = T | null;

/**
 * Make a type optional — equivalent to `T | undefined`.
 *
 * @typeParam T - The type to make optional.
 */
export type Optional<T> = T | undefined;

/**
 * Recursively make all properties of `T` optional, including nested objects.
 *
 * @typeParam T - The type to partially apply.
 *
 * @example
 * ```ts
 * interface Config {
 *   db: { host: string; port: number };
 *   cache: { ttl: number };
 * }
 *
 * type PartialConfig = DeepPartial<Config>;
 * // { db?: { host?: string; port?: number }; cache?: { ttl?: number } }
 * ```
 */
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/**
 * Recursively make all properties of `T` readonly, including nested objects.
 *
 * @typeParam T - The type to freeze deeply.
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

/**
 * Flatten intersection types into a single readable object type.
 *
 * Useful for presenting the result of `&` intersections or mapped types
 * in IDE hover tooltips without nested `&` noise.
 *
 * @typeParam T - The intersection type to prettify.
 *
 * @example
 * ```ts
 * type Result = Prettify<{ a: string } & { b: number }>;
 * // Shows as { a: string; b: number } instead of { a: string } & { b: number }
 * ```
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Compile-time type equality check.
 *
 * Returns `true` when `A` and `B` are identical types, `false` otherwise.
 * Useful for writing type-level assertions.
 *
 * @typeParam A - First type to compare.
 * @typeParam B - Second type to compare.
 *
 * @example
 * ```ts
 * type Test = Equals<string, number>; // false
 * type Test2 = Equals<{ a: 1 }, { a: 1 }>; // true
 * ```
 */
export type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <
  T,
>() => T extends B ? 1 : 2
  ? true
  : false;
