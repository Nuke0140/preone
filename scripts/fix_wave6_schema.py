#!/usr/bin/env python3
"""Fix Wave 6 schema issues: ambiguous relations + missing User back-relations."""
from pathlib import Path
import subprocess

def run(cmd, cwd="/home/z/my-project"):
    print(f"$ {cmd}")
    r = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    if r.stdout: print(r.stdout[-2000:])
    if r.stderr: print("STDERR:", r.stderr[-2000:])
    return r

# Ensure on correct branch
run("git checkout feat/wave-6-hr-crm")

SCHEMA = Path("/home/z/my-project/preone/packages/database/prisma/schema.prisma")
with open(SCHEMA) as f:
    content = f.read()

# ─── Fix 1: Add @relation names to Lead.assignedCounsellor + previousCounsellor ───
old1 = """  campaign            Campaign? @relation(fields: [campaignId], references: [id])
  assignedCounsellor  User?     @relation(fields: [assignedCounsellorId], references: [id])
  previousCounsellor  User?     @relation(fields: [previousCounsellorId], references: [id])"""
new1 = """  campaign            Campaign? @relation(fields: [campaignId], references: [id])
  assignedCounsellor  User?     @relation("LeadAssignedCounsellor", fields: [assignedCounsellorId], references: [id])
  previousCounsellor  User?     @relation("LeadPreviousCounsellor", fields: [previousCounsellorId], references: [id])"""
assert old1 in content, "Lead relation block not found"
content = content.replace(old1, new1, 1)
print("Fixed Lead ambiguous relations")

# ─── Fix 2: Add back-relations to User model ───
# Insert before the @@unique([schoolId, email]) line in User model
old2 = """  // ─── Wave 5 back-relations (Communication) ───
  notificationRecipients   NotificationRecipient[]
  announcementRecipients   AnnouncementRecipient[]
  conversationParticipants ConversationParticipant[]
  sentMessages             Message[]
  messageReadReceipts      MessageReadReceipt[]

  @@unique([schoolId, email])"""
new2 = """  // ─── Wave 5 back-relations (Communication) ───
  notificationRecipients   NotificationRecipient[]
  announcementRecipients   AnnouncementRecipient[]
  conversationParticipants ConversationParticipant[]
  sentMessages             Message[]
  messageReadReceipts      MessageReadReceipt[]

  // ─── Wave 6 back-relations (HR + CRM) ───
  employeeProfile        Employee?
  approvedLeaves         LeaveRequest[]       @relation("LeaveApprover")
  approvedPayrollRuns    PayrollRun[]
  reviewsAsReviewer      PerformanceReview[]  @relation("ReviewUserReviewer")
  reviewsAsHr            PerformanceReview[]  @relation("ReviewUserHr")
  counsellorFollowUps    FollowUp[]
  assignedLeads          Lead[]               @relation("LeadAssignedCounsellor")
  previousLeads          Lead[]               @relation("LeadPreviousCounsellor")
  counsellorTargets      CounsellorTarget[]

  @@unique([schoolId, email])"""
assert old2 in content, "User back-relations block not found"
content = content.replace(old2, new2, 1)
print("Added User back-relations")

# ─── Fix 3: Update PerformanceReview to use User for reviewer/hrReviewer (not Employee) ───
# Wait — original schema has Employee for reviewer. The aggregate uses reviewerId (string),
# and the Prisma repo hydrates with Employee. So we should keep Employee for reviewer/hrReviewer
# and NOT add User relations. Let me remove the User-side relations I just added for reviews.
content = content.replace(
    """  reviewsAsReviewer      PerformanceReview[]  @relation("ReviewUserReviewer")
  reviewsAsHr            PerformanceReview[]  @relation("ReviewUserHr")
""", "")
print("Removed User-side PerformanceReview back-relations (Employee is the reviewer)")

# Also remove the corresponding @relation names from PerformanceReview if I added them
# Actually I didn't add them — PerformanceReview uses Employee for reviewer/hrReviewer already.
# But the User back-relations I added reference Employee-side relations. Let me re-check.
# Actually the User has employeeProfile (Employee), which has reviewsAsReviewer (PerformanceReview)
# So User → Employee → PerformanceReview, which is fine. User doesn't need direct PerformanceReview relations.

with open(SCHEMA, "w") as f:
    f.write(content)
print("Schema saved")

# ─── Fix 4: Regenerate Prisma + validate ───
run("cd preone/packages/database && ./node_modules/.bin/prisma validate --schema prisma/schema.prisma")
run("cd preone/packages/database && ./node_modules/.bin/prisma generate --schema prisma/schema.prisma")

# ─── Fix 5: Update CRM integration subscriber to not touch Application.source/campaignId ───
SUB_PATH = Path("/home/z/my-project/preone/apps/api/src/modules/crm/application/services/crm-integration-subscriber.service.ts")
with open(SUB_PATH) as f:
    sub_content = f.read()

old_sub = """        // Update the admission application with lead attribution
        await this.prisma.application.update({
          where: { id: e.payload.applicationId },
          data: {
            leadId: e.payload.leadId,
            source: e.payload.source,
            campaignId: e.payload.campaignId,
          },
        }).catch(() => {"""
new_sub = """        // Update the admission application with lead attribution (leadId only —
        // source/campaignId are stored on the Lead itself for attribution)
        await this.prisma.application.update({
          where: { id: e.payload.applicationId },
          data: {
            leadId: e.payload.leadId,
          },
        }).catch(() => {"""
if old_sub in sub_content:
    sub_content = sub_content.replace(old_sub, new_sub, 1)
    with open(SUB_PATH, "w") as f:
        f.write(sub_content)
    print("Updated CRM integration subscriber")
else:
    print("WARN: Could not find CRM subscriber block to update")

# ─── Fix 6: Run tsc to verify ───
run("cd preone && ./node_modules/.bin/tsc --noEmit -p apps/api/tsconfig.json")

print("\n✅ All schema fixes applied")
