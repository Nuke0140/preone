/**
 * DI tokens for Student module repositories (BTD §6.1 — Port/Adapter pattern).
 *
 * Using string tokens (not class tokens) so the domain layer has zero infra
 * deps. The infrastructure layer provides concrete implementations bound to
 * these tokens in student.module.ts.
 */
export const STUDENT_REPOSITORY = Symbol('STUDENT_REPOSITORY');
export const GUARDIAN_REPOSITORY = Symbol('GUARDIAN_REPOSITORY');
export const MEDICAL_RECORD_REPOSITORY = Symbol('MEDICAL_RECORD_REPOSITORY');
