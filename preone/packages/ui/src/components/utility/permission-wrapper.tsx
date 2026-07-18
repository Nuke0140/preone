/**
 * @preone/ui — PermissionWrapper Component
 *
 * A render-prop component that conditionally renders children
 * based on user permissions. This is a logic-only wrapper —
 * it renders no DOM element of its own.
 *
 * Features:
 * - **Permission-based rendering**: Show/hide content based on user roles
 * - **Fallback support**: Custom fallback UI when permission is denied
 * - **Flexible permission matching**: Checks if `requiredPermission` exists in `permissions` array
 * - **No DOM element**: Pure render-prop, no wrapper div
 * - **Not a forwardRef**: No DOM element to forward a ref to
 *
 * Design Rules:
 * - This component produces no visual output — it only controls rendering
 * - The fallback prop allows custom "no permission" UI
 * - Premium minimal: default fallback is `null` (nothing rendered)
 *
 * @example
 * ```tsx
 * import { PermissionWrapper } from '@preone/ui';
 *
 * // Basic usage — only renders children if user has 'admin' permission
 * <PermissionWrapper permissions={userPermissions} requiredPermission="admin">
 *   <AdminPanel />
 * </PermissionWrapper>
 *
 * // With fallback — shows a message when permission is denied
 * <PermissionWrapper
 *   permissions={userPermissions}
 *   requiredPermission="billing:write"
 *   fallback={<AccessDeniedMessage />}
 * >
 *   <BillingForm />
 * </PermissionWrapper>
 *
 * // No fallback — renders nothing when denied
 * <PermissionWrapper permissions={userPermissions} requiredPermission="superuser">
 *   <SuperuserDashboard />
 * </PermissionWrapper>
 * ```
 *
 * @module permission-wrapper
 */

import * as React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the PermissionWrapper component. */
export interface PermissionWrapperProps {
  /**
   * The list of permissions the current user possesses.
   * Each permission is a string identifier (e.g., 'admin', 'billing:write').
   */
  permissions: string[];

  /**
   * The permission string required to render the children.
   * If this value exists in the `permissions` array, the children
   * are rendered; otherwise, the `fallback` is rendered.
   */
  requiredPermission: string;

  /**
   * Content to render when the user does NOT have the required permission.
   * Defaults to `null` (nothing is rendered).
   *
   * @default null
   *
   * @example
   * ```tsx
   * <PermissionWrapper
   *   permissions={permissions}
   *   requiredPermission="admin"
   *   fallback={<p>You do not have access.</p>}
   * >
   *   <AdminPanel />
   * </PermissionWrapper>
   * ```
   */
  fallback?: React.ReactNode;

  /**
   * Content to render when the user HAS the required permission.
   */
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PermissionWrapper — Conditionally renders children based on permissions.
 *
 * This is a **render-prop component** that produces no DOM element.
 * It checks if the `requiredPermission` exists within the `permissions`
 * array and renders `children` if authorized, or `fallback` if not.
 *
 * **Why no forwardRef?**
 * Since PermissionWrapper renders no DOM element of its own,
 * there is nothing to forward a ref to. It acts as a pure
 * conditional rendering gate.
 *
 * **Permission matching:**
 * The check is a simple `includes()` on the permissions array,
 * supporting flat string-based permission systems. For more complex
 * permission logic (hierarchical, wildcard), wrap this component
 * or implement a custom checker.
 *
 * @param props - {@link PermissionWrapperProps}
 * @returns The `children` if authorized, or the `fallback` if not.
 */
export function PermissionWrapper({
  permissions,
  requiredPermission,
  fallback = null,
  children,
}: PermissionWrapperProps): React.ReactNode {
  const hasPermission = permissions.includes(requiredPermission);

  if (hasPermission) {
    return children;
  }

  return fallback;
}

PermissionWrapper.displayName = 'PermissionWrapper';
