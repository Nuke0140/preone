#!/usr/bin/env python3
"""
Post-process the extended schema.prisma to fix validation errors.
"""
import re
from pathlib import Path

SCHEMA = Path('/home/z/my-project/preone/packages/database/prisma/schema.prisma')
src = SCHEMA.read_text()

# --- 1) Rename models that collide with existing enum names ---
conflicts = ['LeadSource', 'EmploymentType', 'LeaveType', 'ReviewCycle', 'AssetCategory']
for name in conflicts:
    pattern = re.compile(rf'^model\s+{name}\s*\{{', re.M)
    src = pattern.sub(f'model {name}Tbl {{', src)

# --- 2) Collect *missing* enum names referenced as field types ---
existing_enums = set(re.findall(r'^enum\s+(\w+)\s*\{', src, re.M))
existing_models = set(re.findall(r'^model\s+(\w+)\s*\{', src, re.M))
all_models = existing_models | {n+'Tbl' for n in conflicts}

# A "type reference" is a token that follows a field name. We only want PascalCase
# tokens (uppercase first letter, lowercase rest, no underscore).
# Pattern: ^ <field_name> <Type> <?|[]?> ... @...
# Restrict Type to PascalCase: [A-Z][a-z]+([A-Z][a-z]+)*
field_type_re = re.compile(
    r'^\s+[a-z]\w*\s+([A-Z][a-zA-Z]+)(\?|\[\])?\s*(?:@|$)',
    re.M
)
referenced_types = set()
for m in field_type_re.finditer(src):
    referenced_types.add(m.group(1))

prisma_builtins = {'String', 'Int', 'BigInt', 'Boolean', 'DateTime', 'Json', 'Float', 'Decimal', 'Bytes'}
missing_enums = sorted(referenced_types - existing_enums - all_models - prisma_builtins)
print(f"[info] Missing enums to add: {len(missing_enums)}")
print(f"[info] Sample: {missing_enums[:15]}")

enum_block = ['\n// AUTO-GENERATED FALLBACK ENUMS (Wave 13) — placeholder for ERD v3.0 enums not yet defined\n']
for e in missing_enums:
    enum_block.append(f'enum {e} {{\n  PLACEHOLDER\n}}\n')
src += '\n'.join(enum_block) + '\n'

# --- 3) Drop @@index / @@unique that reference relation fields ---
def get_models(src):
    for m in re.finditer(r'^model\s+(\w+)\s*\{', src, re.M):
        name = m.group(1)
        start = m.start()
        depth = 0
        i = m.end() - 1
        while i < len(src):
            c = src[i]
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
            i += 1
        yield name, start, end, src[start:end]

def clean_indexes(model_body, all_models):
    rel_fields = set()
    for m in re.finditer(r'^\s+(\w+)\s+\w+(\?|\[\])?\s+@relation', model_body, re.M):
        rel_fields.add(m.group(1))
    for m in re.finditer(r'^\s+(\w+)\s+([A-Z][a-zA-Z]+)(\?|\[\])?\s*$', model_body, re.M):
        if m.group(2) in all_models:
            rel_fields.add(m.group(1))
    def drop_bad_attr(match):
        attr = match.group(0)
        inner = re.search(r'\[([^\]]+)\]', attr)
        if not inner:
            return attr
        fields = [f.strip() for f in inner.group(1).split(',')]
        for f in fields:
            if f in rel_fields:
                return ''
        return attr
    new_body = re.sub(r'^\s+@@index\([^)]+\]\)\s*$\n', drop_bad_attr, model_body, flags=re.M)
    new_body = re.sub(r'^\s+@@unique\([^)]+\]\)\s*$\n', drop_bad_attr, new_body, flags=re.M)
    return new_body

new_src_parts = []
last = 0
for name, start, end, body in get_models(src):
    new_src_parts.append(src[last:start])
    new_body = clean_indexes(body, all_models)
    new_src_parts.append(new_body)
    last = end
new_src_parts.append(src[last:])
src = ''.join(new_src_parts)

# --- 4) Drop @default/@map on relation field lines ---
def clean_relation_attrs(match):
    line = match.group(0)
    line = re.sub(r'\s+@default\([^)]*\)', '', line)
    line = re.sub(r'\s+@map\("[^"]*"\)', '', line)
    return line

src = re.sub(
    r'^\s+\w+\s+[A-Z]\w+(?:\?|\[\])?\s+@relation\([^)]*\)[^\n]*$',
    clean_relation_attrs,
    src,
    flags=re.M
)

SCHEMA.write_text(src)
print(f"[info] Wrote {SCHEMA}")
