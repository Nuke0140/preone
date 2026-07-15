"""
Print key tables from BTD:
- #002 Component catalog
- #004 Module catalog
- #005 Directory responsibilities
- #006 Dependency rules
- #012 Command catalog
- #013 Query catalog
- #014 Domain event catalog
- #015 Integration events
- #016 BullMQ queue catalog
- #018 Cache layers
- #022 Exception types
- #024 Security controls
- #027 Error response fields
- #031 Test pyramid
- #033 SLOs
- #034 Performance tactics
- #035 Deployment topology
"""
import json

with open("/home/z/my-project/extracted/btd_tables.json") as f:
    tables = json.load(f)

selected = [2, 4, 5, 6, 12, 13, 14, 15, 16, 18, 22, 24, 27, 31, 33, 34, 35]
for idx in selected:
    t = tables[idx]
    print(f"\n=== TABLE #{idx:03d} (rows={len(t['rows'])}, cols={len(t['rows'][0]) if t['rows'] else 0}) ===")
    for r in t['rows']:
        rr = [str(c)[:100] for c in r]
        print("  | " + " | ".join(rr))
