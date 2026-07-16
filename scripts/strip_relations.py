#!/usr/bin/env python3
"""
Drop @relation(...) annotations from generated models, leaving plain FK columns.
This avoids the need for inverse-relation fields on every referenced model.
"""
import re
from pathlib import Path

SCHEMA = Path('/home/z/my-project/preone/packages/database/prisma/schema.prisma')
src = SCHEMA.read_text()

# Also: rename `Route` (existing) ↔ TransportRoute conflict.
# Existing model Route uses @@map("transport_routes") — and TransportRoute (new) also maps to transport_routes.
# Drop the new TransportRoute model entirely since Route already covers it.

# Find TransportRoute model block and remove it.
def remove_model(src, name):
    pat = r'// MODEL: \w+\s*\(per ERD v3\.0.*?\)\nmodel\s+' + name + r'\s*\{.*?\n\}\n*'
    pattern = re.compile(pat, re.S)
    return pattern.sub('', src)

# Remove the duplicate model
src = remove_model(src, 'TransportRoute')

# Now strip @relation(...) lines but keep the FK column
# Pattern: ^ <field> <Model>? @relation(fields: [col], references: [id])$
# We replace with nothing (drop the relation field entirely; the FK column was already emitted)
src = re.sub(
    r'^\s+\w+\s+[A-Z]\w+(?:\?|\[\])?\s+@relation\([^)]*\)[^\n]*\n',
    '',
    src,
    flags=re.M
)

SCHEMA.write_text(src)
print(f"[info] Done. Wrote {SCHEMA}")
