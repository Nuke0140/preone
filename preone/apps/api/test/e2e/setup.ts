/**
 * E2E test setup — bootstrap NestJS testing module.
 *
 * Provides a shared TestApp fixture for all e2e suites.
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as argon2 from 'argon2';

export interface TestApp {
  app: INestApplication;
  module: TestingModule;
}

/**
 * Build a test app with mocked infrastructure (no real Postgres/Redis).
 * Useful for controller-layer + guard-layer + filter-layer tests.
 */
export async function buildTestApp(): Promise<TestApp> {
  const module = await Test.createTestingModule({
    imports: [],
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
  }));
  await app.init();
  return { app, module };
}

export async function teardownTestApp(t: TestApp): Promise<void> {
  if (t.app) await t.app.close();
}

/**
 * Helper: hash a password with argon2id (matches production hashing).
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}
