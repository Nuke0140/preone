/**
 * @preone/env — Environment variable template.
 *
 * Exports a string containing a starter `.env` file that documents
 * every variable used by the PreOne application. Copy this to `.env`
 * and fill in the values appropriate for your environment.
 */

export const ENV_EXAMPLE = `# ═══════════════════════════════════════════════════════════════════════
# PreOne — Environment Variables
# ═══════════════════════════════════════════════════════════════════════
# Copy this file to \`.env\` and adjust values for your environment.
# Variables marked [REQUIRED] must be set before the app can start.
# Variables with defaults can be left commented out.
# ═══════════════════════════════════════════════════════════════════════

# ─── Server-Side Variables ──────────────────────────────────────────────
# These are NEVER exposed to the browser.

# Application environment: "development" | "staging" | "production" | "test"
# Default: development
NODE_ENV=development

# HTTP server port (1–65535)
# Default: 3000
PORT=3000

# HTTP server bind address
# Default: 0.0.0.0
HOST=0.0.0.0

# [REQUIRED] Base URL for the API server
API_URL=http://localhost:3001

# [REQUIRED] Database connection string
# - SQLite:     file:./dev.db
# - PostgreSQL: postgresql://user:pass@host:5432/db
DATABASE_URL=file:./dev.db

# Log verbosity: "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent"
# Default: info  (development: debug, production: warn, test: silent)
LOG_LEVEL=debug

# Set to "true" when running in CI (GitHub Actions, etc.)
# Default: false
CI=false

# ─── Client-Side Variables ──────────────────────────────────────────────
# Only NEXT_PUBLIC_ prefixed variables are exposed to the browser.

# [REQUIRED] Public API URL accessible from the browser
NEXT_PUBLIC_API_URL=http://localhost:3001

# Application display name shown in the UI
# Default: preone/app
NEXT_PUBLIC_APP_NAME=preone/app

# Semantic version displayed to users
# Default: 0.1.0
NEXT_PUBLIC_APP_VERSION=0.1.0

# ─── Optional Extensions ───────────────────────────────────────────────
# Uncomment and configure as needed when using extended schemas.

# Redis connection for caching / queues
# REDIS_URL=redis://localhost:6379

# SendGrid API key for transactional email
# SENDGRID_API_KEY=

# Sentry DSN for error tracking (client-side)
# NEXT_PUBLIC_SENTRY_DSN=

# Authentication secrets
# AUTH_SECRET=
# AUTH_URL=http://localhost:3000
` as const;
