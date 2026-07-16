/**
 * Vitest integration-test setup — runs once before all integration specs.
 *
 * Per BTD §24 — Integration Testing:
 *   "Integration tests use Testcontainers. Tests are skipped automatically
 *    when Docker is unavailable — the suite must not fail in environments
 *    without Docker."
 *
 * This setup file logs whether Docker is available so test runs are
 * debuggable. The actual Docker detection + skip happens per-test-file
 * via the `isDockerAvailable()` helper from helpers/containers.ts.
 *
 * No global container is started here — each test file owns its own
 * container to avoid cross-test state contamination.
 */
import { isDockerAvailable } from './helpers/containers';

export async function setup(): Promise<void> {
  const dockerOk = await isDockerAvailable();
  if (dockerOk) {
    // eslint-disable-next-line no-console
    console.log(
      '[integration setup] Docker detected — integration tests will run with Testcontainers',
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      '[integration setup] Docker NOT detected — integration tests will be SKIPPED (run in CI for full coverage)',
    );
  }
}
