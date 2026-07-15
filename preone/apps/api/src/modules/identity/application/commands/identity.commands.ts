/**
 * Identity Commands — intent-bearing operations on Identity aggregates.
 *
 * Per BTD §12.2 — Commands:
 *   - Intent-bearing (CreateUserCommand, not UserDto)
 *   - Handlers load aggregate → mutate → save → return ID
 *   - Never return read models — only IDs or void
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

// ─────────────────────────────────────────────
// Auth Commands
// ─────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
  ip?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email: string; tenantId: string; branchId?: string; roles: string[]; permissionsVersion: number };
}

export class LoginCommand implements Command<LoginPayload, LoginResult> {
  readonly type = 'Identity.Login';
  constructor(
    readonly payload: LoginPayload,
    readonly metadata: CommandMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// User Commands
// ─────────────────────────────────────────────

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roles: string[];
  branchCode?: string;
  displayName?: string;
}

export class CreateUserCommand implements Command<CreateUserPayload, { id: string }> {
  readonly type = 'Identity.CreateUser';
  constructor(
    readonly payload: CreateUserPayload,
    readonly metadata: CommandMetadata,
  ) {}
}

export interface ChangeUserRolesPayload {
  userId: string;
  roles: string[];
}

export class ChangeUserRolesCommand implements Command<ChangeUserRolesPayload, { id: string; newPermissionsVersion: number }> {
  readonly type = 'Identity.ChangeUserRoles';
  constructor(
    readonly payload: ChangeUserRolesPayload,
    readonly metadata: CommandMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// School Commands
// ─────────────────────────────────────────────

export interface CreateSchoolPayload {
  name: string;
  email: string;
  phone: string;
  tier: 'STARTER' | 'GROWTH' | 'SCALE' | 'ENTERPRISE';
  website?: string;
  legalName?: string;
}

export class CreateSchoolCommand implements Command<CreateSchoolPayload, { id: string }> {
  readonly type = 'Identity.CreateSchool';
  constructor(
    readonly payload: CreateSchoolPayload,
    readonly metadata: CommandMetadata,
  ) {}
}
