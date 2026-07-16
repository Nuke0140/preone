#!/usr/bin/env python3
"""
Wave 14 — Split schema.prisma into domain-wise multi-file Prisma schema.

Strategy:
- Parse the single-file schema.prisma into blocks (generator, datasource, enum, model)
  preserving their leading `// ...` comment lines.
- Assign each block to a domain bucket using two signals:
    1. Section headers in pre-Wave-13 content (`// WAVE X — DOMAIN MODULE`, `// ENUMS — DOMAIN`, `// ─── Enums: X ───`, `// ===== Wave 12 — X Compliance =====`, etc.)
    2. `aggregate=YYY` hint inside the `// MODEL: name (per ERD v3.0, aggregate=YYY)` comment for Wave-13 models
- Map aggregate → domain (Tenant → platform, Campaign/Lead → crm, Program → academics, etc.)
- Enum fallbacks (Wave 13 AUTO-GENERATED FALLBACK ENUMS) go to a `wave13_enums` bucket but
  will be distributed to the domain that first references them.
- Write `prisma/schema/<domain>.prisma` files.
- Rewrite root `schema.prisma` to only contain generator (with `previewFeatures = ["prismaSchemaFolder"]`) + datasource + header comment.
- Detect duplicate enum definitions across files and emit an error.
"""
from __future__ import annotations

import os
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Optional

SCHEMA_PATH = Path("/home/z/my-project/preone/packages/database/prisma/schema.prisma")
SCHEMA_DIR = SCHEMA_PATH.parent
SPLIT_DIR = SCHEMA_DIR / "schema"

# Map of aggregate= hint (from Wave 13 MODEL comments) -> domain file slug
AGGREGATE_TO_DOMAIN = {
    "Tenant": "platform",
    "PlatformConfig": "platform",
    "Campaign": "crm",
    "Lead": "crm",
    "Student": "student",
    "Classroom": "student",
    "Program": "academics",
    "Attendance": "attendance",
    "Communication": "communication",
    "Finance": "finance",
    "Invoice": "finance",
    "Payroll": "hr",
    "Staff": "hr",
    "HR": "hr",
    "Admin": "administration",
    "Inventory": "inventory",
    "Transport": "transport",
    "Settings": "settings",
    "Shared": "cross_cutting",
}

# Map of pre-Wave-13 section header keyword -> domain file slug
# We match against the header text (case-insensitive)
SECTION_KEYWORDS = [
    # (regex, domain_slug)  -- order matters; first match wins
    (r"platform management", "platform"),
    (r"platform module extensions", "platform"),
    (r"platform module", "platform"),
    (r"core \(auth", "identity"),  # Core (Auth & Org)
    (r"core \(auth & org\)", "identity"),
    (r"student lifecycle", "student"),
    (r"academics", "academics"),
    (r"admissions domain", "admissions"),
    (r"admissions", "admissions"),
    (r"attendance / daily operations", "attendance"),
    (r"attendance", "attendance"),
    (r"daily operations", "attendance"),
    (r"communication module", "communication"),
    (r"communication", "communication"),
    (r"finance module", "finance"),
    (r"finance", "finance"),
    (r"hr module", "hr"),
    (r"hr compliance", "hr"),
    (r"\bhr\b", "hr"),
    (r"crm module", "crm"),
    (r"\bcrm\b", "crm"),
    (r"inventory module", "inventory"),
    (r"inventory compliance", "inventory"),
    (r"inventory", "inventory"),
    (r"administration module", "administration"),
    (r"administration / facility compliance", "administration"),
    (r"facility compliance", "administration"),
    (r"administration", "administration"),
    (r"transport module", "transport"),
    (r"transport", "transport"),
    (r"settings module", "settings"),
    (r"settings", "settings"),
    (r"reports module", "reports"),
    (r"\breports\b", "reports"),
    (r"compliance enums", "cross_cutting"),  # Wave 12 generic compliance enums
]

# Some enums used by multiple domains — assign to a single canonical domain to
# avoid duplication. Keyed by enum name. Value is the canonical domain slug.
CANONICAL_ENUM_DOMAIN = {
    # Common/shared enums used across multiple domains
    "SchoolStatus": "identity",
    "SchoolTier": "identity",
    "SubscriptionPlan": "platform",
    "SubscriptionStatus": "platform",
    "BillingPeriod": "platform",
    "BillingStatus": "platform",
    "BackupType": "platform",
    "IntegrationType": "platform",
    "UserRole": "identity",
    "UserStatus": "identity",
    "SessionType": "identity",
    "OtpPurpose": "identity",
    "OtpChannel": "identity",
    "PermissionScope": "identity",
    "FeatureFlagType": "identity",
    "AuditAction": "cross_cutting",
    "EntityType": "cross_cutting",
    "NotificationChannel": "communication",
    "NotificationPriority": "communication",
    "NotificationStatus": "communication",
    "PaymentStatus": "finance",
    "PaymentMethod": "finance",
    "InvoiceStatus": "finance",
    "FeePlanStatus": "finance",
    "RefundStatus": "finance",
    "AttendanceStatus": "attendance",
    "LeaveStatus": "hr",
    "EmployeeStatus": "hr",
    "LeadStatus": "crm",
    "CampaignStatus": "crm",
    "InventoryItemStatus": "inventory",
    "StockAuditType": "inventory",
    "ComplianceType": "cross_cutting",
    "ConsentType": "cross_cutting",
    "DocumentType": "cross_cutting",
    "DocumentStatus": "cross_cutting",
    "MediaVisibility": "cross_cutting",
    "ApprovalStatus": "cross_cutting",
    "Importance": "cross_cutting",
    "DayOfWeek": "cross_cutting",
    "FrequencyType": "cross_cutting",
    "RecurrencePattern": "cross_cutting",
    "TenantStatus": "platform",
    "ActivityType": "academics",
    "BackupStatus": "platform",
    "BroadcastType": "communication",
    "ChatMessageType": "communication",
    "ChatRoomType": "communication",
    "ChequeStatus": "finance",
    "DamagedItemAction": "inventory",
    "DiscountType": "finance",
    # Many more — for any enum not in this map, fall back to the section where it was found.
}

# Order in which we want domain files to be listed (purely cosmetic for the README)
DOMAIN_ORDER = [
    "platform",
    "identity",
    "student",
    "academics",
    "admissions",
    "attendance",
    "communication",
    "finance",
    "hr",
    "crm",
    "inventory",
    "administration",
    "transport",
    "settings",
    "reports",
    "cross_cutting",
]


# -------------------- Block parser --------------------

class Block:
    """A parsed top-level block: enum, model, generator, or datasource."""
    def __init__(self, kind: str, name: str, lines: list[str], leading_comments: list[str]):
        self.kind = kind  # 'enum' | 'model' | 'generator' | 'datasource'
        self.name = name
        self.lines = lines  # body lines including opening `{` and closing `}`
        self.leading_comments = leading_comments

    def render(self) -> str:
        out = ""
        if self.leading_comments:
            out += "\n".join(self.leading_comments) + "\n"
        out += "\n".join(self.lines)
        return out

    def aggregate_hint(self) -> Optional[str]:
        """Extract aggregate=XXX hint from leading comments (Wave 13 only)."""
        for c in self.leading_comments:
            m = re.search(r"aggregate=([A-Za-z]+)", c)
            if m:
                return m.group(1)
        return None


def parse_schema(text: str) -> tuple[list[Block], list[str]]:
    """Parse the schema file into blocks. Return (blocks, top_header_lines).
    top_header_lines are the leading comments before any block (the file-level docstring)."""
    lines = text.splitlines()
    i = 0
    n = len(lines)

    # Capture top-level header (comments + blanks before the first block)
    top_header: list[str] = []
    while i < n:
        ln = lines[i]
        s = ln.strip()
        if s.startswith("generator ") or s.startswith("datasource ") or s.startswith("enum ") or s.startswith("model "):
            break
        top_header.append(ln)
        i += 1

    blocks: list[Block] = []

    pending_comments: list[str] = []

    while i < n:
        ln = lines[i]
        s = ln.strip()

        # Blank line — accumulate as part of pending comment block boundary (we keep blanks out of leading comments)
        if s == "":
            # Decide: if the next non-blank is a comment, drop blank; if next is a block, drop blank too.
            i += 1
            continue

        if s.startswith("//"):
            pending_comments.append(ln)
            i += 1
            continue

        # Block opener: <kind> <name> {
        m = re.match(r"^(generator|datasource|enum|model)\s+([A-Za-z0-9_]+)\s*\{", s)
        if not m:
            # Unknown top-level line — skip
            i += 1
            continue

        kind = m.group(1)
        name = m.group(2)
        # Find closing brace at column 0
        body_lines = [ln]
        depth = s.count("{") - s.count("}")
        i += 1
        while i < n and depth > 0:
            body_lines.append(lines[i])
            depth += lines[i].count("{") - lines[i].count("}")
            i += 1

        blocks.append(Block(kind, name, body_lines, pending_comments))
        pending_comments = []

    return blocks, top_header


# -------------------- Domain assignment --------------------

def domain_for_block(block: Block, current_section: Optional[str]) -> str:
    """Decide which domain file a block belongs to.

    current_section: the most recent `// WAVE X — DOMAIN` or `// ENUMS — DOMAIN` header text
                     that appeared before this block (only meaningful for pre-Wave-13 content).
    """
    # Generator and datasource stay in root schema.prisma
    if block.kind in ("generator", "datasource"):
        return "_root"

    # Wave 13 models: use aggregate= hint
    if block.kind == "model":
        agg = block.aggregate_hint()
        if agg:
            domain = AGGREGATE_TO_DOMAIN.get(agg)
            if domain:
                return domain
            # Unknown aggregate — fall back to cross_cutting
            print(f"WARN: model {block.name} has unknown aggregate={agg}; routing to cross_cutting", file=sys.stderr)
            return "cross_cutting"

    # Wave 13 fallback enums (AUTO-GENERATED FALLBACK ENUMS section)
    # Detect by leading comment containing "AUTO-GENERATED FALLBACK ENUMS"
    for c in block.leading_comments:
        if "AUTO-GENERATED FALLBACK ENUMS" in c:
            # Try canonical placement
            if block.name in CANONICAL_ENUM_DOMAIN:
                return CANONICAL_ENUM_DOMAIN[block.name]
            return "cross_cutting"

    # Canonical enum placement (overrides section-based detection to avoid duplicates)
    if block.kind == "enum" and block.name in CANONICAL_ENUM_DOMAIN:
        return CANONICAL_ENUM_DOMAIN[block.name]

    # Fall back to section-based detection
    if current_section:
        sec_lower = current_section.lower()
        for pattern, slug in SECTION_KEYWORDS:
            if re.search(pattern, sec_lower):
                return slug

    # If nothing matched
    if block.kind == "enum":
        return "cross_cutting"
    return "cross_cutting"


# -------------------- Main split routine --------------------

def main():
    text = SCHEMA_PATH.read_text()
    blocks, top_header = parse_schema(text)

    # Track which section we're currently inside by scanning leading comments
    # We rebuild an ordered list of (block, current_section_at_that_point)
    current_section: Optional[str] = None
    block_domain: list[tuple[Block, str]] = []

    for block in blocks:
        # Update current_section from leading comments (Wave headers)
        for c in block.leading_comments:
            # Match lines like: "// WAVE 5 — COMMUNICATION MODULE (BTD §4.3 #7)"
            # or "// ENUMS — Platform Management"
            # or "// ─── Enums: HR ───"
            # or "// ===== Wave 12 — HR Compliance ====="
            m = re.match(r"^//\s*(.+)$", c)
            if not m:
                continue
            header = m.group(1).strip()
            # Heuristics: header must contain a domain keyword or the word WAVE/ENUMS/MODULE
            if re.search(r"(WAVE|ENUMS|MODULE|Compliance|Models)", header, re.IGNORECASE):
                # Skip MODEL: annotations (those are per-model comments, not section headers)
                if header.startswith("MODEL:"):
                    continue
                # Skip notes/inline comments that begin with lowercase verbs
                if re.match(r"^(Note|Models|Deferred|Back-relations|Generated|Domains)\b", header, re.IGNORECASE):
                    continue
                current_section = header

        domain = domain_for_block(block, current_section)
        block_domain.append((block, domain))

    # Group blocks by domain (preserve original order within each domain)
    domain_blocks: dict[str, list[Block]] = defaultdict(list)
    root_blocks: list[Block] = []
    for block, domain in block_domain:
        if domain == "_root":
            root_blocks.append(block)
        else:
            domain_blocks[domain].append(block)

    # Detect duplicate enums across all domains
    enum_to_domain: dict[str, str] = {}
    duplicates: list[tuple[str, list[str]]] = []
    for domain, blocks_list in domain_blocks.items():
        for b in blocks_list:
            if b.kind == "enum":
                if b.name in enum_to_domain:
                    duplicates.append((b.name, [enum_to_domain[b.name], domain]))
                else:
                    enum_to_domain[b.name] = domain

    if duplicates:
        print("ERROR: duplicate enum definitions detected across domain files:", file=sys.stderr)
        for name, doms in duplicates:
            print(f"  enum {name}: appears in {doms}", file=sys.stderr)
        sys.exit(1)

    # Also detect duplicate models (shouldn't happen but safety check)
    model_to_domain: dict[str, str] = {}
    model_dupes: list[tuple[str, list[str]]] = []
    for domain, blocks_list in domain_blocks.items():
        for b in blocks_list:
            if b.kind == "model":
                if b.name in model_to_domain:
                    model_dupes.append((b.name, [model_to_domain[b.name], domain]))
                else:
                    model_to_domain[b.name] = domain
    if model_dupes:
        print("ERROR: duplicate model definitions detected:", file=sys.stderr)
        for name, doms in model_dupes:
            print(f"  model {name}: appears in {doms}", file=sys.stderr)
        sys.exit(1)

    # Create split directory
    SPLIT_DIR.mkdir(parents=True, exist_ok=True)

    # Domain file headers
    DOMAIN_DESCRIPTIONS = {
        "platform": "Platform Management — subscriptions, billing, integrations, storage usage, backups, tenant provisioning",
        "identity": "Identity & Core Org — schools, branches, users, roles, permissions, sessions, OTP, audit, feature flags",
        "student": "Student Lifecycle — students, guardians, medical, immunization, classroom assignments, promotions, transfers",
        "academics": "Academics — academic sessions, classrooms, sections, enrollments, curriculum, assessments, observations, portfolios, report cards, programs",
        "admissions": "Admissions — applications, waiting lists, admissions, follow-ups",
        "attendance": "Attendance & Daily Operations — daily logs, reports, incidents, meals, naps, toilet, mood, water intake",
        "communication": "Communication — templates, notifications, announcements, chat, provider delivery logs",
        "finance": "Finance — fee plans, concessions, invoices, payments, refunds, ledger, late fees, scholarships, GST",
        "hr": "Human Resources — employees, positions, leaves, payroll, salary revisions, performance reviews, training, ICC, substitutes, compliance",
        "crm": "CRM — leads, campaigns, follow-ups, marketing channels, referrals, lead scoring",
        "inventory": "Inventory — items, suppliers, purchase orders, GRNs, goods issues, returns, stock audits, reorder, disposal, compliance",
        "administration": "Administration — assets, visitors, CCTV, maintenance, compliance, food samples",
        "transport": "Transport — vehicles, routes, trips, stops, driver assignments",
        "settings": "Settings — system config, calendar events, user preferences",
        "reports": "Reports — report definitions, executions, schedules, snapshots",
        "cross_cutting": "Cross-Cutting — audit log, outbox, attachments, approvals, shared enums, compliance enums",
    }

    # Write each domain file
    written_files: list[Path] = []
    for domain in DOMAIN_ORDER:
        if domain not in domain_blocks:
            continue
        blocks_list = domain_blocks[domain]
        out_path = SPLIT_DIR / f"{domain}.prisma"
        lines: list[str] = []
        lines.append(f"// PreOne Prisma Schema — {domain.replace('_', '-').title()} domain")
        lines.append(f"// {DOMAIN_DESCRIPTIONS.get(domain, '')}")
        lines.append("// Part of the multi-file Prisma schema (preview feature: prismaSchemaFolder).")
        lines.append("// Do not edit generator/datasource here — those live in the root schema.prisma.")
        lines.append("")
        for b in blocks_list:
            rendered = b.render()
            lines.append(rendered)
            lines.append("")
        out_path.write_text("\n".join(lines) + "\n")
        written_files.append(out_path)
        n_models = sum(1 for b in blocks_list if b.kind == "model")
        n_enums = sum(1 for b in blocks_list if b.kind == "enum")
        print(f"  wrote {out_path.relative_to(SCHEMA_DIR)} — {n_models} models, {n_enums} enums")

    # Handle any domain not in DOMAIN_ORDER (e.g., cross_cutting is already there)
    for domain, blocks_list in domain_blocks.items():
        if domain in DOMAIN_ORDER:
            continue
        out_path = SPLIT_DIR / f"{domain}.prisma"
        lines = [f"// PreOne Prisma Schema — {domain} (auto)", ""]
        for b in blocks_list:
            lines.append(b.render())
            lines.append("")
        out_path.write_text("\n".join(lines) + "\n")
        written_files.append(out_path)
        print(f"  wrote {out_path.relative_to(SCHEMA_DIR)} (extra)")

    # Rewrite root schema.prisma — only generator + datasource + header
    # Update the generator block to include previewFeatures
    root_lines: list[str] = []
    # Keep top header (file docstring) but trim trailing blanks
    trimmed_header = list(top_header)
    while trimmed_header and trimmed_header[-1].strip() == "":
        trimmed_header.pop()
    root_lines.extend(trimmed_header)
    root_lines.append("")

    for b in root_blocks:
        if b.kind == "generator":
            # Inject previewFeatures if not present
            body = b.lines
            if not any("previewFeatures" in l for l in body):
                # Insert before the closing brace
                new_body = []
                for ln in body:
                    if ln.strip() == "}":
                        # Indentation match: 2 spaces
                        new_body.append('  previewFeatures = ["prismaSchemaFolder"]')
                    new_body.append(ln)
                body = new_body
            root_lines.extend(b.leading_comments)
            root_lines.extend(body)
            root_lines.append("")
        elif b.kind == "datasource":
            root_lines.extend(b.leading_comments)
            root_lines.extend(b.lines)
            root_lines.append("")
        else:
            # Shouldn't happen — but if it does, preserve it
            root_lines.extend(b.leading_comments)
            root_lines.extend(b.lines)
            root_lines.append("")

    SCHEMA_PATH.write_text("\n".join(root_lines) + "\n")
    print(f"\n  rewrote {SCHEMA_PATH.relative_to(SCHEMA_DIR.parent.parent.parent)} (root, generator+datasource only)")

    # Summary
    print("\n=== Split Summary ===")
    total_models = 0
    total_enums = 0
    for domain in DOMAIN_ORDER:
        if domain not in domain_blocks:
            continue
        bs = domain_blocks[domain]
        nm = sum(1 for b in bs if b.kind == "model")
        ne = sum(1 for b in bs if b.kind == "enum")
        total_models += nm
        total_enums += ne
        print(f"  {domain:18s}  {nm:4d} models  {ne:4d} enums")
    print(f"  {'TOTAL':18s}  {total_models:4d} models  {total_enums:4d} enums")
    print(f"  Root schema.prisma: 1 generator, 1 datasource")
    print(f"  Files written: {len(written_files) + 1} (split files + root)")


if __name__ == "__main__":
    main()
