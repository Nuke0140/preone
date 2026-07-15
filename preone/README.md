# PreOne — Enterprise Preschool Operating System

> Multi-tenant SaaS platform for India's preschool ecosystem. Built with Next.js 16, NestJS, PostgreSQL 16, Redis, BullMQ, and Kubernetes.

## Monorepo Layout

```
preone/
├── apps/
│   ├── api/           # NestJS 11 backend (modular monolith, 14 domains)
│   ├── web/           # Next.js 16 admin portal (desktop-first responsive)
│   ├── mobile/        # React Native + Expo parent & teacher apps
│   └── worker/        # BullMQ background job processor (separate deployable)
├── packages/
│   ├── database/      # Prisma schema (307 models), migrations, seeds
│   ├── shared/        # Shared TS utilities, constants, errors
│   ├── ui/            # Shared React component library
│   ├── config/        # Shared ESLint, TS, Tailwind configs
│   └── types/         # Shared TS type definitions (DTOs, enums)
├── infra/
│   ├── docker/        # Dockerfiles + docker-compose for local dev
│   ├── k8s/           # Kubernetes manifests (base + overlays per env)
│   ├── terraform/     # IaC for AWS (EKS, RDS, ElastiCache, S3)
│   └── helm/          # Helm charts for each service
├── scripts/           # Setup, DB, deploy helper scripts
├── docs/              # Architecture, API docs, runbooks, ADRs
└── .github/workflows/ # CI/CD pipelines
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11, TypeScript 5.6, Prisma 6, BullMQ 5, Socket.IO 4 |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, TanStack Query |
| Mobile | React Native 0.76, Expo SDK 51 |
| Database | PostgreSQL 16 (HA via Patroni, RLS for multi-tenancy) |
| Cache/Queue | Redis 7.2 (Sentinel HA, 10 logical DBs) |
| Object Storage | AWS S3 + CloudFront CDN |
| Containerization | Docker (multi-stage), Kubernetes 1.29 (EKS) |
| Observability | Prometheus + Grafana + Loki + Jaeger + OpenTelemetry |
| CI/CD | GitHub Actions, GHCR, ArgoCD |
| IaC | Terraform + Helm |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start local infra (Postgres, Redis, MinIO)
pnpm docker:up

# Run database migrations
pnpm db:migrate:dev
pnpm db:seed

# Start all apps in dev mode
pnpm dev

# Or start individually
pnpm dev:api     # NestJS API on :3001
pnpm dev:web     # Next.js on :3000
pnpm dev:worker  # BullMQ worker
```

## Documentation

- [Architecture Decisions](docs/architecture/) — ADR Catalog
- [Backend Technical Design](docs/architecture/backend-td.md)
- [Database Schema (ERD v3.0)](docs/architecture/erd-v3.md)
- [API Contract Catalog](docs/api/) — OpenAPI specs
- [Runbooks](docs/runbooks/) — Ops playbooks

## License

UNLICENSED — Internal use only.
