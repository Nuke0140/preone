#!/usr/bin/env python3
"""Fix Employee.userId @unique + regenerate + verify + commit."""
from pathlib import Path
import subprocess

def run(cmd, cwd="/home/z/my-project", check=False):
    print(f"$ {cmd}")
    r = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    if r.stdout: print(r.stdout[-3000:])
    if r.stderr: print("STDERR:", r.stderr[-1500:])
    return r

run("git checkout feat/wave-6-hr-crm")

SCHEMA = Path("/home/z/my-project/preone/packages/database/prisma/schema.prisma")
with open(SCHEMA) as f:
    content = f.read()

# Fix Employee.userId to be @unique (1-to-1 relation with User.employeeProfile)
old = "  userId                 String?       @map(\"user_id\") @db.Uuid"
new = "  userId                 String?       @unique @map(\"user_id\") @db.Uuid"
assert old in content, "Employee.userId field not found"
content = content.replace(old, new, 1)
with open(SCHEMA, "w") as f:
    f.write(content)
print("✅ Added @unique to Employee.userId")

# Validate
print("\n=== Validate ===")
r = run("cd preone/packages/database && ./node_modules/.bin/prisma validate --schema prisma/schema.prisma")
if "Validation Error" in (r.stdout + r.stderr):
    print("❌ Schema still has errors")
else:
    print("✅ Schema valid")

# Generate
print("\n=== Generate ===")
run("cd preone/packages/database && ./node_modules/.bin/prisma generate --schema prisma/schema.prisma")

# TSC
print("\n=== TSC ===")
r = run("cd preone && ./node_modules/.bin/tsc --noEmit -p apps/api/tsconfig.json")
if r.returncode == 0:
    print("✅ TypeScript compiles with zero errors")
else:
    print(f"⚠️  TSC has errors (exit {r.returncode})")

# Tests
print("\n=== Tests ===")
run("cd preone/apps/api && ./node_modules/.bin/vitest run 2>&1 | tail -6")

# Commit + push
print("\n=== Commit + Push ===")
run("git add -A")
run("git commit -m \"fix(wave-6): add @unique to Employee.userId for 1-to-1 relation with User\"")
run("git push origin feat/wave-6-hr-crm")
print("\n✅ All done")
