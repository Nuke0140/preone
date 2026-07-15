"""
Find the columns data dictionary table for 'student' entity.
Based on doc structure: each table's columns appear in the table immediately AFTER
a "Columns" Heading 4 marker that follows the entity's Purpose paragraph.

Strategy: scan paragraph index, find 'student' purpose, then locate the next
columns/indexes table sequence.
"""
import json

with open("/home/z/my-project/extracted/erd_tables.json") as f:
    tables = json.load(f)

# We expect column tables to have header ['Column', 'Type', 'Null', 'Key', 'Description']
# And index tables to have header ['Index Name', 'Columns', 'Type', 'Purpose']
# And inventory tables to have header ['Table', 'Prisma Model', 'Aggregate', 'Purpose']

# Find tables whose 1st row matches these patterns
column_tables = []
inventory_tables = []
index_tables = []

for i, t in enumerate(tables):
    if not t['rows']:
        continue
    h = t['rows'][0]
    if h == ['Column', 'Type', 'Null', 'Key', 'Description']:
        column_tables.append(i)
    elif h == ['Table', 'Prisma Model', 'Aggregate', 'Purpose']:
        inventory_tables.append(i)
    elif h == ['Index Name', 'Columns', 'Type', 'Purpose']:
        index_tables.append(i)

print(f"Column dictionary tables: {len(column_tables)}")
print(f"Inventory tables: {len(inventory_tables)}")
print(f"Index tables: {len(index_tables)}")
print()

# Print the column tables for the first few entities (Platform Mgmt domain)
# These should match the order in the document
print("=== First 5 Column tables (Platform Management domain) ===\n")
for i, idx in enumerate(column_tables[:5]):
    print(f"--- Column Table #{idx:03d} (rows={len(tables[idx]['rows'])}) ---")
    for r in tables[idx]['rows']:
        print("  | " + " | ".join(r))
    print()
