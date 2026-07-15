"""
Print column-level data for key tables to verify schema depth:
- student (most important entity)
- invoice (finance core)
- attendance (operations core)
- audit_log (compliance)
- application (admissions)
"""
import json

with open("/home/z/my-project/extracted/erd_tables.json") as f:
    tables = json.load(f)

print(f"Total tables in JSON: {len(tables)}")
print()

# Look at table #013 (which we saw is 12 rows, 5 cols - probably the school_subscription columns)
# Let me check several tables in sequence

# First, print headers + first 2 rows of first 25 tables to understand layout
print("=== Tables 011-030 (first 3 rows each) ===\n")
for i in range(11, 31):
    t = tables[i]
    print(f"--- Table #{i:03d} (rows={len(t['rows'])}) ---")
    for j, r in enumerate(t['rows'][:3]):
        print(f"  R{j}: {r}")
    print()
