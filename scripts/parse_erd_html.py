#!/usr/bin/env python3
"""
Parse ERD v3.0 HTML (pandoc output) and emit Prisma model blocks for every
ERD-defined model that is *not* already present in the current schema.

Strategy:
  - Walk the HTML linearly; track <h1>/<h2>/<h3> to know current section.
  - When we see "Prisma Model: NAME | Aggregate: AGG" text, the *next*
    three <table> elements are Columns, Indexes, Foreign Keys.
  - Parse each table by walking its <tr> rows.
"""
import re, sys
from html.parser import HTMLParser
from pathlib import Path

ERD_HTML = Path('/tmp/erd.html').read_text()
CURRENT_SCHEMA = Path('/home/z/my-project/preone/packages/database/prisma/schema.prisma').read_text()

existing_models = set(re.findall(r'^model\s+(\w+)\s*\{', CURRENT_SCHEMA, re.M))
existing_enums = set(re.findall(r'^enum\s+(\w+)\s*\{', CURRENT_SCHEMA, re.M))
print(f"[info] Existing models: {len(existing_models)}", file=sys.stderr)

TYPE_MAP = {
    'UUID': 'String', 'uuid': 'String',
    'timestamptz': 'DateTime', 'timestamp': 'DateTime', 'date': 'DateTime', 'time': 'String',
    'integer': 'Int', 'int': 'Int', 'bigint': 'BigInt', 'smallint': 'Int', 'serial': 'Int', 'bigserial': 'BigInt',
    'boolean': 'Boolean', 'bool': 'Boolean',
    'text': 'String', 'varchar': 'String', 'char': 'String', 'citext': 'String',
    'numeric': 'Decimal', 'decimal': 'Decimal', 'double': 'Float', 'real': 'Float', 'double precision': 'Float',
    'json': 'Json', 'jsonb': 'Json', 'bytea': 'Bytes',
    'interval': 'Int', 'inet': 'String', 'cidr': 'String', 'macaddr': 'String',
    'uuid[]': 'String[]',
    'tsvector': 'String',
    'money': 'Int',  # treat as cents
}

def map_type(t):
    t = t.strip()
    if not t:
        return 'String'
    m = re.match(r'(\w+)\s*\(\s*\d+\s*(?:,\s*\d+\s*)?\)', t)
    if m:
        t = m.group(1)
    if t in TYPE_MAP:
        return TYPE_MAP[t]
    if t.startswith('varchar') or t.startswith('char') or t.startswith('text'):
        return 'String'
    if re.match(r'^[A-Z][a-zA-Z]+$', t):
        return t  # enum
    return 'String'

def to_camel(s):
    s = s.strip()
    parts = re.split(r'[_\s]+', s)
    return parts[0].lower() + ''.join(p.capitalize() for p in parts[1:])

# --- Tiny HTML table walker ---
class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.cur_row = []
        self.cur_cell = ''
        self.tables = []  # list of list-of-rows (each row is list-of-cell-strings)
        self.cur_table = None
    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.in_table = True
            self.cur_table = []
        elif self.in_table and tag == 'tr':
            self.in_row = True
            self.cur_row = []
        elif self.in_row and tag in ('td', 'th'):
            self.in_cell = True
            self.cur_cell = ''
    def handle_endtag(self, tag):
        if tag == 'table' and self.in_table:
            self.in_table = False
            if self.cur_table is not None:
                self.tables.append(self.cur_table)
            self.cur_table = None
        elif self.in_table and tag == 'tr' and self.in_row:
            self.in_row = False
            if self.cur_table is not None and self.cur_row:
                self.cur_table.append(self.cur_row)
            self.cur_row = []
        elif self.in_row and tag in ('td', 'th') and self.in_cell:
            self.in_cell = False
            self.cur_row.append(self.cur_cell.strip())
            self.cur_cell = ''
    def handle_data(self, data):
        if self.in_cell:
            self.cur_cell += data

def parse_all_tables(html):
    p = TableParser()
    p.feed(html)
    return p.tables

# Find every "Prisma Model: NAME | Aggregate: AGG" location
model_pattern = re.compile(r'Prisma Model:\s*(\w+)\s*\|\s*Aggregate:\s*([\w/]+)')

# Build a list of (model_name, aggregate, char_offset)
model_starts = []
for m in model_pattern.finditer(ERD_HTML):
    model_starts.append((m.group(1), m.group(2), m.start()))
print(f"[info] Found {len(model_starts)} model markers", file=sys.stderr)

# For each model, find the next 3 tables within reasonable distance (say 50000 chars)
all_tables = parse_all_tables(ERD_HTML)
# Build a list of (table_start_offset, table_rows) so we can binary search
# Use simpler approach: for each model, search for the next 3 <table> start positions after the marker.
table_starts = [m.start() for m in re.finditer(r'<table', ERD_HTML)]
print(f"[info] Found {len(all_tables)} tables; {len(table_starts)} <table> tags", file=sys.stderr)

import bisect

def next_tables_after(offset, n=3, max_dist=200000):
    out = []
    i = bisect.bisect_right(table_starts, offset)
    while i < len(table_starts) and len(out) < n:
        ts = table_starts[i]
        if ts - offset > max_dist:
            break
        # Find which table index this is
        out.append(all_tables[i])
        i += 1
    return out

def parse_columns_table(table):
    """Returns list of (col_name, col_type, nullable, key)"""
    cols = []
    for row in table[1:]:  # skip header
        if len(row) < 3:
            continue
        name = row[0].strip()
        if not name or name.lower() == 'column':
            continue
        col_type = row[1].strip()
        nullable = row[2].strip()
        key = row[3].strip() if len(row) > 3 else ''
        cols.append((name, col_type, nullable, key))
    return cols

def parse_indexes_table(table):
    """Returns list of (index_name, columns_csv, type)"""
    idxs = []
    for row in table[1:]:
        if len(row) < 2:
            continue
        name = row[0].strip()
        if not name or name.lower() == 'index name':
            continue
        cols = row[1].strip()
        idx_type = row[2].strip() if len(row) > 2 else 'btree'
        idxs.append((name, cols, idx_type))
    return idxs

def parse_fks_table(table):
    """Returns list of (col_name, ref_table, ref_col)"""
    fks = []
    for row in table[1:]:
        if len(row) < 2:
            continue
        cell = row[0].strip()
        # Pattern: col_name,ref_table(ref_col)
        m = re.match(r'(\w+),(\w+)\((\w+)\)', cell)
        if m:
            fks.append((m.group(1), m.group(2), m.group(3)))
        else:
            # Pattern: "col → ref_table(ref_col)"
            m = re.search(r'(\w+)\s*→\s*(\w+)\((\w+)\)', cell)
            if m:
                fks.append((m.group(1), m.group(2), m.group(3)))
    return fks

# Also: gather FK info from the "Foreign Keys" text block if table parse fails
def parse_fks_from_text(text):
    fks = []
    for m in re.finditer(r'(\w+)\s*,\s*(\w+)\s*\(\s*(\w+)\s*\)', text):
        fks.append((m.group(1), m.group(2), m.group(3)))
    for m in re.finditer(r'(\w+)\s*→\s*(\w+)\s*\(\s*(\w+)\s*\)', text):
        fks.append((m.group(1), m.group(2), m.group(3)))
    return fks

models_data = []
for name, agg, offset in model_starts:
    tables = next_tables_after(offset, n=3, max_dist=200000)
    cols, idxs, fks = [], [], []
    if tables:
        cols = parse_columns_table(tables[0])
        if len(tables) > 1:
            idxs = parse_indexes_table(tables[1])
        if len(tables) > 2:
            fks = parse_fks_table(tables[2])
    # Fallback: also scan text between model marker and next marker
    end = None
    nxt_i = bisect.bisect_right([s[2] for s in model_starts], offset)
    if nxt_i < len(model_starts):
        end = model_starts[nxt_i][2]
    else:
        end = offset + 50000
    text_block = ERD_HTML[offset:end]
    if not fks:
        fks = parse_fks_from_text(text_block)
    models_data.append({'name': name, 'aggregate': agg, 'columns': cols, 'indexes': idxs, 'fks': fks})

print(f"[info] Parsed {len(models_data)} models with columns/idxs/fks", file=sys.stderr)

# Stats: how many models have columns
n_with_cols = sum(1 for m in models_data if m['columns'])
print(f"[info] Models with columns: {n_with_cols}", file=sys.stderr)

# Skip models that conflict with existing enum names — rename by appending Tbl
conflict_names = {'LeadSource', 'EmploymentType', 'LeaveType', 'ReviewCycle', 'AssetCategory'}

missing = [m for m in models_data if m['name'] not in existing_models]
print(f"[info] Missing models to emit (pre-skip): {len(missing)}", file=sys.stderr)
# Skip models whose name conflicts with an existing enum — rename them
for m in missing:
    if m['name'] in conflict_names:
        m['name'] = m['name'] + 'Tbl'
# Skip TransportRoute entirely (Route already covers it — same @@map target)
missing = [m for m in missing if m['name'] != 'TransportRoute']
print(f"[info] Missing models to emit (final): {len(missing)}", file=sys.stderr)

# Emit
def emit(m):
    lines = []
    table_name = re.sub(r'([a-z])([A-Z])', r'\1_\2', m['name']).lower() + 's'
    lines.append(f'// MODEL: {table_name} (per ERD v3.0, aggregate={m["aggregate"]})')
    lines.append(f'model {m["name"]} {{')
    lines.append(f'  id        String   @id @default(uuid())')
    lines.append(f'  schoolId  String')
    lines.append(f'  branchId  String?')
    fk_cols = {f[0] for f in m['fks']}
    audit_cols = {'school_id', 'branch_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at', 'deleted_by', 'id', 'version'}
    seen = set()
    rels = []  # (field_name, target_model)
    for col_name, col_type, nullable, key in m['columns']:
        if col_name in audit_cols or col_name in seen:
            continue
        seen.add(col_name)
        camel = to_camel(col_name)
        ptype = map_type(col_type)
        suffix = '?' if nullable == 'YES' else ''
        lines.append(f'  {camel:<24} {ptype}{suffix}')
    # Audit columns
    lines.append(f'  createdAt DateTime @default(now())')
    lines.append(f'  createdBy String?')
    lines.append(f'  updatedAt DateTime @updatedAt')
    lines.append(f'  updatedBy String?')
    lines.append(f'  deletedAt DateTime?')
    lines.append(f'  deletedBy String?')
    lines.append(f'  version   Int      @default(1)')
    # Emit FK columns as plain String? (no @relation — avoids inverse-field requirement)
    # This keeps new models self-contained and doesn't require patching existing models.
    fk_emitted = set()
    for col, tbl, ref in m['fks']:
        if col in audit_cols or col in fk_emitted:
            continue
        fk_emitted.add(col)
        camel = to_camel(col)
        if col not in seen:
            lines.append(f'  {camel:<24} String?')
            seen.add(col)
    # Indexes
    seen_idx = set()
    for idx_name, idx_cols, idx_type in m['indexes'][:8]:
        # Strip table prefix from index name to derive column list
        # Index name pattern: <table>_<cols>_idx OR <table>_<cols>_uidx
        cols_csv = idx_cols.strip()
        if not cols_csv:
            continue
        col_list = [c.strip() for c in cols_csv.split(',')]
        camel_list = []
        for c in col_list:
            if not c:
                continue
            if c in audit_cols:
                continue
            camel_list.append(to_camel(c))
        if not camel_list:
            continue
        key = tuple(camel_list)
        if key in seen_idx:
            continue
        seen_idx.add(key)
        # Skip if any camel field not emitted
        if all(c in seen for c in camel_list):
            joined = ', '.join(camel_list)
            lines.append(f'  @@index([{joined}])')
    lines.append(f'  @@index([schoolId])')
    lines.append(f'  @@index([schoolId, deletedAt])')
    lines.append(f'  @@map("{table_name}")')
    lines.append(f'}}')
    return '\n'.join(lines)

out_blocks = [emit(m) for m in missing]
Path('/home/z/my-project/scripts/missing_models.prisma').write_text('\n\n'.join(out_blocks) + '\n')
print(f"[info] Wrote missing_models.prisma ({sum(len(b) for b in out_blocks)} chars)", file=sys.stderr)
