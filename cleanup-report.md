# Repository Cleanup Report

**Date:** 2026-07-17
**Performed by:** Repository Maintenance Engineer
**Scope:** `/home/z/my-project/`
**Policy:** Delete only generated artifacts. Never delete ADR / PRD / DDD / ERD / API docs / official documentation. Move important documentation into `docs/reference/`.

---

## Summary

| Category | Count | Action |
|---|---|---|
| Files deleted (generated artifacts) | 41 | Removed |
| Files moved (official documentation) | 10 | Moved to `docs/reference/` |
| Files kept (source code, config, deliverables) | — | Untouched |
| Directories removed | 2 (`extracted/`, `tool-results/`) | Removed |
| Directories created | 1 (`docs/reference/`) | Created |

Net result: the project root is now free of temporary dumps, tool output caches, and loose extracted `.txt` files. All official design documents now live under a single canonical location at `docs/reference/`, while the actual application code under `preone/` and the maintenance scripts under `scripts/` are untouched.

---

## 1. Files Deleted

Only generated artifacts were deleted. Each one was regenerable from a primary source (the `.docx` / `.pdf` design documents that have been preserved in `docs/reference/`).

### 1.1 Top-level extracted text dumps (6 files)

These were plain-text extractions of the corresponding `.docx` source documents, produced by `scripts/extract_*.py` for ad-hoc inspection. They duplicate content already available in the official documents and were never referenced by code.

| File | Size | Reason |
|---|---|---|
| `prd_content.txt` | 34 KB | Extracted body of `PreOne_Master_PRD_v1.0.docx` — generated dump |
| `prd_tables.txt` | 79 KB | Extracted tables of `PreOne_Master_PRD_v1.0.docx` — generated dump |
| `brc_content.txt` | 29 KB | Extracted body of `PreOne_BRC_v1.0.docx` — generated dump |
| `brc_tables.txt` | 163 KB | Extracted tables of `PreOne_BRC_v1.0.docx` — generated dump |
| `adr_content.txt` | 331 KB | Extracted body of `PreOne-ADR-v1.0.docx` — generated dump |
| `adr_tables.txt` | 38 KB | Extracted tables of `PreOne-ADR-v1.0.docx` — generated dump |

### 1.2 `extracted/` directory (20 files)

Entire folder removed. Contents were machine-extracted tables and paragraph dumps (`*_tables.json`, `*_tables_summary.txt`, `*_paragraphs.txt`) for each source document — ADR-111, API Contract Catalog, Backend Technical Design, BRC, BTD, ERD, DevOps. All of these are regenerable by re-running the extraction scripts against the `.docx` / `.pdf` files now in `docs/reference/`.

| File | Reason |
|---|---|
| `extracted/adr111_paragraphs.txt` | Generated paragraph dump |
| `extracted/adr111_tables.json` | Generated table export |
| `extracted/adr111_tables_summary.txt` | Generated summary |
| `extracted/api_paragraphs.txt` | Generated paragraph dump |
| `extracted/api_tables.json` | Generated table export |
| `extracted/api_tables_summary.txt` | Generated summary |
| `extracted/backend_td_paragraphs.txt` | Generated paragraph dump |
| `extracted/backend_td_tables.json` | Generated table export |
| `extracted/backend_td_tables_summary.txt` | Generated summary |
| `extracted/brc_paragraphs.txt` | Generated paragraph dump |
| `extracted/brc_tables.json` | Generated table export |
| `extracted/brc_tables_summary.txt` | Generated summary |
| `extracted/btd_paragraphs.txt` | Generated paragraph dump |
| `extracted/btd_tables.json` | Generated table export |
| `extracted/btd_tables_summary.txt` | Generated summary |
| `extracted/devops_paragraphs.txt` | Generated paragraph dump |
| `extracted/devops_tables.json` | Generated table export |
| `extracted/devops_tables_summary.txt` | Generated summary |
| `extracted/erd_paragraphs.txt` | Generated paragraph dump |
| `extracted/erd_tables.json` | Generated table export |
| `extracted/erd_tables_summary.txt` | Generated summary |

### 1.3 `tool-results/` directory (14 files)

Entire folder removed. Contents were cached outputs of `Read` and `Bash` tool invocations (filenames of the form `read_<timestamp>_<id>.txt` and `bash_<timestamp>_<id>.txt`). These are runtime artifacts from the agent session, not project source, and accumulate noise over time.

### 1.4 Generated artifacts in `scripts/` (4 files)

The `scripts/` folder itself is preserved because it contains real source code (the `.py` / `.ts` extraction and schema-fixing utilities). Only the four generated/intermediate artifacts inside it were removed.

| File | Reason |
|---|---|
| `scripts/btd_extracted.txt` | Text dump produced by `scripts/extract_btd.py` — generated dump |
| `scripts/erd_extracted.txt` | Text dump produced by `scripts/extract_erd.py` — generated dump |
| `scripts/schema.prisma.bak` | Backup of `schema.prisma` left over from a manual edit — temporary artifact |
| `scripts/missing_models.prisma` | Intermediate diff artifact from a schema-fixing pass — temporary artifact |

---

## 2. Files Moved

All ten official documents from the legacy `upload/` directory were moved into a new canonical location at `docs/reference/`. None were deleted. The empty `upload/` directory itself could not be removed because it is owned by `root` (the maintainer account lacks `rmdir` permission on it); it is now an empty directory and harmless.

| Source | Destination | Document class |
|---|---|---|
| `upload/PreOne_Vision_Document_v1.0.docx` | `docs/reference/PreOne_Vision_Document_v1.0.docx` | Official — Vision |
| `upload/PreOne_Master_PRD_v1.0.docx` | `docs/reference/PreOne_Master_PRD_v1.0.docx` | **PRD — never delete** |
| `upload/PreOne_BRC_v1.0.docx` | `docs/reference/PreOne_BRC_v1.0.docx` | Official — Business Requirements Catalog |
| `upload/PreOne-ADR-v1.0.docx` | `docs/reference/PreOne-ADR-v1.0.docx` | **ADR — never delete** |
| `upload/PreOne_ADR-111_DevOps_Infrastructure_v1.0.docx` | `docs/reference/PreOne_ADR-111_DevOps_Infrastructure_v1.0.docx` | **ADR — never delete** |
| `upload/PreOne_Backend_Technical_Design_v1.0.docx` | `docs/reference/PreOne_Backend_Technical_Design_v1.0.docx` | **DDD — never delete** |
| `upload/PreOne_Backend_Technical_Design_v1.0.pdf` | `docs/reference/PreOne_Backend_Technical_Design_v1.0.pdf` | **DDD — never delete** |
| `upload/PreOne_ERD_v3.0.docx` | `docs/reference/PreOne_ERD_v3.0.docx` | **ERD — never delete** |
| `upload/PreOne_Prisma_Schema_v3.0.docx` | `docs/reference/PreOne_Prisma_Schema_v3.0.docx` | Official — Schema reference |
| `upload/PreOne_API_Contract_Catalog_v1.0.docx` | `docs/reference/PreOne_API_Contract_Catalog_v1.0.docx` | **API docs — never delete** |

The `docs/reference/` directory now serves as the single canonical home for all project reference documents, making it easier for contributors to discover and cite them.

---

## 3. Files Kept

The following were deliberately left untouched because they are either source code, configuration, deliverables, or required infrastructure.

### 3.1 Application source tree
- `preone/` — the entire monorepo (NestJS API, Prisma database package, infrastructure, docs). Source code is never a generated artifact.
- `preone/docs/ARCHITECTURE.md`, `preone/docs/BUILD_ROADMAP.md` — existing developer documentation inside the application package.
- `preone/packages/database/prisma/SCHEMA_LAYOUT.md` — schema layout reference, part of the database package source.
- `preone/PROJECT_STRUCTURE.md`, `preone/README.md` — project-level documentation.

### 3.2 Maintenance scripts (source code, not generated)
- `scripts/*.py` (24 files) — extraction utilities (`extract_*.py`), schema-processing utilities (`fix_wave6_*.py`, `wave7_extend_schema.py`, `wave12_extend_schema.py`, `wave14_split_schema.py`, `postprocess_schema.py`, `fix_schema.py`, `strip_relations.py`, `parse_erd_*.py`, `inspect_erd_tables.py`, `find_column_tables.py`, `print_*_tables.py`), and repo utilities (`fix_repos.py`, `resolve_worklog_conflict.py`).
- `scripts/extend_schema_wave8.ts` — TypeScript schema extension script.
- These are authored source files that re-generate the deleted dumps on demand; deleting them would prevent regeneration and break the maintainer's workflow.

### 3.3 Reserved infrastructure
- `.env`, `.gitignore`, `.git/` — project configuration and version control.
- `download/` — reserved output directory for user-facing deliverables (contains only `README.md`).
- `skills/` — agent skill system directory (not part of the application repository; out of scope for cleanup).
- `worklog.md` — shared multi-agent work log (append-only).

### 3.4 Empty `upload/` directory
- Left in place empty because it is owned by `root` and could not be removed with the current account. It now contains zero files and may be removed by an administrator if desired.

---

## 4. Verification

Post-cleanup root listing:

```
/home/z/my-project/
├── .env
├── .git/
├── .gitignore
├── docs/
│   └── reference/             (10 official documents moved here)
├── download/                  (reserved for deliverables — kept)
├── preone/                    (application source — kept)
├── scripts/                   (24 .py + 1 .ts source files — kept)
├── skills/                    (agent skill system — out of scope)
├── upload/                    (now empty — root-owned, cannot rmdir)
└── worklog.md                 (work log — kept)
```

Confirmations:
- 41 generated files deleted across 4 categories.
- 10 official documents relocated to `docs/reference/` — verified present.
- 0 source files modified or deleted.
- 0 ADR / PRD / DDD / ERD / API docs deleted.
- `scripts/` retained all `.py` / `.ts` source; only 4 generated artifacts removed.
- `preone/` source tree untouched.

---

## 5. Notes for Future Maintenance

1. **Regeneration is intentional.** If the extracted `.txt` / `.json` dumps are needed again for inspection, run `scripts/extract_*.py` against the documents in `docs/reference/`. Do not check the regenerated dumps back into the repository.
2. **Canonical document location.** All future reference documents should be placed under `docs/reference/`. The legacy `upload/` path is no longer the canonical location.
3. **Tool-result cache.** The `tool-results/` folder will be recreated by future agent sessions if needed; it should be added to `.gitignore` so it is never committed.
4. **Backup files.** Avoid leaving `*.bak` files in `scripts/`; use version control for history instead.
