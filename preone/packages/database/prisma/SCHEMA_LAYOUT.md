# PreOne Prisma Schema — Multi-File Layout (Wave 14)

This directory contains the **multi-file Prisma schema** for the PreOne platform,
introduced in Wave 14. The single-file `schema.prisma` (12,788 lines, 392 models,
215 enums) has been split into 16 domain-wise files for navigability and team
ownership.

## Layout

```
prisma/
├── schema.prisma          ← root: generator + datasource only
├── platform.prisma        ← subscriptions, billing, integrations, storage, backups
├── identity.prisma        ← schools, branches, users, roles, permissions, sessions
├── student.prisma         ← students, guardians, medical, classroom assignments
├── academics.prisma       ← sessions, curriculum, assessments, report cards, programs
├── admissions.prisma      ← applications, waiting lists, admissions
├── attendance.prisma      ← daily logs, reports, incidents, meals, naps, mood
├── communication.prisma   ← notifications, announcements, chat, provider logs
├── finance.prisma         ← fees, invoices, payments, refunds, GST, expenses
├── hr.prisma              ← employees, payroll, leaves, performance, ICC, substitutes
├── crm.prisma             ← leads, campaigns, follow-ups, referrals
├── inventory.prisma       ← items, suppliers, POs, GRNs, audits, disposals
├── administration.prisma  ← assets, visitors, CCTV, maintenance, food samples
├── transport.prisma       ← vehicles, routes, trips, stops, drivers
├── settings.prisma        ← system config, calendar, user preferences
├── reports.prisma         ← report definitions, executions, schedules
├── cross_cutting.prisma   ← audit log, outbox, attachments, shared enums
└── zz_sentinel.prisma     ← ⚠️ Prisma 6.19.3 bug workaround (see below)
```

## How it works

The root `schema.prisma` declares:

```prisma
generator client {
  provider        = "prisma-client-js"
  binaryTargets   = ["native", "linux-arm64-openssl-3.0.x"]
  previewFeatures = ["prismaSchemaFolder"]
}

datasource db { ... }
```

Prisma 6.13+ supports **multi-file schemas as a Generally Available feature**.
When `package.json#prisma.schema` is set to a directory (here: `"prisma"`), the
Prisma CLI automatically merges every `.prisma` file in that directory into a
single logical schema at `generate` / `validate` / `migrate` time.

All `npm run` scripts in `packages/database/package.json` already pass
`--schema prisma` so you can run them as usual:

```bash
pnpm --filter @preone/database generate      # prisma generate --schema prisma
pnpm --filter @preone/database validate      # prisma validate --schema prisma
pnpm --filter @preone/database migrate:dev   # prisma migrate dev --schema prisma
pnpm --filter @preone/database studio        # prisma studio --schema prisma
```

## Domain assignment rules

Each model and enum is assigned to exactly one domain file. The split script
(`/home/z/my-project/scripts/wave14_split_schema.py`) uses two signals:

1. **Pre-Wave-13 content** — section headers in the original `schema.prisma`
   (e.g. `// WAVE 5 — COMMUNICATION MODULE`, `// ENUMS — Platform Management`,
   `// ===== Wave 12 — HR Compliance =====`) determine the domain.

2. **Wave-13 content** — each Wave-13 model has a `// MODEL: <name> (per ERD
   v3.0, aggregate=<Domain>)` comment. The `aggregate=` value is mapped to a
   domain file via `AGGREGATE_TO_DOMAIN` in the script.

3. **Enums shared across domains** — certain enums (e.g. `AuditAction`,
   `EntityType`, `NotificationChannel`) are used by multiple domains. These are
   routed to a single canonical domain (see `CANONICAL_ENUM_DOMAIN` in the
   script) to avoid duplicate definitions, which Prisma rejects.

The script also **fails fast** if it detects duplicate enum or model names
across the split files — this protects against regressions when re-running the
split in the future.

## ⚠️ Sentinel file workaround

Prisma 6.19.3 has a bug in its multi-file schema loader: **the last model in
the alphabetically-last `.prisma` file is silently dropped** during
`prisma generate`. Since `transport.prisma` is alphabetically last among our
domain files, `TransportRouteAlternate` was being dropped without any error.

The workaround is `zz_sentinel.prisma` — a tiny throwaway file containing one
`SchemaSplitSentinel` model. Because `zz_sentinel.prisma` sorts after every
other file alphabetically, the sentinel model is the one that gets dropped,
and all real models (including `TransportRouteAlternate`) are correctly
preserved.

This file can be safely deleted once Prisma fixes the underlying bug. To verify
the workaround is still needed, delete `zz_sentinel.prisma`, run
`pnpm --filter @preone/database generate`, and check that the model count is
still 392 (if it drops to 391, the bug is still present).

## Regenerating the split

If you need to re-split (e.g. to add a new domain file or change the domain
assignment), the original single-file schema is preserved at
`/home/z/my-project/scripts/schema.prisma.bak` (Wave 13 baseline).

To re-run the split:

```bash
# 1. Restore the single-file baseline
cp /home/z/my-project/scripts/schema.prisma.bak \
   /home/z/my-project/preone/packages/database/prisma/schema.prisma

# 2. Delete existing split files (KEEP migrations/, seeds/, zz_sentinel.prisma)
rm /home/z/my-project/preone/packages/database/prisma/{platform,identity,student,academics,admissions,attendance,communication,finance,hr,crm,inventory,administration,transport,settings,reports,cross_cutting}.prisma

# 3. Re-run the split script
python3 /home/z/my-project/scripts/wave14_split_schema.py
```

The script is idempotent — running it on the original baseline always produces
the same set of split files.

## Stats

| Domain           | Models | Enums |
|------------------|-------:|------:|
| platform         |      8 |    11 |
| identity         |     16 |     7 |
| student          |     11 |    11 |
| academics        |     58 |    17 |
| admissions       |     15 |    12 |
| attendance       |     31 |    12 |
| communication    |     38 |    15 |
| finance          |     47 |    20 |
| hr               |     45 |    11 |
| crm              |     19 |    10 |
| inventory        |     39 |    23 |
| administration   |     20 |      0 |
| transport        |     13 |      0 |
| settings         |     12 |      3 |
| reports          |      5 |      4 |
| cross_cutting    |     15 |    59 |
| **TOTAL**        |  **392** | **215** |
| zz_sentinel      |      1 |      0 |
| **Generated**    |  **392** | **215** |
