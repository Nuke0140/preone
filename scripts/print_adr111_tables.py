"""
Print key tables from ADR-111:
- #002 Tech stack
- #003 Docker images
- #004 K8s namespaces
- #005 CI/CD stages
- #012 SLO metrics
- #014 Security controls
- #015 Scalability tactics
- #016 Final production stack
- #017 Stack decisions
- #018 Decision drivers
"""
import json

with open("/home/z/my-project/extracted/adr111_tables.json") as f:
    tables = json.load(f)

selected = [2, 3, 4, 5, 6, 7, 8, 12, 14, 15, 16, 17, 18]
for idx in selected:
    t = tables[idx]
    print(f"\n=== TABLE #{idx:03d} (rows={len(t['rows'])}, cols={len(t['rows'][0]) if t['rows'] else 0}) ===")
    for r in t['rows']:
        rr = [str(c)[:120] for c in r]
        print("  | " + " | ".join(rr))
