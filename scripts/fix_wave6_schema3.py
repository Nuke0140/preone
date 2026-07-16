#!/usr/bin/env python3
"""Add School back-relations + commit + push + verify."""
from pathlib import Path
import subprocess

def run(cmd, cwd="/home/z/my-project", check=False):
    print(f"$ {cmd}")
    r = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    if r.stdout: print(r.stdout[-3000:])
    if r.stderr: print("STDERR:", r.stderr[-1500:])
    if check and r.returncode != 0:
        raise RuntimeError(f"Failed: {cmd}")
    return r

run("git checkout feat/wave-6-hr-crm")

SCHEMA = Path("/home/z/my-project/preone/packages/database/prisma/schema.prisma")
with open(SCHEMA) as f:
    content = f.read()

# Add School back-relations — find the Wave 5 Finance block end + insert before @@index([status])
old_school_end = """  messageReadReceipts MessageReadReceipt[]

  @@index([status])
  @@index([tier])
  @@index([createdAt])
  @@map("schools")"""

new_school_end = """  messageReadReceipts MessageReadReceipt[]

  // ─── Wave 6 back-relations (HR) ───
  employees              Employee[]
  employeeQualifications EmployeeQualification[]
  employeeDocuments      EmployeeDocument[]
  leaveRequests          LeaveRequest[]
  leaveBalances          LeaveBalance[]
  payrollRuns            PayrollRun[]
  payslips               Payslip[]
  performanceReviews     PerformanceReview[]
  reviewGoals            ReviewGoal[]
  reviewCompetencies     ReviewCompetency[]
  employeeAttendances    EmployeeAttendance[]

  // ─── Wave 6 back-relations (CRM) ───
  leads                    Lead[]
  campaigns                Campaign[]
  followUps                FollowUp[]
  leadTags                 LeadTag[]
  leadActivities           LeadActivity[]
  campaignTemplates        CampaignTemplate[]
  campaignAudienceSegments CampaignAudienceSegment[]
  counsellorTargets        CounsellorTarget[]

  @@index([status])
  @@index([tier])
  @@index([createdAt])
  @@map("schools")"""

if old_school_end in content:
    content = content.replace(old_school_end, new_school_end, 1)
    with open(SCHEMA, "w") as f:
        f.write(content)
    print("✅ Added School back-relations")
else:
    print("❌ School block not found — may already be edited")
    # Check if already added
    if "campaignAudienceSegments CampaignAudienceSegment[]" in content:
        print("School back-relations already present")

# Validate + Generate + tsc + test
print("\n=== Validate ===")
run("cd preone/packages/database && ./node_modules/.bin/prisma validate --schema prisma/schema.prisma")
print("\n=== Generate ===")
run("cd preone/packages/database && ./node_modules/.bin/prisma generate --schema prisma/schema.prisma")
print("\n=== TSC ===")
run("cd preone && ./node_modules/.bin/tsc --noEmit -p apps/api/tsconfig.json")
print("\n=== Tests ===")
run("cd preone/apps/api && ./node_modules/.bin/vitest run 2>&1 | tail -10")

# Commit + push
print("\n=== Commit + Push ===")
run("git add -A")
run("git commit -m \"fix(wave-6): add School/Branch/Employee back-relations + fix Lead ambiguous relations + employeeCount getter\"")
run("git push origin feat/wave-6-hr-crm")

print("\n✅ All done")
