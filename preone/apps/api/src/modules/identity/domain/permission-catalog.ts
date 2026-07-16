/**
 * Permission Catalog — full list of permissions across all 14 modules.
 *
 * Per BRC v1.0 §9 (Approval Matrix): 30+ permissions across all 14 modules.
 * Per ADR-011: Permission UNION (never promote) — effective permissions = UNION
 *   of all role permissions for a user.
 * Per API Catalog §16.2: Permission codes follow '<resource>.<action>.<scope>'.
 *
 * This catalog is the SSOT for permission seeding + RBAC matrix definition.
 */

export interface PermissionSeed {
  code: string;
  name: string;
  description: string;
  module: string;
  action: string;
  resource: string;
  scopeType: 'PLATFORM' | 'TENANT' | 'BRANCH' | 'CLASSROOM';
  isDangerous: boolean;
}

// ─────────────────────────────────────────────
// PLATFORM — cross-tenant admin operations
// ─────────────────────────────────────────────
export const PLATFORM_PERMISSIONS: PermissionSeed[] = [
  { code: 'platform.admin.execute', name: 'Platform Admin', description: 'Super-admin across all tenants', module: 'platform', action: 'execute', resource: 'platform', scopeType: 'PLATFORM', isDangerous: true },
  { code: 'schools.create.execute', name: 'Create School', description: 'Onboard new tenant school', module: 'identity', action: 'create', resource: 'school', scopeType: 'PLATFORM', isDangerous: true },
  { code: 'schools.read.execute', name: 'List Schools', description: 'View all tenant schools', module: 'identity', action: 'read', resource: 'school', scopeType: 'PLATFORM', isDangerous: false },
  { code: 'schools.update.execute', name: 'Update School', description: 'Modify school tier, status, seats', module: 'identity', action: 'update', resource: 'school', scopeType: 'PLATFORM', isDangerous: true },
  { code: 'schools.delete.execute', name: 'Delete School', description: 'Offboard + soft-delete a tenant', module: 'identity', action: 'delete', resource: 'school', scopeType: 'PLATFORM', isDangerous: true },
  { code: 'platform.billing.read', name: 'View Platform Billing', description: 'View subscription + invoices', module: 'platform', action: 'read', resource: 'billing', scopeType: 'PLATFORM', isDangerous: false },
  { code: 'platform.billing.configure', name: 'Configure Billing', description: 'Change plan, apply discounts', module: 'platform', action: 'configure', resource: 'billing', scopeType: 'PLATFORM', isDangerous: true },
];

// ─────────────────────────────────────────────
// IDENTITY — Users, Roles, Branches
// ─────────────────────────────────────────────
export const IDENTITY_PERMISSIONS: PermissionSeed[] = [
  { code: 'users.read.execute', name: 'List Users', description: 'View users in tenant', module: 'identity', action: 'read', resource: 'user', scopeType: 'TENANT', isDangerous: false },
  { code: 'users.create.execute', name: 'Create User', description: 'Invite new user to tenant', module: 'identity', action: 'create', resource: 'user', scopeType: 'TENANT', isDangerous: false },
  { code: 'users.update.execute', name: 'Update User', description: 'Modify user profile, status', module: 'identity', action: 'update', resource: 'user', scopeType: 'TENANT', isDangerous: false },
  { code: 'users.delete.execute', name: 'Delete User', description: 'Soft-delete user', module: 'identity', action: 'delete', resource: 'user', scopeType: 'TENANT', isDangerous: true },
  { code: 'users.assign.execute', name: 'Assign User Roles', description: 'Grant/revoke roles to user', module: 'identity', action: 'assign', resource: 'user', scopeType: 'TENANT', isDangerous: true },
  { code: 'roles.read.execute', name: 'List Roles', description: 'View roles + permissions', module: 'identity', action: 'read', resource: 'role', scopeType: 'TENANT', isDangerous: false },
  { code: 'roles.create.execute', name: 'Create Role', description: 'Create custom role', module: 'identity', action: 'create', resource: 'role', scopeType: 'TENANT', isDangerous: false },
  { code: 'roles.update.execute', name: 'Update Role', description: 'Modify role profile', module: 'identity', action: 'update', resource: 'role', scopeType: 'TENANT', isDangerous: false },
  { code: 'roles.delete.execute', name: 'Delete Role', description: 'Delete custom role (system roles blocked)', module: 'identity', action: 'delete', resource: 'role', scopeType: 'TENANT', isDangerous: true },
  { code: 'roles.assign.execute', name: 'Assign Role Permissions', description: 'Grant/revoke permissions to role', module: 'identity', action: 'assign', resource: 'role', scopeType: 'TENANT', isDangerous: true },
  { code: 'permissions.read.execute', name: 'List Permissions', description: 'View permission catalog', module: 'identity', action: 'read', resource: 'permission', scopeType: 'TENANT', isDangerous: false },
  { code: 'branches.read.execute', name: 'List Branches', description: 'View branches in tenant', module: 'identity', action: 'read', resource: 'branch', scopeType: 'TENANT', isDangerous: false },
  { code: 'branches.create.execute', name: 'Create Branch', description: 'Add new branch to school', module: 'identity', action: 'create', resource: 'branch', scopeType: 'TENANT', isDangerous: false },
  { code: 'branches.update.execute', name: 'Update Branch', description: 'Modify branch profile, deactivate', module: 'identity', action: 'update', resource: 'branch', scopeType: 'TENANT', isDangerous: false },
  { code: 'settings.manage.execute', name: 'Manage Settings', description: 'Academic year, calendar, configs', module: 'settings', action: 'configure', resource: 'setting', scopeType: 'TENANT', isDangerous: false },
];

// ─────────────────────────────────────────────
// STUDENT + ACADEMICS
// ─────────────────────────────────────────────
export const STUDENT_PERMISSIONS: PermissionSeed[] = [
  { code: 'students.read.execute', name: 'View Students', description: 'View student profiles', module: 'student', action: 'read', resource: 'student', scopeType: 'BRANCH', isDangerous: false },
  { code: 'students.create.execute', name: 'Create Student', description: 'Add new student', module: 'student', action: 'create', resource: 'student', scopeType: 'BRANCH', isDangerous: false },
  { code: 'students.update.execute', name: 'Update Student', description: 'Modify student profile', module: 'student', action: 'update', resource: 'student', scopeType: 'BRANCH', isDangerous: false },
  { code: 'students.delete.execute', name: 'Delete Student', description: 'Soft-delete student', module: 'student', action: 'delete', resource: 'student', scopeType: 'BRANCH', isDangerous: true },
  { code: 'students.export.execute', name: 'Export Students', description: 'Export student data (CSV/PDF)', module: 'student', action: 'export', resource: 'student', scopeType: 'BRANCH', isDangerous: true },
  { code: 'academics.read.execute', name: 'View Academics', description: 'View curriculum, observations', module: 'academics', action: 'read', resource: 'academic', scopeType: 'BRANCH', isDangerous: false },
  { code: 'academics.create.execute', name: 'Create Observation', description: 'Record student observation', module: 'academics', action: 'create', resource: 'observation', scopeType: 'CLASSROOM', isDangerous: false },
  { code: 'academics.update.execute', name: 'Update Observation', description: 'Edit observation', module: 'academics', action: 'update', resource: 'observation', scopeType: 'CLASSROOM', isDangerous: false },
  { code: 'academics.approve.execute', name: 'Approve Report Card', description: 'Approve draft report card', module: 'academics', action: 'approve', resource: 'report_card', scopeType: 'BRANCH', isDangerous: false },
];

// ─────────────────────────────────────────────
// ADMISSIONS + CRM
// ─────────────────────────────────────────────
export const ADMISSIONS_PERMISSIONS: PermissionSeed[] = [
  { code: 'leads.read.execute', name: 'View Leads', description: 'View CRM leads', module: 'crm', action: 'read', resource: 'lead', scopeType: 'TENANT', isDangerous: false },
  { code: 'leads.create.execute', name: 'Create Lead', description: 'Capture new lead', module: 'crm', action: 'create', resource: 'lead', scopeType: 'TENANT', isDangerous: false },
  { code: 'leads.update.execute', name: 'Update Lead', description: 'Modify lead, follow-up', module: 'crm', action: 'update', resource: 'lead', scopeType: 'TENANT', isDangerous: false },
  { code: 'applications.read.execute', name: 'View Applications', description: 'View admission applications', module: 'admissions', action: 'read', resource: 'application', scopeType: 'TENANT', isDangerous: false },
  { code: 'applications.create.execute', name: 'Create Application', description: 'Submit new application', module: 'admissions', action: 'create', resource: 'application', scopeType: 'TENANT', isDangerous: false },
  { code: 'applications.update.execute', name: 'Update Application', description: 'Edit application', module: 'admissions', action: 'update', resource: 'application', scopeType: 'TENANT', isDangerous: false },
  { code: 'applications.approve.execute', name: 'Approve Application', description: 'Approve admission', module: 'admissions', action: 'approve', resource: 'application', scopeType: 'TENANT', isDangerous: true },
  { code: 'applications.reject.execute', name: 'Reject Application', description: 'Reject admission', module: 'admissions', action: 'reject', resource: 'application', scopeType: 'TENANT', isDangerous: true },
];

// ─────────────────────────────────────────────
// ATTENDANCE + COMMUNICATION
// ─────────────────────────────────────────────
export const ATTENDANCE_PERMISSIONS: PermissionSeed[] = [
  { code: 'attendance.read.execute', name: 'View Attendance', description: 'View attendance records', module: 'attendance', action: 'read', resource: 'attendance', scopeType: 'BRANCH', isDangerous: false },
  { code: 'attendance.create.execute', name: 'Mark Attendance', description: 'Mark daily attendance', module: 'attendance', action: 'create', resource: 'attendance', scopeType: 'CLASSROOM', isDangerous: false },
  { code: 'attendance.update.execute', name: 'Edit Attendance', description: 'Edit same-day attendance', module: 'attendance', action: 'update', resource: 'attendance', scopeType: 'CLASSROOM', isDangerous: false },
  { code: 'attendance.approve.execute', name: 'Approve Attendance', description: 'Branch head day-end approval', module: 'attendance', action: 'approve', resource: 'attendance', scopeType: 'BRANCH', isDangerous: false },
  { code: 'communication.read.execute', name: 'View Messages', description: 'View announcements, chat', module: 'communication', action: 'read', resource: 'message', scopeType: 'BRANCH', isDangerous: false },
  { code: 'communication.create.execute', name: 'Send Message', description: 'Send announcement, chat', module: 'communication', action: 'create', resource: 'message', scopeType: 'BRANCH', isDangerous: false },
  { code: 'communication.approve.execute', name: 'Approve Announcement', description: 'Branch head approves broadcast', module: 'communication', action: 'approve', resource: 'announcement', scopeType: 'BRANCH', isDangerous: false },
];

// ─────────────────────────────────────────────
// FINANCE
// ─────────────────────────────────────────────
export const FINANCE_PERMISSIONS: PermissionSeed[] = [
  { code: 'fees.read.execute', name: 'View Fees', description: 'View fee plans, invoices', module: 'finance', action: 'read', resource: 'fee', scopeType: 'TENANT', isDangerous: false },
  { code: 'fees.create.execute', name: 'Create Fee Plan', description: 'Configure fee heads, plans', module: 'finance', action: 'create', resource: 'fee_plan', scopeType: 'TENANT', isDangerous: false },
  { code: 'fees.update.execute', name: 'Update Fee Plan', description: 'Modify fee configuration', module: 'finance', action: 'update', resource: 'fee_plan', scopeType: 'TENANT', isDangerous: false },
  { code: 'invoices.read.execute', name: 'View Invoices', description: 'View invoices', module: 'finance', action: 'read', resource: 'invoice', scopeType: 'TENANT', isDangerous: false },
  { code: 'invoices.create.execute', name: 'Create Invoice', description: 'Generate invoice', module: 'finance', action: 'create', resource: 'invoice', scopeType: 'TENANT', isDangerous: false },
  { code: 'invoices.update.execute', name: 'Update Invoice', description: 'Modify invoice (cancel, adjust)', module: 'finance', action: 'update', resource: 'invoice', scopeType: 'TENANT', isDangerous: true },
  { code: 'payments.read.execute', name: 'View Payments', description: 'View payments, receipts', module: 'finance', action: 'read', resource: 'payment', scopeType: 'TENANT', isDangerous: false },
  { code: 'payments.create.execute', name: 'Record Payment', description: 'Record manual payment', module: 'finance', action: 'create', resource: 'payment', scopeType: 'TENANT', isDangerous: false },
  { code: 'payments.refund.execute', name: 'Process Refund', description: 'Issue refund', module: 'finance', action: 'execute', resource: 'refund', scopeType: 'TENANT', isDangerous: true },
  { code: 'concessions.approve.execute', name: 'Approve Concession', description: 'Approve discount, scholarship', module: 'finance', action: 'approve', resource: 'concession', scopeType: 'TENANT', isDangerous: true },
];

// ─────────────────────────────────────────────
// INVENTORY + HR + ADMIN
// ─────────────────────────────────────────────
export const OPERATIONS_PERMISSIONS: PermissionSeed[] = [
  { code: 'inventory.read.execute', name: 'View Inventory', description: 'View items, stock', module: 'inventory', action: 'read', resource: 'item', scopeType: 'TENANT', isDangerous: false },
  { code: 'inventory.create.execute', name: 'Create Item', description: 'Add new inventory item', module: 'inventory', action: 'create', resource: 'item', scopeType: 'TENANT', isDangerous: false },
  { code: 'inventory.update.execute', name: 'Update Stock', description: 'Issue, receive stock', module: 'inventory', action: 'update', resource: 'stock', scopeType: 'TENANT', isDangerous: false },
  { code: 'po.approve.execute', name: 'Approve PO', description: 'Approve purchase order', module: 'inventory', action: 'approve', resource: 'po', scopeType: 'TENANT', isDangerous: false },
  { code: 'hr.read.execute', name: 'View Staff', description: 'View employees, payroll', module: 'hr', action: 'read', resource: 'employee', scopeType: 'TENANT', isDangerous: false },
  { code: 'hr.create.execute', name: 'Add Staff', description: 'Add new employee', module: 'hr', action: 'create', resource: 'employee', scopeType: 'TENANT', isDangerous: false },
  { code: 'hr.update.execute', name: 'Update Staff', description: 'Modify employee', module: 'hr', action: 'update', resource: 'employee', scopeType: 'TENANT', isDangerous: false },
  { code: 'payroll.approve.execute', name: 'Approve Payroll', description: 'Approve monthly payroll', module: 'hr', action: 'approve', resource: 'payroll', scopeType: 'TENANT', isDangerous: true },
  { code: 'administration.read.execute', name: 'View Admin', description: 'View visitors, assets', module: 'administration', action: 'read', resource: 'admin', scopeType: 'TENANT', isDangerous: false },
];

// ─────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────
export const REPORTS_PERMISSIONS: PermissionSeed[] = [
  { code: 'reports.read.execute', name: 'View Reports', description: 'View dashboards, KPIs', module: 'reports', action: 'read', resource: 'report', scopeType: 'TENANT', isDangerous: false },
  { code: 'reports.export.execute', name: 'Export Reports', description: 'Download report exports', module: 'reports', action: 'export', resource: 'report', scopeType: 'TENANT', isDangerous: false },
];

// ─────────────────────────────────────────────
// AI (Wave 18) — 5 AI-powered endpoints
// ─────────────────────────────────────────────
export const AI_PERMISSIONS: PermissionSeed[] = [
  { code: 'ai.execute.tenant', name: 'AI Endpoints', description: 'Generate lesson plans, report cards, observation suggestions, reply suggestions, and operational insights via AI', module: 'ai', action: 'execute', resource: 'ai', scopeType: 'TENANT', isDangerous: false },
];

export const ALL_PERMISSIONS: PermissionSeed[] = [
  ...PLATFORM_PERMISSIONS,
  ...IDENTITY_PERMISSIONS,
  ...STUDENT_PERMISSIONS,
  ...ADMISSIONS_PERMISSIONS,
  ...ATTENDANCE_PERMISSIONS,
  ...FINANCE_PERMISSIONS,
  ...OPERATIONS_PERMISSIONS,
  ...REPORTS_PERMISSIONS,
  ...AI_PERMISSIONS,
];

// ─────────────────────────────────────────────
// Default Roles + RBAC Matrix
// Per ADR v1.0: 11 staff roles + Parent
// ─────────────────────────────────────────────

export interface RoleSeed {
  code: string;
  name: string;
  description: string;
  scope: 'PLATFORM' | 'TENANT' | 'BRANCH' | 'CLASSROOM';
  isSystem: boolean;
  color: string;
  sortOrder: number;
  /** Permission codes granted to this role. */
  permissions: string[];
}

const ALL_READ_PERMS = [
  'users.read.execute', 'roles.read.execute', 'permissions.read.execute', 'branches.read.execute',
  'students.read.execute', 'academics.read.execute', 'leads.read.execute', 'applications.read.execute',
  'attendance.read.execute', 'communication.read.execute',
  'fees.read.execute', 'invoices.read.execute', 'payments.read.execute',
  'inventory.read.execute', 'hr.read.execute', 'administration.read.execute',
  'reports.read.execute',
];

export const DEFAULT_ROLES: RoleSeed[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Platform-wide super admin (bypasses RBAC).',
    scope: 'PLATFORM',
    isSystem: true,
    color: '#DC2626',
    sortOrder: 1,
    permissions: ['platform.admin.execute'], // SUPER_ADMIN bypasses RBAC entirely (PermissionsGuard)
  },
  {
    code: 'SCHOOL_ADMIN',
    name: 'School Administrator',
    description: 'Full tenant admin — manages branches, users, billing.',
    scope: 'TENANT',
    isSystem: true,
    color: '#7C3AED',
    sortOrder: 2,
    permissions: ALL_PERMISSIONS.filter((p) => p.scopeType === 'TENANT' || p.scopeType === 'BRANCH' || p.scopeType === 'CLASSROOM').map((p) => p.code),
  },
  {
    code: 'PRINCIPAL',
    name: 'Principal / Center Head',
    description: 'Branch head — daily operations, approvals, staff.',
    scope: 'BRANCH',
    isSystem: true,
    color: '#2563EB',
    sortOrder: 3,
    permissions: [
      ...ALL_READ_PERMS,
      'students.create.execute', 'students.update.execute',
      'academics.create.execute', 'academics.update.execute', 'academics.approve.execute',
      'attendance.create.execute', 'attendance.update.execute', 'attendance.approve.execute',
      'communication.create.execute', 'communication.approve.execute',
      'applications.approve.execute', 'applications.reject.execute',
      'concessions.approve.execute',
      'po.approve.execute', 'payroll.approve.execute',
      'reports.export.execute',
    ],
  },
  {
    code: 'COORDINATOR',
    name: 'Academic Coordinator',
    description: 'Manages curriculum, observations, report cards.',
    scope: 'BRANCH',
    isSystem: true,
    color: '#0891B2',
    sortOrder: 4,
    permissions: [
      ...ALL_READ_PERMS,
      'students.update.execute',
      'academics.create.execute', 'academics.update.execute', 'academics.approve.execute',
      'attendance.read.execute', 'attendance.update.execute',
      'communication.create.execute',
      'reports.export.execute',
    ],
  },
  {
    code: 'CLASS_TEACHER',
    name: 'Class Teacher',
    description: 'Manages own classroom — attendance, observations, parent chat.',
    scope: 'CLASSROOM',
    isSystem: true,
    color: '#16A34A',
    sortOrder: 5,
    permissions: [
      'students.read.execute', 'academics.read.execute',
      'academics.create.execute', 'academics.update.execute',
      'attendance.read.execute', 'attendance.create.execute', 'attendance.update.execute',
      'communication.read.execute', 'communication.create.execute',
      'reports.read.execute',
    ],
  },
  {
    code: 'ACTIVITY_TEACHER',
    name: 'Activity Teacher',
    description: 'Specialist teacher (art, music, sports) — multi-classroom scope.',
    scope: 'CLASSROOM',
    isSystem: true,
    color: '#65A30D',
    sortOrder: 6,
    permissions: [
      'students.read.execute', 'academics.read.execute',
      'academics.create.execute', 'academics.update.execute',
      'attendance.read.execute',
      'communication.read.execute', 'communication.create.execute',
    ],
  },
  {
    code: 'RECEPTION_ADMISSION',
    name: 'Reception / Admissions',
    description: 'Front desk — leads, applications, visitor log.',
    scope: 'TENANT',
    isSystem: true,
    color: '#CA8A04',
    sortOrder: 7,
    permissions: [
      ...ALL_READ_PERMS.filter((p) => ['leads.read.execute', 'applications.read.execute', 'students.read.execute', 'communication.read.execute', 'administration.read.execute', 'branches.read.execute'].includes(p)),
      'leads.create.execute', 'leads.update.execute',
      'applications.create.execute', 'applications.update.execute',
      'communication.create.execute',
      'administration.read.execute',
    ],
  },
  {
    code: 'ACCOUNTS',
    name: 'Accountant',
    description: 'Manages fees, invoices, payments, GST.',
    scope: 'TENANT',
    isSystem: true,
    color: '#9333EA',
    sortOrder: 8,
    permissions: [
      'fees.read.execute', 'fees.create.execute', 'fees.update.execute',
      'invoices.read.execute', 'invoices.create.execute', 'invoices.update.execute',
      'payments.read.execute', 'payments.create.execute',
      'concessions.approve.execute',
      'students.read.execute', 'branches.read.execute',
      'reports.read.execute', 'reports.export.execute',
    ],
  },
  {
    code: 'INVENTORY_STORE_KEEPER',
    name: 'Storekeeper',
    description: 'Manages inventory, POs, GRNs.',
    scope: 'TENANT',
    isSystem: true,
    color: '#9F1239',
    sortOrder: 9,
    permissions: [
      'inventory.read.execute', 'inventory.create.execute', 'inventory.update.execute',
      'po.approve.execute',
      'reports.read.execute',
    ],
  },
  {
    code: 'TRANSPORT_MANAGER',
    name: 'Transport Manager',
    description: 'Manages buses, drivers, routes (Wave 7).',
    scope: 'TENANT',
    isSystem: true,
    color: '#1D4ED8',
    sortOrder: 10,
    permissions: [
      'administration.read.execute',
      'students.read.execute',
      'reports.read.execute',
    ],
  },
  {
    code: 'HR',
    name: 'HR Manager',
    description: 'Manages staff, payroll, leave, BGV.',
    scope: 'TENANT',
    isSystem: true,
    color: '#BE185D',
    sortOrder: 11,
    permissions: [
      'hr.read.execute', 'hr.create.execute', 'hr.update.execute',
      'payroll.approve.execute',
      'users.read.execute',
      'reports.read.execute', 'reports.export.execute',
    ],
  },
  {
    code: 'PARENT',
    name: 'Parent / Guardian',
    description: 'Parent of student — view child info, pay fees, chat with teacher.',
    scope: 'TENANT',
    isSystem: true,
    color: '#475569',
    sortOrder: 12,
    permissions: [
      'students.read.execute',
      'attendance.read.execute',
      'communication.read.execute', 'communication.create.execute',
      'invoices.read.execute',
      'payments.read.execute', 'payments.create.execute',
      'reports.read.execute',
    ],
  },
];

export const ROLE_CODE_LIST = DEFAULT_ROLES.map((r) => r.code);
