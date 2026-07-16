#!/usr/bin/env python3
"""Add Wave 6 back-relations to School, Branch, Employee, Campaign models."""
from pathlib import Path
import subprocess

def run(cmd, cwd="/home/z/my-project"):
    print(f"$ {cmd}")
    r = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    if r.stdout: print(r.stdout[-3000:])
    if r.stderr: print("STDERR:", r.stderr[-1500:])
    return r

run("git checkout feat/wave-6-hr-crm")

SCHEMA = Path("/home/z/my-project/preone/packages/database/prisma/schema.prisma")
with open(SCHEMA) as f:
    content = f.read()

# ─── 1. Add Wave 6 back-relations to School model ───
old_school = """  scholarships        Scholarship[]
  scholarshipAwards   ScholarshipAward[]
  gstConfigs          GstConfig[]
  messageReadReceipts MessageReadReceipt[]

  @@index([status])"""
new_school = """  scholarships        Scholarship[]
  scholarshipAwards   ScholarshipAward[]
  gstConfigs          GstConfig[]
  messageReadReceipts MessageReadReceipt[]

  // ─── Wave 6 back-relations (HR) ───
  employees             Employee[]
  employeeQualifications EmployeeQualification[]
  employeeDocuments     EmployeeDocument[]
  leaveRequests         LeaveRequest[]
  leaveBalances         LeaveBalance[]
  payrollRuns           PayrollRun[]
  payslips              Payslip[]
  performanceReviews    PerformanceReview[]
  reviewGoals           ReviewGoal[]
  reviewCompetencies    ReviewCompetency[]
  employeeAttendances   EmployeeAttendance[]

  // ─── Wave 6 back-relations (CRM) ───
  leads                   Lead[]
  campaigns               Campaign[]
  followUps               FollowUp[]
  leadTags                LeadTag[]
  leadActivities          LeadActivity[]
  campaignTemplates       CampaignTemplate[]
  campaignAudienceSegments CampaignAudienceSegment[]
  counsellorTargets       CounsellorTarget[]

  @@index([status])"""
assert old_school in content, "School block not found"
content = content.replace(old_school, new_school, 1)
print("Added School back-relations")

# ─── 2. Add Wave 6 back-relations to Branch model ───
# First find a marker in Branch
old_branch_marker = """  @@index([status])
  @@index([tier])
  @@index([createdAt])"""
# Actually let me look for the Branch model's relation section
# Branch has branches? No — School has branches. Branch has users, classrooms, etc.

# Let me find Branch by looking for known marker
old_branch = """  @@index([status])
  @@index([tier])
  @@index([createdAt])"""
# Wait that's in School. Let me find Branch properly.

# Actually we already updated School's @@index([status]) block, so it's gone there.
# Let me look for Branch by another marker.
# From the schema, Branch has many relations including sectionTeachers, etc.

# Let me add the Wave 6 Branch back-relations using a different approach:
# insert before the closing of Branch model. Branch's relations end with specific patterns.

# Read the file again to find Branch
with open(SCHEMA) as f:
    content = f.read()

# Find Branch model and add back-relations before its closing brace
import re
# Branch model starts at line 280. Find it and its closing brace.
branch_start = content.find("model Branch {")
assert branch_start >= 0, "Branch model not found"
# Find the closing brace at the same indentation level
brace_pos = content.find("{", branch_start)
depth = 1
i = brace_pos + 1
while i < len(content) and depth > 0:
    if content[i] == "{":
        depth += 1
    elif content[i] == "}":
        depth -= 1
    i += 1
branch_end = i  # position after closing brace

# Find the @@index lines in Branch (typically the last lines before closing)
# Insert Wave 6 back-relations before the closing brace
# Look for the line just before closing brace
branch_content = content[branch_start:branch_end]

# Look for the last relation field in Branch (e.g., something like "  classrooms Classroom[]")
# We'll insert before the first @@index or @@unique line in Branch
import re as _re
match = _re.search(r'\n  @@', branch_content)
if match:
    insert_pos_in_branch = match.start()
    new_branch_rels = """
  // ─── Wave 6 back-relations (HR + CRM) ───
  employees   Employee[]
  payrollRuns PayrollRun[]
  leads       Lead[]
  campaigns   Campaign[]
"""
    new_branch_content = (
        branch_content[:insert_pos_in_branch]
        + new_branch_rels
        + branch_content[insert_pos_in_branch:]
    )
    content = content[:branch_start] + new_branch_content + content[branch_end:]
    print("Added Branch back-relations")
else:
    print("WARN: Could not find @@ index line in Branch model")

# ─── 3. Add back-relations to Employee model ───
# Employee needs: leaveRequests (as employee), substituteFor (as substitute),
# leaveBalances, payslips, employeeAttendances
# PerformanceReview relations (reviewsAsEmployee, reviewsAsReviewer, reviewsAsHr) are already in.

emp_marker = """  leaves                 LeaveRequest[]
  payrolls               Payslip[]
  reviewsAsEmployee      PerformanceReview[] @relation("ReviewEmployee")
  reviewsAsReviewer      PerformanceReview[] @relation("ReviewReviewer")
  reviewsAsHr            PerformanceReview[] @relation("ReviewHr")

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz"""

new_emp_marker = """  leaves                 LeaveRequest[]
  substituteFor          LeaveRequest[]       @relation("SubstituteFor")
  leaveBalances          LeaveBalance[]
  payrolls               Payslip[]
  employeeAttendances    EmployeeAttendance[]
  reviewsAsEmployee      PerformanceReview[] @relation("ReviewEmployee")
  reviewsAsReviewer      PerformanceReview[] @relation("ReviewReviewer")
  reviewsAsHr            PerformanceReview[] @relation("ReviewHr")

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz"""

assert emp_marker in content, "Employee relations block not found"
content = content.replace(emp_marker, new_emp_marker, 1)
print("Added Employee back-relations")

# ─── 4. Add back-relation to Campaign for FollowUp.campaign ───
# Campaign currently has `leads Lead[]`. Add `followUps FollowUp[]`
old_camp_rels = """  attributedRevenueCents Int              @default(0) @map("attributed_revenue_cents")
  leads                  Lead[]

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz"""
new_camp_rels = """  attributedRevenueCents Int              @default(0) @map("attributed_revenue_cents")
  leads                  Lead[]
  followUps              FollowUp[]

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz"""
assert old_camp_rels in content, "Campaign relations block not found"
content = content.replace(old_camp_rels, new_camp_rels, 1)
print("Added Campaign back-relation for FollowUp")

# ─── 5. Add back-relation to Lead for LeadActivity + FollowUp ───
# Lead currently has `followUps FollowUp[]` and `activities LeadActivity[]`. Already good.
# But need to verify - let me check the Lead schema section.
# Looking at my schema: Lead has `followUps FollowUp[]` and `activities LeadActivity[]` — already there.

# ─── 6. Add User back-relations: PayrollRun.approver (approvedPayrollRuns — already added),
# LeaveRequest.approver (approvedLeaves — already added but needs @relation name match)
# Check LeaveRequest.approver relation — currently:
#   approver User? @relation(fields: [approverId], references: [id])
# User-side: approvedLeaves LeaveRequest[] @relation("LeaveApprover")
# Mismatch! Either both have name or neither. Let me add name to LeaveRequest.approver.
old_leave_approver = "  approver   User?    @relation(fields: [approverId], references: [id])"
new_leave_approver = '  approver   User?    @relation("LeaveApprover", fields: [approverId], references: [id])'
assert old_leave_approver in content, "LeaveRequest.approver relation not found"
content = content.replace(old_leave_approver, new_leave_approver, 1)
print("Fixed LeaveRequest.approver relation name")

# Also fix LeaveRequest.substitute — needs @relation name matching User-side
# Actually, the User side doesn't have a substituteFor relation (it's on Employee).
# So LeaveRequest.substitute is an Employee relation.
old_leave_sub = "  substitute Employee? @relation(\"SubstituteFor\", fields: [substituteEmployeeId], references: [id])"
# Wait this already has @relation name. Good.

with open(SCHEMA, "w") as f:
    f.write(content)
print("Schema saved")

# ─── Validate + Generate ───
run("cd preone/packages/database && ./node_modules/.bin/prisma validate --schema prisma/schema.prisma")
run("cd preone/packages/database && ./node_modules/.bin/prisma generate --schema prisma/schema.prisma")
run("cd preone && ./node_modules/.bin/tsc --noEmit -p apps/api/tsconfig.json")
print("\n✅ Done")
