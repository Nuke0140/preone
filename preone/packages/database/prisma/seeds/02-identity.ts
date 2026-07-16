/**
 * Identity Defaults Seed — PreOne Platform
 * -----------------------------------------
 * Seeds:
 *   - Default School (if not already created by 01-master-data)
 *   - Super admin user
 *   - System roles: SUPER_ADMIN, SCHOOL_ADMIN, PRINCIPAL, TEACHER, PARENT, STUDENT,
 *     ACCOUNTANT, HR_MANAGER, RECEPTIONIST, TRANSPORT_MANAGER, LIBRARIAN
 *   - Core permissions (RBAC) per ADR-007
 *   - Role-permission bindings for default roles
 *
 * Per ERD v3.0 §25 (Seed Data → Identity Defaults).
 *
 * SECURITY: The default super admin password MUST be changed on first login.
 */
import { PrismaClient, SchoolStatus, SchoolTier, UserStatus, RoleScope, Gender } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const uuid = (name: string): string => {
  const h = crypto.createHash('sha256').update(name).digest();
  return [
    h.toString('hex', 0, 4),
    h.toString('hex', 4, 6),
    h.toString('hex', 6, 8),
    'a' + h.toString('hex', 8, 11),
    h.toString('hex', 11, 16) + h.toString('hex', 16, 19),
  ].join('-');
};

const SCHOOL_ID = uuid('platform:default-school');
const SUPER_ADMIN_ID = uuid('platform:super-admin');

// Placeholder password hash — REPLACE on first login via argon2id
const SUPER_ADMIN_PASSWORD_HASH = 'argon2id$placeholder.replace.on.first.login';

type RoleDef = { code: string; name: string; description: string; scope: RoleScope };

const roles: RoleDef[] = [
  { code: 'SUPER_ADMIN', name: 'Super Admin', description: 'Platform super administrator — full access across all tenants', scope: RoleScope.PLATFORM },
  { code: 'SCHOOL_ADMIN', name: 'School Admin', description: 'School administrator — full access within own tenant', scope: RoleScope.TENANT },
  { code: 'PRINCIPAL', name: 'Principal', description: 'Principal — academic + staff oversight', scope: RoleScope.TENANT },
  { code: 'TEACHER', name: 'Teacher', description: 'Teacher — class, attendance, observations, report cards', scope: RoleScope.BRANCH },
  { code: 'PARENT', name: 'Parent', description: 'Parent/Guardian — child view, fees, communication', scope: RoleScope.TENANT },
  { code: 'STUDENT', name: 'Student', description: 'Student — limited self-view (for senior classes)', scope: RoleScope.BRANCH },
  { code: 'ACCOUNTANT', name: 'Accountant', description: 'Accountant — fees, invoices, payments, ledger', scope: RoleScope.TENANT },
  { code: 'HR_MANAGER', name: 'HR Manager', description: 'HR Manager — staff, payroll, leave', scope: RoleScope.TENANT },
  { code: 'RECEPTIONIST', name: 'Receptionist', description: 'Receptionist — admissions, visitors, front office', scope: RoleScope.BRANCH },
  { code: 'TRANSPORT_MANAGER', name: 'Transport Manager', description: 'Transport Manager — vehicles, routes, trips', scope: RoleScope.TENANT },
  { code: 'LIBRARIAN', name: 'Librarian', description: 'Librarian — library operations', scope: RoleScope.BRANCH },
];

type PermissionDef = {
  code: string;       // e.g. 'students.create.execute'
  name: string;
  description: string;
  module: string;     // 'student', 'finance', etc.
  action: string;     // 'create','read','update','delete','execute','approve','reject','export','assign','configure'
  resource: string;
};

const permissions: PermissionDef[] = [
  // Identity
  { code: 'users.read.execute', name: 'View users', description: 'View users', module: 'identity', action: 'read', resource: 'user' },
  { code: 'users.write.execute', name: 'Manage users', description: 'Create/update users', module: 'identity', action: 'update', resource: 'user' },
  { code: 'users.delete.execute', name: 'Delete users', description: 'Delete users', module: 'identity', action: 'delete', resource: 'user' },
  { code: 'roles.read.execute', name: 'View roles', description: 'View roles', module: 'identity', action: 'read', resource: 'role' },
  { code: 'roles.write.execute', name: 'Manage roles', description: 'Manage roles', module: 'identity', action: 'update', resource: 'role' },
  // Student
  { code: 'students.read.execute', name: 'View students', description: 'View students', module: 'student', action: 'read', resource: 'student' },
  { code: 'students.create.execute', name: 'Create students', description: 'Create students', module: 'student', action: 'create', resource: 'student' },
  { code: 'students.update.execute', name: 'Update students', description: 'Update students', module: 'student', action: 'update', resource: 'student' },
  { code: 'students.delete.execute', name: 'Delete students', description: 'Delete students', module: 'student', action: 'delete', resource: 'student' },
  // Finance
  { code: 'invoices.read.execute', name: 'View invoices', description: 'View invoices', module: 'finance', action: 'read', resource: 'invoice' },
  { code: 'invoices.create.execute', name: 'Create invoices', description: 'Create invoices', module: 'finance', action: 'create', resource: 'invoice' },
  { code: 'payments.read.execute', name: 'View payments', description: 'View payments', module: 'finance', action: 'read', resource: 'payment' },
  { code: 'payments.create.execute', name: 'Record payments', description: 'Record payments', module: 'finance', action: 'create', resource: 'payment' },
  { code: 'refunds.create.execute', name: 'Process refunds', description: 'Process refunds', module: 'finance', action: 'create', resource: 'refund' },
  // HR
  { code: 'staff.read.execute', name: 'View staff', description: 'View staff', module: 'hr', action: 'read', resource: 'staff' },
  { code: 'staff.update.execute', name: 'Manage staff', description: 'Manage staff', module: 'hr', action: 'update', resource: 'staff' },
  { code: 'payroll.read.execute', name: 'View payroll', description: 'View payroll', module: 'hr', action: 'read', resource: 'payroll' },
  { code: 'payroll.create.execute', name: 'Run payroll', description: 'Run payroll', module: 'hr', action: 'create', resource: 'payroll' },
  // Admissions
  { code: 'admissions.read.execute', name: 'View admissions', description: 'View admissions', module: 'admission', action: 'read', resource: 'admission' },
  { code: 'admissions.update.execute', name: 'Process admissions', description: 'Process admissions', module: 'admission', action: 'update', resource: 'admission' },
  // Attendance
  { code: 'attendance.read.execute', name: 'View attendance', description: 'View attendance', module: 'attendance', action: 'read', resource: 'attendance' },
  { code: 'attendance.create.execute', name: 'Mark attendance', description: 'Mark attendance', module: 'attendance', action: 'create', resource: 'attendance' },
  // Communication
  { code: 'announcements.create.execute', name: 'Publish announcements', description: 'Publish announcements', module: 'communication', action: 'create', resource: 'announcement' },
  { code: 'messages.create.execute', name: 'Send messages', description: 'Send messages', module: 'communication', action: 'create', resource: 'message' },
  // Inventory
  { code: 'inventory.read.execute', name: 'View inventory', description: 'View inventory items', module: 'inventory', action: 'read', resource: 'inventory_item' },
  { code: 'inventory.update.execute', name: 'Manage inventory', description: 'Manage inventory items', module: 'inventory', action: 'update', resource: 'inventory_item' },
  { code: 'purchase_orders.create.execute', name: 'Create POs', description: 'Create purchase orders', module: 'inventory', action: 'create', resource: 'purchase_order' },
  // Academics
  { code: 'curriculum.update.execute', name: 'Manage curriculum', description: 'Manage curriculum', module: 'academics', action: 'update', resource: 'curriculum' },
  { code: 'report_cards.create.execute', name: 'Publish report cards', description: 'Publish report cards', module: 'academics', action: 'create', resource: 'report_card' },
  // Administration
  { code: 'assets.read.execute', name: 'View assets', description: 'View assets', module: 'admin', action: 'read', resource: 'asset' },
  { code: 'assets.update.execute', name: 'Manage assets', description: 'Manage assets', module: 'admin', action: 'update', resource: 'asset' },
  // Reports
  { code: 'reports.read.execute', name: 'View reports', description: 'View reports', module: 'reports', action: 'read', resource: 'report' },
  { code: 'reports.update.execute', name: 'Manage reports', description: 'Manage report definitions', module: 'reports', action: 'update', resource: 'report' },
  // Settings
  { code: 'settings.read.execute', name: 'View settings', description: 'View settings', module: 'settings', action: 'read', resource: 'setting' },
  { code: 'settings.update.execute', name: 'Manage settings', description: 'Manage settings', module: 'settings', action: 'update', resource: 'setting' },
  // Platform
  { code: 'tenants.update.execute', name: 'Provision tenants', description: 'Provision tenants', module: 'platform', action: 'update', resource: 'tenant' },
  { code: 'billing.update.execute', name: 'Manage billing', description: 'Manage billing', module: 'platform', action: 'update', resource: 'billing' },
];

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  SCHOOL_ADMIN: [
    'users.read.execute', 'users.write.execute', 'roles.read.execute',
    'students.read.execute', 'students.create.execute', 'students.update.execute', 'students.delete.execute',
    'invoices.read.execute', 'invoices.create.execute', 'payments.read.execute', 'payments.create.execute', 'refunds.create.execute',
    'staff.read.execute', 'staff.update.execute', 'payroll.read.execute', 'payroll.create.execute',
    'admissions.read.execute', 'admissions.update.execute',
    'attendance.read.execute', 'attendance.create.execute',
    'announcements.create.execute', 'messages.create.execute',
    'inventory.read.execute', 'inventory.update.execute', 'purchase_orders.create.execute',
    'curriculum.update.execute', 'report_cards.create.execute',
    'assets.read.execute', 'assets.update.execute',
    'reports.read.execute', 'reports.update.execute',
    'settings.read.execute', 'settings.update.execute',
  ],
  PRINCIPAL: [
    'users.read.execute', 'roles.read.execute',
    'students.read.execute', 'students.update.execute',
    'staff.read.execute', 'payroll.read.execute',
    'admissions.read.execute', 'admissions.update.execute',
    'attendance.read.execute', 'attendance.create.execute',
    'announcements.create.execute',
    'curriculum.update.execute', 'report_cards.create.execute',
    'reports.read.execute', 'reports.update.execute',
    'settings.read.execute',
  ],
  TEACHER: [
    'students.read.execute',
    'attendance.read.execute', 'attendance.create.execute',
    'messages.create.execute',
    'report_cards.create.execute',
    'reports.read.execute',
  ],
  PARENT: ['students.read.execute', 'invoices.read.execute', 'payments.read.execute', 'messages.create.execute'],
  STUDENT: ['students.read.execute'],
  ACCOUNTANT: [
    'invoices.read.execute', 'invoices.create.execute', 'payments.read.execute', 'payments.create.execute', 'refunds.create.execute',
    'reports.read.execute',
  ],
  HR_MANAGER: ['staff.read.execute', 'staff.update.execute', 'payroll.read.execute', 'payroll.create.execute', 'reports.read.execute'],
  RECEPTIONIST: ['admissions.read.execute', 'admissions.update.execute', 'students.read.execute', 'messages.create.execute'],
  TRANSPORT_MANAGER: ['students.read.execute', 'reports.read.execute'],
  LIBRARIAN: ['students.read.execute'],
};

async function main(): Promise<void> {
  console.log('🌱 Seeding identity defaults...');

  // 1) Ensure default school exists
  await prisma.school.upsert({
    where: { id: SCHOOL_ID },
    update: {},
    create: {
      id: SCHOOL_ID,
      name: 'PreOne Demo School',
      legalName: 'PreOne Demo School Foundation',
      email: 'admin@preone.demo',
      phone: '+919999999999',
      status: SchoolStatus.ACTIVE,
      tier: SchoolTier.GROWTH,
      branchCount: 1,
      maxBranches: 5,
      studentSeats: 500,
      usedSeats: 0,
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
    },
  });
  console.log(`  ✓ School: ${SCHOOL_ID}`);

  // 2) Super admin user (uses schoolId_email compound unique for upsert)
  await prisma.user.upsert({
    where: { schoolId_email: { schoolId: SCHOOL_ID, email: 'superadmin@preone.dev' } },
    update: {},
    create: {
      id: SUPER_ADMIN_ID,
      schoolId: SCHOOL_ID,
      email: 'superadmin@preone.dev',
      phone: '+919999999998',
      passwordHash: SUPER_ADMIN_PASSWORD_HASH,
      firstName: 'Super',
      lastName: 'Admin',
      gender: Gender.UNSPECIFIED,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });
  console.log(`  ✓ Super admin: ${SUPER_ADMIN_ID}`);

  // 3) Roles — use schoolId_code compound unique
  for (const role of roles) {
    const roleId = uuid(`platform:role:${role.code}`);
    await prisma.role.upsert({
      where: { schoolId_code: { schoolId: SCHOOL_ID, code: role.code } },
      update: { name: role.name, description: role.description, scope: role.scope, isSystem: true },
      create: {
        id: roleId,
        schoolId: SCHOOL_ID,
        code: role.code,
        name: role.name,
        description: role.description,
        scope: role.scope,
        isSystem: true,
      },
    });
  }
  console.log(`  ✓ ${roles.length} roles`);

  // 4) Permissions — use code unique
  for (const perm of permissions) {
    const permId = uuid(`platform:permission:${perm.code}`);
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, description: perm.description, module: perm.module, action: perm.action, resource: perm.resource },
      create: {
        id: permId,
        code: perm.code,
        name: perm.name,
        description: perm.description,
        module: perm.module,
        action: perm.action,
        resource: perm.resource,
      },
    });
  }
  console.log(`  ✓ ${permissions.length} permissions`);

  // 5) Role-permission bindings
  let bindingsCount = 0;
  for (const [roleCode, permCodes] of Object.entries(rolePermissions)) {
    if (permCodes.includes('*')) continue;
    const roleId = uuid(`platform:role:${roleCode}`);
    for (const code of permCodes) {
      const permissionId = uuid(`platform:permission:${code}`);
      try {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId } },
          update: {},
          create: { roleId, permissionId },
        });
        bindingsCount++;
      } catch (e) {
        // skip if duplicate
      }
    }
  }
  console.log(`  ✓ ${bindingsCount} role-permission bindings`);

  // 6) Bind super admin to SUPER_ADMIN role
  const superAdminRoleId = uuid('platform:role:SUPER_ADMIN');
  try {
    await prisma.userRole.upsert({
      where: {
        userId_roleId_schoolId_branchId_classroomId: {
          userId: SUPER_ADMIN_ID,
          roleId: superAdminRoleId,
          schoolId: SCHOOL_ID,
          branchId: '',
          classroomId: '',
        },
      },
      update: {},
      create: {
        userId: SUPER_ADMIN_ID,
        roleId: superAdminRoleId,
        schoolId: SCHOOL_ID,
      },
    });
    console.log(`  ✓ Super admin role binding`);
  } catch (e) {
    // Compound unique includes nullable branchId/classroomId — may need different approach
    // Fallback: create without upsert
    try {
      await prisma.userRole.create({
        data: {
          userId: SUPER_ADMIN_ID,
          roleId: superAdminRoleId,
          schoolId: SCHOOL_ID,
        },
      });
      console.log(`  ✓ Super admin role binding (create-only)`);
    } catch (e2) {
      console.warn(`  ⚠ Could not bind super admin role: ${(e2 as Error).message}`);
    }
  }

  console.log('✅ Identity defaults seeded');
}

main()
  .catch((e) => {
    console.error('❌ Identity seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
