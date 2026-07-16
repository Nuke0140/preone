#!/usr/bin/env python3
"""
Parse ERD v3.0 (extracted to plain text via pandoc) and emit Prisma model
blocks for every model that is *not* already present in the current schema.

Output: /home/z/my-project/scripts/missing_models.prisma  (to be appended)
"""
import re, sys
from pathlib import Path

ERD = Path('/tmp/erd.txt').read_text()
CURRENT_SCHEMA = Path('/home/z/my-project/preone/packages/database/prisma/schema.prisma').read_text()

# Already-defined models
existing = set(re.findall(r'^model\s+(\w+)\s*\{', CURRENT_SCHEMA, re.M))
existing_enums = set(re.findall(r'^enum\s+(\w+)\s*\{', CURRENT_SCHEMA, re.M))
print(f"[info] Existing models: {len(existing)}; existing enums: {len(existing_enums)}", file=sys.stderr)

# Split ERD by "Prisma Model:" markers
parts = re.split(r'Prisma Model:\s*', ERD)
print(f"[info] ERD splits into {len(parts)-1} model entries", file=sys.stderr)

# For each model entry, extract: model name, columns (name + type + nullable), table name (snake_case)
TYPE_MAP = {
    'UUID': 'String',
    'uuid': 'String',
    'timestamptz': 'DateTime',
    'timestamp': 'DateTime',
    'date': 'DateTime',
    'time': 'String',
    'integer': 'Int',
    'int': 'Int',
    'bigint': 'BigInt',
    'smallint': 'Int',
    'boolean': 'Boolean',
    'bool': 'Boolean',
    'text': 'String',
    'varchar': 'String',
    'char': 'String',
    'numeric': 'Decimal',
    'decimal': 'Decimal',
    'double': 'Float',
    'real': 'Float',
    'json': 'Json',
    'jsonb': 'Json',
    'bytea': 'Bytes',
    'interval': 'Int',
    'inet': 'String',
}

def map_type(t):
    # enum types stay PascalCase; scalar types map per above
    t = t.strip()
    if not t:
        return 'String'
    # varchar(N) → String
    m = re.match(r'(\w+)\s*\(\s*\d+\s*(?:,\s*\d+\s*)?\)', t)
    if m:
        t = m.group(1)
    if t in TYPE_MAP:
        return TYPE_MAP[t]
    if t.startswith('varchar') or t.startswith('char'):
        return 'String'
    # Looks like enum (PascalCase)
    if re.match(r'^[A-Z][a-zA-Z]+$', t):
        return t
    return 'String'

def to_camel(s):
    parts = re.split(r'[_\s]+', s.strip())
    return parts[0].lower() + ''.join(p.capitalize() for p in parts[1:])

def parse_entry(entry):
    # First line: ModelName | Aggregate: X
    m = re.match(r'\s*(\w+)\s*\|\s*Aggregate:\s*([\w/]+)', entry)
    if not m:
        return None
    model_name = m.group(1)
    aggregate = m.group(2)

    # Find Columns section
    cols_match = re.search(r'Columns\s*\n(.*?)(?=\n\s*Indexes|\n\s*Foreign Keys|\n\s*Constraints|\n\s*Check|\n\s*Prisma Model:|\Z)', entry, re.S | re.I)
    columns = []
    if cols_match:
        cols_text = cols_match.group(1)
        # Column rows look like: name type NO/YES key desc
        # They are inside a table — extract lines that look like data rows
        for line in cols_text.split('\n'):
            line = line.strip()
            if not line or set(line) <= set('- '):
                continue
            # Skip header row
            if line.startswith('Column') or line.startswith('---'):
                continue
            # Try to split on whitespace; first col = name, second = type, third = nullable
            tokens = line.split()
            if len(tokens) < 2:
                continue
            col_name = tokens[0]
            col_type = tokens[1]
            if col_name in ('school_id', 'branch_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at', 'deleted_by', 'id'):
                # Skip audit columns — handled separately
                continue
            nullable = 'YES' if (len(tokens) > 2 and tokens[2] == 'YES') else 'NO'
            columns.append((col_name, col_type, nullable))

    # Foreign Keys
    fks = []
    fk_match = re.search(r'Foreign Keys\s*\n(.*?)(?=\n\s*Indexes|\n\s*Constraints|\n\s*Check|\n\s*Prisma Model:|\Z)', entry, re.S | re.I)
    if fk_match:
        for line in fk_match.group(1).split('\n'):
            line = line.strip()
            if not line or set(line) <= set('- '): continue
            # Pattern: col,table(col) ON DELETE X
            m = re.match(r'(\w+),(\w+)\((\w+)\)', line)
            if m:
                fks.append((m.group(1), m.group(2), m.group(3)))

    # Indexes (we will emit @@index for each)
    idxs = []
    idx_match = re.search(r'Indexes\s*\n(.*?)(?=\n\s*Foreign Keys|\n\s*Constraints|\n\s*Prisma Model:|\Z)', entry, re.S | re.I)
    if idx_match:
        for line in idx_match.group(1).split('\n'):
            line = line.strip()
            if not line or set(line) <= set('- '): continue
            tokens = line.split()
            if len(tokens) < 2: continue
            idx_name = tokens[0]
            if idx_name.endswith('_idx'):
                col_part = idx_name[:-4]
                # strip table prefix
                col_part = re.sub(r'^[a-z_]+?_', '', col_part, count=1)
                idxs.append(col_part)

    return {
        'name': model_name,
        'aggregate': aggregate,
        'columns': columns,
        'fks': fks,
        'idxs': idxs,
    }

models = []
for entry in parts[1:]:
    m = parse_entry(entry)
    if m:
        models.append(m)

print(f"[info] Parsed {len(models)} ERD models", file=sys.stderr)
missing = [m for m in models if m['name'] not in existing]
print(f"[info] Missing models to emit: {len(missing)}", file=sys.stderr)

# Emit Prisma blocks
def emit(m):
    lines = []
    table_name = re.sub(r'([a-z])([A-Z])', r'\1_\2', m['name']).lower() + 's'
    lines.append(f'// MODEL: {table_name} (per ERD v3.0, aggregate={m["aggregate"]})')
    lines.append(f'model {m["name"]} {{')
    lines.append(f'  id        String   @id @default(uuid())')
    lines.append(f'  schoolId  String')
    lines.append(f'  branchId  String?')
    # FK columns
    fk_cols = {f[0] for f in m['fks']}
    seen_cols = set()
    for col_name, col_type, nullable in m['columns']:
        if col_name in seen_cols:
            continue
        seen_cols.add(col_name)
        # Convert snake_case to camelCase
        camel = to_camel(col_name)
        ptype = map_type(col_type)
        if col_name in fk_cols:
            # FK column → use String type, will be referenced in relations
            pass
        suffix = '?' if nullable == 'YES' else ''
        lines.append(f'  {camel:<22} {ptype}{suffix}')
    # Audit columns
    lines.append(f'  createdAt DateTime @default(now())')
    lines.append(f'  createdBy String?')
    lines.append(f'  updatedAt DateTime @updatedAt')
    lines.append(f'  updatedBy String?')
    lines.append(f'  deletedAt DateTime?')
    lines.append(f'  deletedBy String?')
    lines.append(f'  version   Int      @default(1)')
    # Relations for FKs (skip school/branch to avoid duplicate relation defs)
    rel_targets = set()
    for col, tbl, ref in m['fks']:
        if col in ('school_id', 'branch_id'):
            continue
        # Convert table snake_case to PascalCase model name
        model_ref = ''.join(p.capitalize() for p in tbl.split('_'))
        if model_ref in existing or model_ref in {x['name'] for x in models}:
            camel = to_camel(col)
            rel_name = model_ref
            if rel_name in rel_targets:
                continue
            rel_targets.add(rel_name)
            lines.append(f'  {rel_name:<22} {rel_name}? @relation(fields: [{camel}], references: [id])')
    # Indexes
    for idx in m['idxs'][:5]:
        # convert snake_case idx cols to camelCase list
        cols = [to_camel(c) for c in idx.split('_') if c]
        if cols and all(c for c in cols):
            lines.append(f'  @@index([{", ".join(cols)}])')
    lines.append(f'  @@index([schoolId])')
    lines.append(f'  @@index([schoolId, deletedAt])')
    lines.append(f'  @@map("{table_name}")')
    lines.append(f'}}')
    return '\n'.join(lines)

out_blocks = [emit(m) for m in missing]
Path('/home/z/my-project/scripts/missing_models.prisma').write_text('\n\n'.join(out_blocks) + '\n')
print(f"[info] Wrote /home/z/my-project/scripts/missing_models.prisma", file=sys.stderr)
print(f"[info] Output size: {sum(len(b) for b in out_blocks)} chars", file=sys.stderr)
