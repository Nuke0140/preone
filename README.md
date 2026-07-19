# PreOne Frontend Foundation

Enterprise frontend foundation for the PreOne platform.

## Packages

| Package | Description |
|---------|-------------|
| `@preone/config` | Shared TypeScript, ESLint, Prettier, Vitest configs |
| `@preone/env` | Zod-based environment variable validation |
| `@preone/core` | Pure TypeScript utilities, types, Result pattern, EventBus |
| `@preone/design-tokens` | Design tokens with CSS/Tailwind/TS/JSON generators |
| `@preone/storybook` | Shared Storybook 8 configuration and decorators |

## Dependency Order

```
config → env → core → design-tokens → storybook
```

Future packages must depend only downward. No reverse dependencies.

## Quick Start

```bash
pnpm install
pnpm build
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm dev` | Watch mode for all packages |
| `pnpm typecheck` | Type check all packages |
| `pnpm test` | Run tests |
| `pnpm format` | Format code |
| `pnpm clean` | Clean all dist folders |

## Architecture

Built to support:
- 14 business modules
- 200+ pages
- React Native + Web
- White-label SaaS
- Multi-tenant architecture

Without requiring future structural changes.
