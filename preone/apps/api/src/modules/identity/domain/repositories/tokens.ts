/**
 * Repository DI tokens — interface tokens for dependency injection.
 *
 * Per BTD §6.1: "Application → Infrastructure: Allowed (via interfaces)"
 * Pattern: { provide: 'SchoolRepository', useClass: PrismaSchoolRepository }
 */
export const SCHOOL_REPOSITORY = Symbol('SCHOOL_REPOSITORY');
export const BRANCH_REPOSITORY = Symbol('BRANCH_REPOSITORY');
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');
export const PERMISSION_REPOSITORY = Symbol('PERMISSION_REPOSITORY');
export const USER_ROLE_REPOSITORY = Symbol('USER_ROLE_REPOSITORY');
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
export const OTP_CHALLENGE_REPOSITORY = Symbol('OTP_CHALLENGE_REPOSITORY');
export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');
export const FEATURE_FLAG_REPOSITORY = Symbol('FEATURE_FLAG_REPOSITORY');
