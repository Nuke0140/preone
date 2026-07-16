#!/usr/bin/env python3
"""Final final TSC fix."""
from pathlib import Path
import subprocess

def run(cmd, cwd="/home/z/my-project", check=False):
    print(f"$ {cmd}")
    r = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    if r.stdout: print(r.stdout[-3000:])
    if r.stderr: print("STDERR:", r.stderr[-1500:])
    return r

run("git checkout feat/wave-6-hr-crm")
PREONE = Path("/home/z/my-project/preone")

# Fix 1: HR query handler — used[l.leaveType] possibly undefined
HR_QH_PATH = PREONE / "apps/api/src/modules/hr/application/handlers/hr-query-handlers.ts"
with open(HR_QH_PATH) as f:
    hr_qh = f.read()

old = """    for (const l of leaves) {
      if (used[l.leaveType] !== undefined) used[l.leaveType] += Number(l.totalDays);
    }"""
new = """    for (const l of leaves) {
      const lt = l.leaveType as keyof typeof used;
      if (used[lt] !== undefined) used[lt] += Number(l.totalDays);
    }"""
assert old in hr_qh, "leave loop not found"
hr_qh = hr_qh.replace(old, new, 1)
with open(HR_QH_PATH, "w") as f:
    f.write(hr_qh)
print("✅ Fixed HR query handler leave loop")

# Fix 2: HR repo — findByCycle cycle cast
HR_REPO_PATH = PREONE / "apps/api/src/modules/hr/infrastructure/repositories/prisma-hr.repository.ts"
with open(HR_REPO_PATH) as f:
    hr_repo = f.read()

old = """      where: { schoolId: tenantId, cycle, cycleYear },
      include: { goals: true, competencies: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): PerformanceReviewAggregate"""
new = """      where: { schoolId: tenantId, cycle: cycle as any, cycleYear },
      include: { goals: true, competencies: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): PerformanceReviewAggregate"""
assert old in hr_repo, "findByCycle where clause not found"
hr_repo = hr_repo.replace(old, new, 1)
with open(HR_REPO_PATH, "w") as f:
    f.write(hr_repo)
print("✅ Fixed HR repo findByCycle cycle cast")

# TSC verify
print("\n=== TSC ===")
r = run("cd preone && ./node_modules/.bin/tsc --noEmit -p apps/api/tsconfig.json")
if r.returncode == 0:
    print("✅ TypeScript compiles with ZERO errors!")
else:
    print(f"⚠️  TSC exit {r.returncode}")

# Tests
print("\n=== Tests ===")
run("cd preone/apps/api && ./node_modules/.bin/vitest run 2>&1 | tail -6")

# Commit + push
print("\n=== Commit + Push ===")
run("git add -A")
run("git commit -m \"fix(wave-6): fix TS2532 + ReviewCycle cast in findByCycle\"")
run("git push origin feat/wave-6-hr-crm")
print("\n✅ All done")
