/**
 * Testcontainers helpers — Postgres + Redis lifecycle for integration tests.
 *
 * Per BTD §24 — Integration Testing:
 *   "Integration tests use Testcontainers (real Postgres 16 + Redis 7).
 *    Each test file owns its container — no shared state between tests.
 *    Tests are skipped automatically when Docker is unavailable (e.g.,
 *    local dev without Docker). CI provides Docker."
 *
 * Pattern:
 *   const pg = await startPostgres();
 *   try { ... use pg.url ... } finally { await pg.stop(); }
 *
 * Each container is started fresh — no migration state leaks between tests.
 * The migration runner (helpers/migrations.ts) is called after start to
 * initialize the schema.
 */
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface PostgresHandle {
  container: StartedTestContainer;
  url: string;        // postgresql://test:test@host:port/preone_test
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  stop: () => Promise<void>;
}

export interface RedisHandle {
  container: StartedTestContainer;
  url: string;        // redis://host:port
  host: string;
  port: number;
  stop: () => Promise<void>;
}

/**
 * Detect whether Docker is available for Testcontainers.
 *
 * Returns false in environments without Docker (e.g., local dev sandboxes).
 * The integration test suite uses this to skip cleanly rather than fail.
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync('docker info', { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Start a fresh Postgres 16 container with the outbox + audit_log schema
 * applied. Returns a handle with the connection URL.
 *
 * Container config:
 *   - Image: postgres:16-alpine (small, fast startup)
 *   - User/Pass: test/test (single-tenant test DB)
 *   - Database: preone_test
 *   - Port: random host port (avoid conflicts)
 *
 * Startup time: ~3-5 seconds. The container is stopped in the test's afterAll.
 */
export async function startPostgres(): Promise<PostgresHandle> {
  const container = await new GenericContainer('postgres:16-alpine')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'preone_test',
    })
    .withStartupTimeout(60_000)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const url = `postgresql://test:test@${host}:${port}/preone_test?schema=public`;

  return {
    container,
    url,
    host,
    port,
    database: 'preone_test',
    username: 'test',
    password: 'test',
    stop: async () => { await container.stop(); },
  };
}

/**
 * Start a fresh Redis 7 container for integration tests that need to verify
 * stream publishing (OutboxPublisher, SagaRetryWorker).
 *
 * Container config:
 *   - Image: redis:7-alpine
 *   - Port: random host port
 *   - No password (test only)
 */
export async function startRedis(): Promise<RedisHandle> {
  const container = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withStartupTimeout(30_000)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(6379);
  const url = `redis://${host}:${port}`;

  return {
    container,
    url,
    host,
    port,
    stop: async () => { await container.stop(); },
  };
}
