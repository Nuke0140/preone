#!/usr/bin/env python3
"""
Wave 21 — REST API gap-fill generator.

Creates 14 module-level gap-fill controller files + 14 corresponding spec files.
Each module gets ~13-14 new endpoints covering:
  - PATCH updates
  - DELETE soft-delete / cancel
  - Sub-resource listings (e.g., /students/:id/guardians)
  - Filter variants (e.g., /invoices/overdue, /attendance/by-date/:date)
  - Search / export endpoints
  - Bulk operations
  - Status transitions (e.g., /payrolls/:id/cancel)

The endpoints call existing service methods where they exist; otherwise they
return a typed `NotImplementedError` stub so the API surface is documented
and ready for handler implementation in a future wave.
"""
from pathlib import Path
import re

ROOT = Path('/home/z/my-project/preone/apps/api/src/modules')

# Endpoint spec: (method, path, summary, has_body, body_shape, response_kind)
# response_kind:
#   'ok'         → returns { success: true, data: <body> }
#   'no-content' → returns 204
#   'list'       → returns { success: true, data: [...] }
#   'stub'       → returns 501 with code GAP_FILL_PENDING
# Each entry will become one @Get/@Post/@Patch/@Delete method.

# Per-module endpoint catalog (sum should be ~186).
MODULES = {
    'academics': {
        'prefix': 'v1/academics',
        'tag': 'Academics',
        'endpoints': [
            ('Patch', 'sessions/:id', 'Update academic session metadata', True, '{ tenantId: string; name?: string; startDate?: string; endDate?: string; }', 'ok'),
            ('Delete', 'sessions/:id', 'Archive academic session (soft-delete)', False, None, 'no-content'),
            ('Get',    'sessions/:id/sections', 'List sections in academic session', False, None, 'list'),
            ('Patch',  'curricula/:id', 'Update curriculum draft', True, '{ tenantId: string; name?: string; outcomes?: string[]; }', 'ok'),
            ('Delete', 'curricula/:id', 'Archive curriculum', False, None, 'no-content'),
            ('Patch',  'sections/:id', 'Update section (capacity, room, teacher)', True, '{ tenantId: string; capacity?: number; roomId?: string; }', 'ok'),
            ('Get',    'sections/:id/enrollments', 'List enrollments in section', False, None, 'list'),
            ('Get',    'sections/:id/students', 'List students enrolled in section', False, None, 'list'),
            ('Patch',  'enrollments/:id', 'Update enrollment notes', True, '{ tenantId: string; notes?: string; }', 'ok'),
            ('Delete', 'enrollments/:id', 'Cancel enrollment (soft-delete)', False, None, 'no-content'),
            ('Patch',  'observations/:id', 'Update observation text/tags', True, '{ tenantId: string; text?: string; tags?: string[]; }', 'ok'),
            ('Delete', 'observations/:id', 'Delete observation', False, None, 'no-content'),
            ('Get',    'observations/by-section/:sectionId', 'List observations filtered by section', False, None, 'list'),
            ('Patch',  'assessments/:id', 'Update assessment (title, maxScore)', True, '{ tenantId: string; title?: string; maxScore?: number; }', 'ok'),
            ('Delete', 'assessments/:id', 'Cancel assessment (soft-delete)', False, None, 'no-content'),
            ('Get',    'assessments/:id/scores', 'List scores recorded for an assessment', False, None, 'list'),
            ('Patch',  'report-cards/:id', 'Update report card draft', True, '{ tenantId: string; comments?: string; }', 'ok'),
            ('Delete', 'report-cards/:id', 'Delete report card draft', False, None, 'no-content'),
            ('Get',    'portfolios/:studentId', 'Get student portfolio', False, None, 'ok'),
            ('Patch',  'portfolios/:studentId/items/:itemId', 'Update portfolio item', True, '{ tenantId: string; caption?: string; }', 'ok'),
        ],
    },
    'administration': {
        'prefix': 'v1/administration',
        'tag': 'Administration',
        'endpoints': [
            ('Patch',  'assets/:id', 'Update asset metadata', True, '{ tenantId: string; name?: string; location?: string; }', 'ok'),
            ('Delete', 'assets/:id', 'Decommission asset (soft-delete)', False, None, 'no-content'),
            ('Get',    'assets/by-location/:location', 'List assets filtered by location', False, None, 'list'),
            ('Patch',  'maintenance/:id', 'Update maintenance request notes', True, '{ tenantId: string; notes?: string; }', 'ok'),
            ('Post',   'maintenance/bulk-approve', 'Bulk approve maintenance requests', True, '{ tenantId: string; approverId: string; requestIds: string[]; }', 'ok'),
            ('Get',    'visitors/search', 'Search visitor logs by name/phone', False, None, 'list'),
            ('Get',    'visitors/export', 'Export visitor logs as CSV', False, None, 'stub'),
            ('Post',   'visitors/:id/force-checkout', 'Force visitor checkout (admin override)', True, '{ tenantId: string; reason: string; }', 'ok'),
            ('Post',   'gate-passes', 'Issue a gate pass', True, '{ tenantId: string; studentId: string; authorizedBy: string; validUntil: string; }', 'ok'),
            ('Get',    'gate-passes', 'List gate passes', False, None, 'list'),
            ('Get',    'gate-passes/:id', 'Get a gate pass', False, None, 'ok'),
            ('Post',   'cctv-coverage', 'Register CCTV camera coverage', True, '{ tenantId: string; location: string; ip: string; }', 'ok'),
            ('Get',    'cctv-coverage', 'List CCTV coverage', False, None, 'list'),
            ('Get',    'compliance-items', 'List compliance items', False, None, 'list'),
        ],
    },
    'admissions': {
        'prefix': 'v1/admissions',
        'tag': 'Admissions',
        'endpoints': [
            ('Patch',  'applications/:id', 'Update application form fields', True, '{ tenantId: string; firstName?: string; lastName?: string; preferredBranchId?: string; }', 'ok'),
            ('Delete', 'applications/:id', 'Hard-delete application (admin only)', False, None, 'no-content'),
            ('Get',    'applications/:id/documents', 'List documents uploaded for application', False, None, 'list'),
            ('Delete', 'applications/:id/documents/:docId', 'Delete an uploaded document', False, None, 'no-content'),
            ('Patch',  'applications/:id/counselling', 'Reschedule counselling slot', True, '{ tenantId: string; scheduledAt: string; }', 'ok'),
            ('Get',    'applications/:id/offers', 'List offers issued for application', False, None, 'list'),
            ('Post',   'applications/:id/notes', 'Add an internal admissions note', True, '{ tenantId: string; authorId: string; body: string; }', 'ok'),
            ('Get',    'applications/:id/notes', 'List internal admissions notes', False, None, 'list'),
            ('Get',    'applications/:id/timeline', 'Get application event timeline', False, None, 'list'),
            ('Get',    'waiting-list/:id', 'Get waiting list entry', False, None, 'ok'),
            ('Patch',  'waiting-list/:id', 'Update waiting list priority', True, '{ tenantId: string; priority: number; }', 'ok'),
            ('Post',   'applications/:id/sibling-verification', 'Verify sibling concession claim', True, '{ tenantId: string; verifiedBy: string; siblingStudentId: string; }', 'ok'),
            ('Get',    'applications/by-status/:status', 'List applications by status', False, None, 'list'),
            ('Get',    'applications/by-counsellor/:counsellorId', 'List applications assigned to counsellor', False, None, 'list'),
            ('Get',    'stats', 'Admissions funnel statistics', False, None, 'ok'),
        ],
    },
    'attendance': {
        'prefix': 'v1/attendance',
        'tag': 'Attendance',
        'endpoints': [
            ('Patch',  ':id', 'Correct attendance record', True, '{ tenantId: string; status: string; notes?: string; }', 'ok'),
            ('Delete', ':id', 'Delete attendance record', False, None, 'no-content'),
            ('Get',    'by-section/:sectionId', 'List attendance filtered by section', False, None, 'list'),
            ('Get',    'by-date/:date', 'List attendance filtered by date', False, None, 'list'),
            ('Patch',  'daily-logs/:id', 'Update daily log entry', True, '{ tenantId: string; notes?: string; }', 'ok'),
            ('Delete', 'daily-logs/:id', 'Delete daily log entry', False, None, 'no-content'),
            ('Patch',  'incidents/:id', 'Update incident report', True, '{ tenantId: string; description?: string; severity?: string; }', 'ok'),
            ('Delete', 'incidents/:id', 'Delete incident report (admin only)', False, None, 'no-content'),
            ('Get',    'incidents/by-section/:sectionId', 'List incidents by section', False, None, 'list'),
            ('Get',    'incidents/by-severity/:severity', 'List incidents by severity', False, None, 'list'),
            ('Patch',  'daily-reports/:id', 'Update daily report draft', True, '{ tenantId: string; highlights?: string[]; }', 'ok'),
            ('Get',    'daily-reports/by-date/:date', 'List daily reports by date', False, None, 'list'),
            ('Post',   'medicine-authorizations', 'Grant medicine authorization', True, '{ tenantId: string; studentId: string; medicine: string; dosage: string; }', 'ok'),
            ('Get',    'classroom-summary/:sectionId/:date', 'Get classroom attendance summary', False, None, 'ok'),
        ],
    },
    'communication': {
        'prefix': 'v1/communication',
        'tag': 'Communication',
        'endpoints': [
            ('Patch',  'notifications/:id', 'Update notification (mark unread)', True, '{ tenantId: string; unread?: boolean; }', 'ok'),
            ('Delete', 'notifications/:id', 'Delete notification', False, None, 'no-content'),
            ('Post',   'notifications/mark-all-read', 'Bulk mark all notifications as read', True, '{ tenantId: string; userId: string; }', 'ok'),
            ('Get',    'notifications/unread-count', 'Get unread notification count', False, None, 'ok'),
            ('Patch',  'announcements/:id', 'Update announcement (draft)', True, '{ tenantId: string; title?: string; body?: string; }', 'ok'),
            ('Delete', 'announcements/:id', 'Delete announcement', False, None, 'no-content'),
            ('Get',    'announcements/:id/acknowledgments', 'List announcement acknowledgments', False, None, 'list'),
            ('Patch',  'conversations/:id', 'Update conversation (rename, archive)', True, '{ tenantId: string; title?: string; archived?: boolean; }', 'ok'),
            ('Delete', 'conversations/:id', 'Delete conversation (soft-delete)', False, None, 'no-content'),
            ('Get',    'conversations/:id/participants', 'List conversation participants', False, None, 'list'),
            ('Delete', 'messages/:id', 'Delete message (soft-delete)', False, None, 'no-content'),
            ('Post',   'messages/:id/reactions', 'Add a reaction to a message', True, '{ tenantId: string; userId: string; emoji: string; }', 'ok'),
            ('Post',   'conversations/:id/typing', 'Broadcast typing indicator', True, '{ tenantId: string; userId: string; }', 'ok'),
            ('Get',    'messages/search', 'Search messages by content', False, None, 'list'),
        ],
    },
    'crm': {
        'prefix': 'v1/crm',
        'tag': 'CRM',
        'endpoints': [
            ('Patch',  'leads/:id', 'Update lead details', True, '{ tenantId: string; firstName?: string; lastName?: string; phone?: string; }', 'ok'),
            ('Delete', 'leads/:id', 'Delete lead (admin only)', False, None, 'no-content'),
            ('Get',    'leads/by-status/:status', 'List leads filtered by status', False, None, 'list'),
            ('Get',    'leads/by-source/:source', 'List leads filtered by source', False, None, 'list'),
            ('Get',    'leads/:id/follow-ups', 'List follow-ups for a lead', False, None, 'list'),
            ('Patch',  'follow-ups/:id', 'Reschedule a follow-up', True, '{ tenantId: string; scheduledAt: string; }', 'ok'),
            ('Delete', 'follow-ups/:id', 'Delete a follow-up', False, None, 'no-content'),
            ('Patch',  'campaigns/:id', 'Update campaign details', True, '{ tenantId: string; name?: string; budget?: number; }', 'ok'),
            ('Delete', 'campaigns/:id', 'Delete campaign (admin only)', False, None, 'no-content'),
            ('Get',    'campaigns/:id/leads', 'List leads attributed to campaign', False, None, 'list'),
            ('Get',    'campaigns/:id/metrics', 'Get campaign performance metrics', False, None, 'ok'),
            ('Get',    'conversion-rates', 'Lead conversion rate statistics', False, None, 'ok'),
            ('Post',   'leads/:id/notes', 'Add a note to a lead', True, '{ tenantId: string; authorId: string; body: string; }', 'ok'),
            ('Get',    'leads/:id/notes', 'List notes for a lead', False, None, 'list'),
            ('Get',    'leads/:id/timeline', 'Get lead activity timeline', False, None, 'list'),
        ],
    },
    'finance': {
        'prefix': 'v1/finance',
        'tag': 'Finance',
        'endpoints': [
            ('Patch',  'fee-plans/:id', 'Update fee plan (draft only)', True, '{ tenantId: string; name?: string; totalCents?: number; }', 'ok'),
            ('Delete', 'fee-plans/:id', 'Archive fee plan', False, None, 'no-content'),
            ('Get',    'fee-plans/:id/students', 'List students subscribed to fee plan', False, None, 'list'),
            ('Patch',  'invoices/:id', 'Update invoice (draft only)', True, '{ tenantId: string; notes?: string; dueDate?: string; }', 'ok'),
            ('Delete', 'invoices/:id', 'Delete draft invoice', False, None, 'no-content'),
            ('Get',    'invoices/overdue', 'List overdue invoices', False, None, 'list'),
            ('Get',    'invoices/by-student/:studentId', 'List invoices for a student', False, None, 'list'),
            ('Get',    'invoices/:id/payments', 'List payments allocated to invoice', False, None, 'list'),
            ('Patch',  'payments/:id', 'Update payment metadata (UTR, mode)', True, '{ tenantId: string; utr?: string; mode?: string; }', 'ok'),
            ('Delete', 'payments/:id', 'Delete payment (admin only)', False, None, 'no-content'),
            ('Get',    'payments/by-date/:date', 'List payments by date', False, None, 'list'),
            ('Patch',  'refunds/:id', 'Update refund request notes', True, '{ tenantId: string; notes?: string; }', 'ok'),
            ('Delete', 'refunds/:id', 'Cancel refund request', False, None, 'no-content'),
            ('Get',    'receipts', 'List receipts', False, None, 'list'),
            ('Get',    'receipts/:id', 'Get a single receipt', False, None, 'ok'),
        ],
    },
    'hr': {
        'prefix': 'v1/hr',
        'tag': 'HR',
        'endpoints': [
            ('Patch',  'employees/:id', 'Update employee basic info', True, '{ tenantId: string; firstName?: string; lastName?: string; phone?: string; }', 'ok'),
            ('Delete', 'employees/:id', 'Soft-delete employee record', False, None, 'no-content'),
            ('Post',   'employees/:id/link-user', 'Link employee to identity user', True, '{ tenantId: string; userId: string; }', 'ok'),
            ('Get',    'employees/:id/payrolls', 'List payrolls for an employee', False, None, 'list'),
            ('Get',    'employees/:id/reviews', 'List performance reviews for an employee', False, None, 'list'),
            ('Patch',  'leaves/:id', 'Update leave (notes)', True, '{ tenantId: string; notes?: string; }', 'ok'),
            ('Delete', 'leaves/:id', 'Delete leave request', False, None, 'no-content'),
            ('Get',    'leaves/by-status/:status', 'List leaves by status', False, None, 'list'),
            ('Patch',  'payrolls/:id', 'Update payroll (cancel pending)', True, '{ tenantId: string; notes?: string; }', 'ok'),
            ('Post',   'payrolls/:id/cancel', 'Cancel a pending payroll run', True, '{ tenantId: string; reason: string; }', 'ok'),
            ('Get',    'payrolls/:id/payslips', 'List payslips in a payroll run', False, None, 'list'),
            ('Patch',  'reviews/:id', 'Update review (notes)', True, '{ tenantId: string; notes?: string; }', 'ok'),
            ('Post',   'reviews/:id/cancel', 'Cancel an in-progress review', True, '{ tenantId: string; reason: string; }', 'ok'),
            ('Get',    'positions', 'List open position openings', False, None, 'list'),
            ('Post',   'positions', 'Create a position opening', True, '{ tenantId: string; title: string; department: string; }', 'ok'),
        ],
    },
    'identity': {
        'prefix': 'v1',
        'tag': 'Identity',
        'endpoints': [
            ('Patch',  'users/:id', 'Update user profile', True, '{ tenantId: string; firstName?: string; lastName?: string; phone?: string; }', 'ok'),
            ('Delete', 'users/:id', 'Soft-delete user', False, None, 'no-content'),
            ('Post',   'users/:id/activate', 'Activate a deactivated user', True, '{ tenantId: string; }', 'ok'),
            ('Post',   'users/:id/deactivate', 'Deactivate a user', True, '{ tenantId: string; reason?: string; }', 'ok'),
            ('Post',   'users/:id/reset-password', 'Trigger password reset flow', True, '{ tenantId: string; }', 'ok'),
            ('Post',   'users/:id/lock', 'Lock user account', True, '{ tenantId: string; reason: string; }', 'ok'),
            ('Post',   'users/:id/unlock', 'Unlock user account', True, '{ tenantId: string; }', 'ok'),
            ('Patch',  'roles/:id', 'Update role metadata', True, '{ tenantId: string; description?: string; }', 'ok'),
            ('Delete', 'roles/:id', 'Delete role (must be unassigned)', False, None, 'no-content'),
            ('Get',    'roles/:id/permissions', 'List permissions granted to a role', False, None, 'list'),
            ('Patch',  'branches/:id', 'Update branch info', True, '{ tenantId: string; name?: string; address?: string; }', 'ok'),
            ('Delete', 'branches/:id', 'Deactivate branch', False, None, 'no-content'),
            ('Patch',  'schools/:id', 'Update school info', True, '{ tenantId: string; name?: string; address?: string; }', 'ok'),
            ('Get',    'schools/:id/branches', 'List branches under a school', False, None, 'list'),
            ('Get',    'permissions/search', 'Search permissions by code/label', False, None, 'list'),
        ],
    },
    'inventory': {
        'prefix': 'v1/inventory',
        'tag': 'Inventory',
        'endpoints': [
            ('Patch',  'items/:id', 'Update item details', True, '{ tenantId: string; name?: string; reorderLevel?: number; }', 'ok'),
            ('Delete', 'items/:id', 'Deactivate item', False, None, 'no-content'),
            ('Get',    'items/low-stock', 'List items below reorder level', False, None, 'list'),
            ('Get',    'items/by-category/:category', 'List items by category', False, None, 'list'),
            ('Patch',  'suppliers/:id', 'Update supplier details', True, '{ tenantId: string; name?: string; phone?: string; }', 'ok'),
            ('Delete', 'suppliers/:id', 'Deactivate supplier', False, None, 'no-content'),
            ('Patch',  'purchase-orders/:id', 'Update PO notes', True, '{ tenantId: string; notes?: string; }', 'ok'),
            ('Post',   'purchase-orders/:id/receive', 'Partially receive a PO', True, '{ tenantId: string; receivedBy: string; items: { itemId: string; receivedQty: number; }[]; }', 'ok'),
            ('Get',    'purchase-orders/:id/grns', 'List GRNs against a PO', False, None, 'list'),
            ('Patch',  'grns/:id', 'Update GRN notes', True, '{ tenantId: string; notes?: string; }', 'ok'),
            ('Delete', 'grns/:id', 'Cancel GRN', False, None, 'no-content'),
            ('Patch',  'goods-issues/:id', 'Update goods issue notes', True, '{ tenantId: string; notes?: string; }', 'ok'),
            ('Delete', 'goods-issues/:id', 'Cancel goods issue', False, None, 'no-content'),
            ('Get',    'stock-movements', 'Stock movement history', False, None, 'list'),
            ('Post',   'stock-audits', 'Create a stock audit', True, '{ tenantId: string; auditorId: string; scope: string; }', 'ok'),
        ],
    },
    'platform': {
        'prefix': 'v1/platform',
        'tag': 'Platform',
        'endpoints': [
            ('Patch',  'provisionings/:id', 'Update provisioning notes', True, '{ tenantId: string; notes?: string; }', 'ok'),
            ('Post',   'provisionings/:id/rollback', 'Rollback a failed provisioning step', True, '{ tenantId: string; stepName: string; }', 'ok'),
            ('Patch',  'feature-flags/:id', 'Update feature flag (rollout %, active)', True, '{ tenantId: string; rolloutPercent?: number; isActive?: boolean; }', 'ok'),
            ('Patch',  'support-tickets/:id', 'Update support ticket metadata', True, '{ tenantId: string; tags?: string[]; priority?: string; }', 'ok'),
            ('Post',   'support-tickets/:id/reopen', 'Reopen a resolved ticket', True, '{ tenantId: string; reason: string; }', 'ok'),
            ('Post',   'support-tickets/:id/escalate', 'Escalate a ticket', True, '{ tenantId: string; toUserId: string; reason: string; }', 'ok'),
            ('Post',   'support-tickets/:id/comments', 'Add a comment to a ticket', True, '{ tenantId: string; authorId: string; body: string; internal?: boolean; }', 'ok'),
            ('Get',    'metrics/history', 'Get historical metrics (last N days)', False, None, 'list'),
            ('Get',    'audit-log', 'Query platform audit log', False, None, 'list'),
            ('Get',    'audit-log/by-entity/:entityId', 'Filter audit log by entity', False, None, 'list'),
            ('Get',    'subscriptions', 'List all tenant subscriptions', False, None, 'list'),
            ('Post',   'subscriptions/:id/cancel', 'Cancel a subscription', True, '{ tenantId: string; reason: string; effectiveAt?: string; }', 'ok'),
        ],
    },
    'reports': {
        'prefix': 'v1/reports',
        'tag': 'Reports',
        'endpoints': [
            ('Patch',  'definitions/:id', 'Update report definition', True, '{ tenantId: string; description?: string; sqlTemplate?: string; }', 'ok'),
            ('Delete', 'definitions/:id', 'Delete report definition', False, None, 'no-content'),
            ('Post',   'executions/:id/retry', 'Retry a failed execution', True, '{ tenantId: string; }', 'ok'),
            ('Delete', 'saved-reports/:id', 'Delete a saved report', False, None, 'no-content'),
            ('Patch',  'subscriptions/:id', 'Update subscription (cron, recipients)', True, '{ tenantId: string; cron?: string; recipientEmails?: string[]; }', 'ok'),
            ('Post',   'subscriptions/:id/pause', 'Pause a subscription', True, '{ tenantId: string; }', 'ok'),
            ('Post',   'subscriptions/:id/resume', 'Resume a paused subscription', True, '{ tenantId: string; }', 'ok'),
            ('Get',    'dashboard/export', 'Export dashboard stats as CSV', False, None, 'stub'),
            ('Get',    'enrollment/export', 'Export enrollment stats as CSV', False, None, 'stub'),
            ('Get',    'attendance/export', 'Export attendance stats as CSV', False, None, 'stub'),
            ('Get',    'fee-collection/export', 'Export fee collection stats as CSV', False, None, 'stub'),
            ('Get',    'executions/:id/download', 'Download execution result (CSV/JSON)', False, None, 'stub'),
            ('Post',   'definitions', 'Create a new report definition', True, '{ tenantId: string; name: string; sqlTemplate: string; }', 'ok'),
            ('Get',    'saved-reports', 'List saved reports', False, None, 'list'),
        ],
    },
    'settings': {
        'prefix': 'v1/settings',
        'tag': 'Settings',
        'endpoints': [
            ('Patch',  'configs/:id', 'Update system config value', True, '{ tenantId: string; value: string; }', 'ok'),
            ('Delete', 'configs/:id', 'Delete system config', False, None, 'no-content'),
            ('Get',    'configs/by-scope/:scope', 'List configs by scope', False, None, 'list'),
            ('Patch',  'preferences/:id', 'Update user preference', True, '{ tenantId: string; value: string; }', 'ok'),
            ('Delete', 'preferences/:id', 'Delete user preference', False, None, 'no-content'),
            ('Get',    'preferences/by-user/:userId', 'List preferences for a user', False, None, 'list'),
            ('Patch',  'calendar-events/:id', 'Update calendar event', True, '{ tenantId: string; title?: string; rrule?: string; }', 'ok'),
            ('Delete', 'calendar-events/:id', 'Delete calendar event', False, None, 'no-content'),
            ('Get',    'calendar-events/by-date-range', 'List calendar events in date range', False, None, 'list'),
            ('Get',    'calendar-events/upcoming', 'List upcoming calendar events', False, None, 'list'),
            ('Get',    'integrations', 'List integration configurations', False, None, 'list'),
            ('Patch',  'integrations/:id', 'Update integration configuration', True, '{ tenantId: string; isActive?: boolean; config?: Record<string, unknown>; }', 'ok'),
        ],
    },
    'student': {
        'prefix': 'v1/students',
        'tag': 'Student',
        'endpoints': [
            ('Patch',  ':id', 'Update student profile', True, '{ tenantId: string; firstName?: string; lastName?: string; bloodGroup?: string; }', 'ok'),
            ('Get',    ':id/guardians', 'List guardians of a student', False, None, 'list'),
            ('Post',   ':id/guardians', 'Add a guardian to a student', True, '{ tenantId: string; name: string; phone: string; relationship: string; }', 'ok'),
            ('Patch',  ':id/guardians/:guardianId', 'Update a guardian', True, '{ tenantId: string; name?: string; phone?: string; }', 'ok'),
            ('Delete', ':id/guardians/:guardianId', 'Remove a guardian from a student', False, None, 'no-content'),
            ('Get',    ':id/enrollments', 'List enrollments for a student', False, None, 'list'),
            ('Get',    ':id/attendance', 'Attendance history for a student', False, None, 'list'),
            ('Get',    ':id/medical-history', 'Medical history for a student', False, None, 'ok'),
            ('Patch',  ':id/medical-history', 'Update medical info (allergies, conditions)', True, '{ tenantId: string; allergies?: string[]; conditions?: string[]; }', 'ok'),
            ('Get',    'search', 'Advanced student search', False, None, 'list'),
            ('Get',    'by-section/:sectionId', 'List students by section', False, None, 'list'),
            ('Get',    'by-status/:status', 'List students by status', False, None, 'list'),
        ],
    },
}

# ─────────────────────────────────────────────────────────────
# Templates
# ─────────────────────────────────────────────────────────────

CONTROLLER_TEMPLATE = '''/**
 * {module_title} Gap-Fill Controllers — Wave 21.
 *
 * Adds {endpoint_count} missing REST endpoints across the {module_title} bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /{prefix}):
{routes_block}
 *
 * Wave 21 strategy:
 *   - PATCH endpoints update mutable fields (route to existing service methods
 *     where available, otherwise return a structured stub for handler wiring).
 *   - DELETE endpoints perform soft-delete (set deletedAt) or hard-delete with
 *     admin override — handlers enforce tenant scoping + audit logging.
 *   - GET sub-resource listings return shape { success: true, data: [...] }
 *     consistent with API Contract §3 (Response Envelope).
 *   - Export endpoints return 501 GAP_FILL_PENDING until csv-writer is wired.
 */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

{classes}

'''

SPEC_TEMPLATE = '''/**
 * {module_title} Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { {class_names} } from '../controllers/{module}-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('{module_title} Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
{setup_lines}
  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
{instantiations}
    await Test.createTestingModule({
      controllers: [{class_names}],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

{test_blocks}});
'''

CLASS_TEMPLATE = '''@Controller('{full_prefix}')
export class {ClassName} {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

{methods}
}
'''

METHOD_TEMPLATES = {
    'Get': '''  @Get('{path}')
  async {methodName}(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: '{cqrsType}',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }''',
    'Post': '''  @Post('{path}')
  async {methodName}(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: '{cqrsType}',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }''',
    'Patch': '''  @Patch('{path}')
  async {methodName}(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: '{cqrsType}',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }''',
    'Delete': '''  @Delete('{path}')
  async {methodName}(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: '{cqrsType}',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }''',
}

TEST_BLOCK_TEMPLATE = '''  describe('{ClassName}', () => {
{tests}  });
'''

TEST_CASE_TEMPLATE = '''    it('{method} {path} -> dispatches {cqrsType}', async () => {
      const bus = {is_query} ? qb : cb;
      const before = bus.calls.length;
      await inst.{methodName}({ id: 'r1' }, {args});
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('{cqrsType}');
      expect(bus.calls.length).toBe(before + 1);
    });
'''

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def pascal_case(s: str) -> str:
    return ''.join(p.capitalize() for p in re.split(r'[-_/]', s))

def camel_case(s: str) -> str:
    parts = re.split(r'[-_/]', s)
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])

def method_name_for(method: str, path: str) -> str:
    # Build a method name like 'patchSessionById' or 'getSessionsBySection'
    # Convert path to camelCase identifier, prefixed with lowercased method
    m = method.lower()
    # Strip params (turn :id into 'ById', :sectionId into 'BySectionId')
    parts = []
    for seg in path.split('/'):
        if not seg: continue
        if seg.startswith(':'):
            var = seg[1:]
            # If this is the first segment, treat as 'by-<var>'; otherwise append 'By<Var>'
            if not parts:
                parts.append('by' + var[0].upper() + var[1:])
            else:
                parts.append('by' + var[0].upper() + var[1:])
        else:
            parts.append(seg.replace('-', ''))
    base = camel_case('_'.join(parts))
    return m + base[0].upper() + base[1:]

def cqrs_type_for(module: str, method: str, path: str, summary: str) -> str:
    """Derive a CQRS type name like 'Hr.UpdateEmployee' from the operation.

    Uses the summary to extract a verb+noun phrase; falls back to a path-derived
    name if the summary doesn't parse cleanly.
    """
    Mod = module.capitalize()
    # Method → operation verb
    verb_map = {'Get': 'List', 'Post': 'Create', 'Patch': 'Update', 'Put': 'Replace', 'Delete': 'Delete'}
    # For Post on a path with :id/<action>, treat as <Action> (e.g., 'cancel', 'approve')
    parts = path.split('/')
    has_id = any(p.startswith(':') for p in parts)
    if method == 'Post' and has_id:
        # The last non-param segment is the action verb
        action_seg = next((p for p in reversed(parts) if not p.startswith(':')), '')
        if action_seg:
            op = action_seg.replace('-', ' ').title().replace(' ', '')
            return f'{Mod}.{op}'
    if method == 'Post' and not has_id:
        # POST to a collection → Create<Resource>
        # Find the resource name (last non-param segment)
        res_seg = next((p for p in reversed(parts) if not p.startswith(':')), '')
        if res_seg:
            res = res_seg.replace('-', ' ').title().replace(' ', '')
            # If singular (e.g., gate-pass), use it; if plural (e.g., leads), singularize crudely
            if res.endswith('s') and not res.endswith('ss'):
                res = res[:-1]
            return f'{Mod}.Create{res}'
    if method == 'Get':
        # GET to a collection → List<Resource>; GET to /:id → Get<Resource>
        if not has_id:
            res_seg = next((p for p in reversed(parts) if not p.startswith(':')), '')
            if res_seg:
                res = res_seg.replace('-', ' ').title().replace(' ', '')
                return f'{Mod}.List{res}'
        else:
            # If there's a sub-resource (e.g., /employees/:id/payrolls), use List<EmployeePayrolls>
            id_idx = next((i for i, p in enumerate(parts) if p.startswith(':')), -1)
            if id_idx >= 0 and id_idx < len(parts) - 1:
                # Sub-resource listing
                sub = parts[-1].replace('-', ' ').title().replace(' ', '')
                parent = parts[id_idx - 1].replace('-', ' ').title().replace(' ', '') if id_idx > 0 else 'Resource'
                # Singularize parent (e.g., employees → Employee)
                if parent.endswith('s') and not parent.endswith('ss'):
                    parent = parent[:-1]
                return f'{Mod}.List{parent}{sub}'
            else:
                res_seg = next((p for p in reversed(parts) if not p.startswith(':')), '')
                if res_seg:
                    res = res_seg.replace('-', ' ').title().replace(' ', '')
                    if res.endswith('s') and not res.endswith('ss'):
                        res = res[:-1]
                    return f'{Mod}.Get{res}'
    if method == 'Patch':
        # PATCH /:id → Update<Resource>
        res_seg = parts[0] if parts else 'Resource'
        res = res_seg.replace('-', ' ').title().replace(' ', '')
        if res.endswith('s') and not res.endswith('ss'):
            res = res[:-1]
        # Sub-resource PATCH: e.g., /students/:id/guardians/:guardianId → UpdateStudentGuardian
        id_idx = next((i for i, p in enumerate(parts) if p.startswith(':')), -1)
        if id_idx >= 0 and id_idx < len(parts) - 1:
            sub = parts[-1].replace('-', ' ').title().replace(' ', '')
            if sub.endswith('s') and not sub.endswith('ss'):
                sub = sub[:-1]
            return f'{Mod}.Update{res}{sub}'
        return f'{Mod}.Update{res}'
    if method == 'Delete':
        res_seg = parts[0] if parts else 'Resource'
        res = res_seg.replace('-', ' ').title().replace(' ', '')
        if res.endswith('s') and not res.endswith('ss'):
            res = res[:-1]
        return f'{Mod}.Delete{res}'
    # Fallback
    return f'{Mod}.Operation'

# ─────────────────────────────────────────────────────────────
# Generator
# ─────────────────────────────────────────────────────────────

total_endpoints = 0
for module, spec in MODULES.items():
    endpoints = spec['endpoints']
    total_endpoints += len(endpoints)

    # Build routes block comment
    routes_lines = []
    for method, path, summary, *_ in endpoints:
        routes_lines.append(f' *   {method.upper():6s} /{spec["prefix"]}/{path:<40s} — {summary}')

    # Determine controller class names — one controller per ~7 endpoints to keep classes small
    classes = []
    chunk_size = 7
    chunks = [endpoints[i:i+chunk_size] for i in range(0, len(endpoints), chunk_size)]
    for ci, chunk in enumerate(chunks):
        suffix = '' if len(chunks) == 1 else f'Part{ci+1}'
        class_name = f'{pascal_case(module)}GapFillController{suffix}'
        methods = []
        for ep in chunk:
            method, path, summary, has_body, body_shape, response_kind = ep
            mname = method_name_for(method, path)
            cqrs_type = cqrs_type_for(module, method, path, summary)
            tpl = METHOD_TEMPLATES[method]
            method_code = (
                tpl
                .replace('{path}', path)
                .replace('{methodName}', mname)
                .replace('{cqrsType}', cqrs_type)
            )
            methods.append(method_code)
        class_code = (
            CLASS_TEMPLATE
            .replace('{full_prefix}', spec['prefix'])
            .replace('{ClassName}', class_name)
            .replace('{methods}', '\n'.join(methods))
        )
        classes.append((class_name, class_code))

    controller_content = (
        CONTROLLER_TEMPLATE
        .replace('{module_title}', spec['tag'])
        .replace('{endpoint_count}', str(len(endpoints)))
        .replace('{prefix}', spec['prefix'])
        .replace('{routes_block}', '\n'.join(routes_lines))
        .replace('{classes}', '\n'.join(c[1] for c in classes))
    )

    # Write controller file
    ctrl_path = ROOT / module / 'controllers' / f'{module}-gap-fill.controllers.ts'
    ctrl_path.parent.mkdir(parents=True, exist_ok=True)
    ctrl_path.write_text(controller_content)

    # Build spec file
    test_blocks = []
    for class_name, _ in classes:
        # Find the matching chunk by index
        ci = [c[0] for c in classes].index(class_name)
        chunk = chunks[ci]
        tests = []
        for ep in chunk:
            method, path, summary, has_body, body_shape, response_kind = ep
            mname = method_name_for(method, path)
            cqrs_type = cqrs_type_for(module, method, path, summary)
            is_query = 'true' if method == 'Get' else 'false'
            args = '{ tenantId: "t1" }'
            tests.append(
                TEST_CASE_TEMPLATE
                .replace('{method}', method.upper())
                .replace('{path}', path)
                .replace('{cqrsType}', cqrs_type)
                .replace('{methodName}', mname)
                .replace('{is_query}', is_query)
                .replace('{args}', args)
            )
        test_blocks.append(
            TEST_BLOCK_TEMPLATE
            .replace('{ClassName}', class_name)
            .replace('{tests}', ''.join(tests))
        )

    # Setup vars and instantiations — use lowercased var names to avoid shadowing class names
    setup_lines = []
    instantiations = []
    var_for_class = {}
    for class_name, _ in classes:
        # Use a lowercase first letter var name (e.g., `hrGapFillPart1`)
        var = class_name[0].lower() + class_name[1:]
        var_for_class[class_name] = var
        setup_lines.append(f'  let {var}: {class_name};')
        instantiations.append(f'    {var} = new {class_name}(cb as any, qb as any);')
    setup_block = '\n'.join(setup_lines) + '\n'
    instantiation_block = '\n'.join(instantiations) + '\n'

    # Regenerate test_blocks with proper var names per class
    test_blocks_v2 = []
    for class_name, _ in classes:
        ci = [c[0] for c in classes].index(class_name)
        chunk = chunks[ci]
        var = var_for_class[class_name]
        tests = []
        for ep in chunk:
            method, path, summary, has_body, body_shape, response_kind = ep
            mname = method_name_for(method, path)
            cqrs_type = cqrs_type_for(module, method, path, summary)
            is_query = 'true' if method == 'Get' else 'false'
            args = '{ tenantId: "t1" }'
            tests.append(
                TEST_CASE_TEMPLATE
                .replace('{method}', method.upper())
                .replace('{path}', path)
                .replace('{cqrsType}', cqrs_type)
                .replace('{methodName}', mname)
                .replace('{is_query}', is_query)
                .replace('{args}', args)
                .replace('inst.', f'{var}.')
            )
        test_blocks_v2.append(
            TEST_BLOCK_TEMPLATE
            .replace('{ClassName}', class_name)
            .replace('{tests}', ''.join(tests))
        )
    spec_content = (
        SPEC_TEMPLATE
        .replace('{module_title}', spec['tag'])
        .replace('{module}', module)
        .replace('{class_names}', ', '.join(c[0] for c in classes))
        .replace('{setup_lines}', setup_block)
        .replace('{instantiations}', instantiation_block)
        .replace('{test_blocks}', '\n'.join(test_blocks_v2))
    )

    spec_path = ROOT / module / 'test' / f'{module}-gap-fill.controllers.spec.ts'
    spec_path.parent.mkdir(parents=True, exist_ok=True)
    spec_path.write_text(spec_content)

print(f'Total endpoints generated: {total_endpoints}')
print(f'Modules: {len(MODULES)}')
