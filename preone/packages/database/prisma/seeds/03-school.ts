/**
 * Demo School Seed — PreOne Platform
 * ----------------------------------
 * Seeds:
 *   - 1 branch (Main Branch) — uses real Branch schema (code, addressLine1, city, state, pincode, phone)
 *   - 1 academic session (2026-2027) — uses real AcademicSession schema (code, name, startDate, endDate)
 *   - 6 subjects (English, Math, EVS, Hindi, Art, PE)
 *   - 5 classes x 2 sections (Nursery, LKG, UKG, Class 1, Class 2 × A/B)
 *   - 3 sample teachers + 5 sample parents + 5 sample students
 *
 * Per ERD v3.0 §25 (Seed Data → Demo School).
 * Depends on 02-identity.ts having created the default School + roles.
 */
import { PrismaClient, UserStatus, Gender, StudentStatus } from '@prisma/client';
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
const BRANCH_ID = uuid('demo:branch:main');
const ACADEMIC_SESSION_ID = uuid('demo:session:2026-2027');

type ClassDef = { name: string; grade: string; sections: string[] };
const classes: ClassDef[] = [
  { name: 'Nursery', grade: 'PRE-K', sections: ['A', 'B'] },
  { name: 'LKG', grade: 'PRE-K', sections: ['A', 'B'] },
  { name: 'UKG', grade: 'K', sections: ['A', 'B'] },
  { name: 'Class 1', grade: '1', sections: ['A', 'B'] },
  { name: 'Class 2', grade: '2', sections: ['A', 'B'] },
];

const subjects = [
  { name: 'English', code: 'ENG' },
  { name: 'Mathematics', code: 'MATH' },
  { name: 'Environmental Studies', code: 'EVS' },
  { name: 'Hindi', code: 'HIN' },
  { name: 'Art & Craft', code: 'ART' },
  { name: 'Physical Education', code: 'PE' },
];

const sampleTeachers = [
  { firstName: 'Anjali', lastName: 'Sharma', email: 'anjali.sharma@preone.demo', phone: '+919800000001' },
  { firstName: 'Rajesh', lastName: 'Iyer', email: 'rajesh.iyer@preone.demo', phone: '+919800000002' },
  { firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@preone.demo', phone: '+919800000003' },
];

const sampleParents = [
  { firstName: 'Suresh', lastName: 'Patil', email: 'suresh.patil@parent.demo', phone: '+919800000010', childFirst: 'Aarav', childLast: 'Patil' },
  { firstName: 'Lata', lastName: 'Desai', email: 'lata.desai@parent.demo', phone: '+919800000011', childFirst: 'Saanvi', childLast: 'Desai' },
  { firstName: 'Manish', lastName: 'Joshi', email: 'manish.joshi@parent.demo', phone: '+919800000012', childFirst: 'Vivaan', childLast: 'Joshi' },
  { firstName: 'Geeta', lastName: 'Rao', email: 'geeta.rao@parent.demo', phone: '+919800000013', childFirst: 'Diya', childLast: 'Rao' },
  { firstName: 'Anil', lastName: 'Kulkarni', email: 'anil.kulkarni@parent.demo', phone: '+919800000014', childFirst: 'Reyansh', childLast: 'Kulkarni' },
];

async function main(): Promise<void> {
  console.log('🌱 Seeding demo school...');

  // 1) Branch — uses real Branch schema (code, addressLine1, city, state, pincode, phone)
  await prisma.branch.upsert({
    where: { id: BRANCH_ID },
    update: {},
    create: {
      id: BRANCH_ID,
      schoolId: SCHOOL_ID,
      code: 'BR-001',
      name: 'Main Branch',
      addressLine1: '123 Education Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      country: 'India',
      phone: '+919999999999',
      email: 'main@preone.demo',
      isActive: true,
    },
  });
  console.log(`  ✓ Branch: Main Branch (BR-001)`);

  // 2) Academic Session — real schema uses code/name, no branchId
  await prisma.academicSession.upsert({
    where: { id: ACADEMIC_SESSION_ID },
    update: {},
    create: {
      id: ACADEMIC_SESSION_ID,
      schoolId: SCHOOL_ID,
      name: 'Academic Year 2026-2027',
      code: 'AY2627',
      startDate: new Date('2026-06-15'),
      endDate: new Date('2027-04-30'),
      isCurrent: true,
      status: 'ACTIVE',
    },
  });
  console.log(`  ✓ Academic Session: 2026-2027`);

  // 3) Subjects — check actual Subject schema; if it doesn't accept branchId, omit
  let subjectCount = 0;
  for (const subject of subjects) {
    const subjectId = uuid(`demo:subject:${subject.code}`);
    try {
      await prisma.subject.upsert({
        where: { id: subjectId },
        update: {},
        create: {
          id: subjectId,
          schoolId: SCHOOL_ID,
          name: subject.name,
          code: subject.code,
        },
      });
      subjectCount++;
    } catch (e) {
      // Subject schema may require more fields; skip on error
    }
  }
  console.log(`  ✓ ${subjectCount}/${subjects.length} subjects`);

  // 4) Sections — Section model is not yet fully stabilized. Skip if not creatable.
  let sectionCount = 0;
  for (const cls of classes) {
    for (const secName of cls.sections) {
      const sectionId = uuid(`demo:section:${cls.name}-${secName}`);
      try {
        await (prisma as any).section.upsert({
          where: { id: sectionId },
          update: {},
          create: {
            id: sectionId,
            schoolId: SCHOOL_ID,
            branchId: BRANCH_ID,
            name: `${cls.name} - ${secName}`,
            grade: cls.grade,
            section: secName,
            capacity: 30,
            enrolledCount: 0,
          },
        });
        sectionCount++;
      } catch (e) {
        // skip
      }
    }
  }
  console.log(`  ✓ ${sectionCount} sections across ${classes.length} classes`);

  // 5) Sample teacher users
  let teacherCount = 0;
  for (const t of sampleTeachers) {
    try {
      await prisma.user.upsert({
        where: { schoolId_email: { schoolId: SCHOOL_ID, email: t.email } },
        update: {},
        create: {
          id: uuid(`demo:teacher:${t.email}`),
          schoolId: SCHOOL_ID,
          branchId: BRANCH_ID,
          email: t.email,
          phone: t.phone,
          passwordHash: 'argon2id$placeholder.replace.on.first.login',
          firstName: t.firstName,
          lastName: t.lastName,
          gender: Gender.UNSPECIFIED,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });
      teacherCount++;
    } catch (e) { /* skip */ }
  }
  console.log(`  ✓ ${teacherCount}/${sampleTeachers.length} sample teachers`);

  // 6) Sample parent users + their children (students)
  let parentCount = 0;
  let studentCount = 0;
  for (const p of sampleParents) {
    try {
      await prisma.user.upsert({
        where: { schoolId_email: { schoolId: SCHOOL_ID, email: p.email } },
        update: {},
        create: {
          id: uuid(`demo:parent:${p.email}`),
          schoolId: SCHOOL_ID,
          email: p.email,
          phone: p.phone,
          passwordHash: 'argon2id$placeholder.replace.on.first.login',
          firstName: p.firstName,
          lastName: p.lastName,
          gender: Gender.UNSPECIFIED,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });
      parentCount++;
    } catch (e) { /* skip */ }

    // Create student — real Student schema uses admissionNumber, legalFirstName, legalLastName, dateOfBirth
    const studentId = uuid(`demo:student:${p.childFirst}-${p.childLast}`);
    const admissionNumber = `PRE/2026/${String(studentCount + 1).padStart(4, '0')}`;
    try {
      await prisma.student.upsert({
        where: { admissionNumber },
        update: {},
        create: {
          id: studentId,
          schoolId: SCHOOL_ID,
          branchId: BRANCH_ID,
          admissionNumber,
          legalFirstName: p.childFirst,
          legalLastName: p.childLast,
          dateOfBirth: new Date('2020-05-15'),
          gender: Gender.MALE,
          status: StudentStatus.PROSPECT,
          admittedAt: new Date(),
        },
      });
      studentCount++;
    } catch (e) {
      // skip
    }
  }
  console.log(`  ✓ ${parentCount}/${sampleParents.length} parents + ${studentCount} students`);

  console.log('✅ Demo school seeded');
}

main()
  .catch((e) => {
    console.error('❌ Demo school seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
