"""
Print specific high-value summary tables:
- #671: Prisma model count by domain
- #672: Migration waves
- #675: Sizing projections
- #676: Top 20 heaviest tables
- #677: Archival policy
- #678: Glossary
- #001: Document references
- #002: Version history
- #003: RPO/RTO
- #009: DPDP section mapping
- #011: Platform Management inventory
- #030: Core (Auth) inventory
"""
import json

with open("/home/z/my-project/extracted/erd_tables.json") as f:
    tables = json.load(f)

# Print all rows for selected tables
selected = [1, 2, 3, 9, 671, 672, 675, 676, 677, 678]
for idx in selected:
    t = tables[idx]
    print(f"\n=== TABLE #{idx:03d} (rows={len(t['rows'])}, cols={len(t['rows'][0]) if t['rows'] else 0}) ===")
    for r in t['rows']:
        # truncate long cells
        rr = [str(c)[:90] for c in r]
        print("  | " + " | ".join(rr))
