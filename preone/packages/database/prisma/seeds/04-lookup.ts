/**
 * Lookup Tables Seed — PreOne Platform
 * ------------------------------------
 * Seeds domain lookup tables that are referenced by foreign keys:
 *   - Blood groups (O+, O-, A+, A-, B+, B-, AB+, AB-)
 *   - Religions (Hindu, Muslim, Christian, Sikh, Jain, Buddhist, Other)
 *   - Nationalities (Indian, NRI, OCI, Foreign)
 *   - Relationships (Father, Mother, Guardian, Grandparent)
 *   - Fee heads (Tuition, Transport, Library, Lab, Activity, Exam, Misc)
 *   - Leave types (Casual, Sick, Earned, Maternity, Paternity, Loss of Pay)
 *   - Allergy severities (Mild, Moderate, Severe, Anaphylactic)
 *
 * Per ERD v3.0 §25 (Seed Data → Lookup Tables).
 *
 * These lookups may not all have corresponding Prisma models yet; the seed uses
 * try/catch guards so it remains safe to run against partial schemas.
 */
import { PrismaClient } from '@prisma/client';
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

const bloodGroups = [
  { code: 'O_POS', name: 'O+', group: 'O', rh: 'POSITIVE' },
  { code: 'O_NEG', name: 'O-', group: 'O', rh: 'NEGATIVE' },
  { code: 'A_POS', name: 'A+', group: 'A', rh: 'POSITIVE' },
  { code: 'A_NEG', name: 'A-', group: 'A', rh: 'NEGATIVE' },
  { code: 'B_POS', name: 'B+', group: 'B', rh: 'POSITIVE' },
  { code: 'B_NEG', name: 'B-', group: 'B', rh: 'NEGATIVE' },
  { code: 'AB_POS', name: 'AB+', group: 'AB', rh: 'POSITIVE' },
  { code: 'AB_NEG', name: 'AB-', group: 'AB', rh: 'NEGATIVE' },
];

const religions = [
  { code: 'HINDU', name: 'Hindu' },
  { code: 'MUSLIM', name: 'Muslim' },
  { code: 'CHRISTIAN', name: 'Christian' },
  { code: 'SIKH', name: 'Sikh' },
  { code: 'JAIN', name: 'Jain' },
  { code: 'BUDDHIST', name: 'Buddhist' },
  { code: 'PARSI', name: 'Parsi' },
  { code: 'OTHER', name: 'Other' },
];

const nationalities = [
  { code: 'IN', name: 'Indian' },
  { code: 'NRI', name: 'Non-Resident Indian' },
  { code: 'OCI', name: 'Overseas Citizen of India' },
  { code: 'US', name: 'US Citizen' },
  { code: 'OTHER', name: 'Other' },
];

const relationships = [
  { code: 'FATHER', name: 'Father' },
  { code: 'MOTHER', name: 'Mother' },
  { code: 'GUARDIAN', name: 'Guardian' },
  { code: 'GRANDFATHER', name: 'Grandfather' },
  { code: 'GRANDMOTHER', name: 'Grandmother' },
  { code: 'UNCLE', name: 'Uncle' },
  { code: 'AUNT', name: 'Aunt' },
  { code: 'SIBLING', name: 'Sibling' },
];

const feeHeads = [
  { code: 'TUITION', name: 'Tuition Fee', frequency: 'MONTHLY', isCompulsory: true },
  { code: 'TRANSPORT', name: 'Transport Fee', frequency: 'MONTHLY', isCompulsory: false },
  { code: 'LIBRARY', name: 'Library Fee', frequency: 'ANNUAL', isCompulsory: true },
  { code: 'LAB', name: 'Lab Fee', frequency: 'ANNUAL', isCompulsory: false },
  { code: 'ACTIVITY', name: 'Activity Fee', frequency: 'QUARTERLY', isCompulsory: false },
  { code: 'EXAM', name: 'Examination Fee', frequency: 'ANNUAL', isCompulsory: true },
  { code: 'MISC', name: 'Miscellaneous', frequency: 'ONE_TIME', isCompulsory: false },
];

const leaveTypes = [
  { code: 'CL', name: 'Casual Leave', acronym: 'CL', isPaid: true, carryForward: false, defaultCount: 12 },
  { code: 'SL', name: 'Sick Leave', acronym: 'SL', isPaid: true, carryForward: false, defaultCount: 12 },
  { code: 'EL', name: 'Earned Leave', acronym: 'EL', isPaid: true, carryForward: true, defaultCount: 15 },
  { code: 'ML', name: 'Maternity Leave', acronym: 'ML', isPaid: true, carryForward: false, defaultCount: 84 },
  { code: 'PL', name: 'Paternity Leave', acronym: 'PL', isPaid: true, carryForward: false, defaultCount: 5 },
  { code: 'LOP', name: 'Loss of Pay', acronym: 'LOP', isPaid: false, carryForward: false, defaultCount: 0 },
];

const allergySeverities = [
  { code: 'MILD', name: 'Mild', level: 1 },
  { code: 'MODERATE', name: 'Moderate', level: 2 },
  { code: 'SEVERE', name: 'Severe', level: 3 },
  { code: 'ANAPHYLACTIC', name: 'Anaphylactic', level: 4 },
];

const transportTypes = [
  { code: 'ONE_WAY_PICKUP', name: 'One Way - Pickup' },
  { code: 'ONE_WAY_DROP', name: 'One Way - Drop' },
  { code: 'TWO_WAY', name: 'Two Way' },
];

async function main(): Promise<void> {
  console.log('🌱 Seeding lookup tables...');

  let count = 0;

  // Each lookup uses a guarded upsert — lookup tables may not exist yet.
  for (const bg of bloodGroups) {
    try {
      await (prisma as any).bloodGroup.upsert({
        where: { code: bg.code },
        update: {},
        create: { ...bg, schoolId: SCHOOL_ID },
      });
      count++;
    } catch (e) { /* skip */ }
  }

  for (const r of religions) {
    try {
      await (prisma as any).religion.upsert({
        where: { code: r.code },
        update: {},
        create: { ...r, schoolId: SCHOOL_ID },
      });
      count++;
    } catch (e) { /* skip */ }
  }

  for (const n of nationalities) {
    try {
      await (prisma as any).nationality.upsert({
        where: { code: n.code },
        update: {},
        create: { ...n, schoolId: SCHOOL_ID },
      });
      count++;
    } catch (e) { /* skip */ }
  }

  for (const rel of relationships) {
    try {
      await (prisma as any).relationship.upsert({
        where: { code: rel.code },
        update: {},
        create: { ...rel, schoolId: SCHOOL_ID },
      });
      count++;
    } catch (e) { /* skip */ }
  }

  for (const fh of feeHeads) {
    try {
      await (prisma as any).feeHead.upsert({
        where: { code: fh.code },
        update: {},
        create: { ...fh, schoolId: SCHOOL_ID },
      });
      count++;
    } catch (e) { /* skip */ }
  }

  for (const lt of leaveTypes) {
    try {
      await (prisma as any).leaveType.upsert({
        where: { code: lt.code },
        update: {},
        create: { ...lt, schoolId: SCHOOL_ID },
      });
      count++;
    } catch (e) { /* skip */ }
  }

  for (const s of allergySeverities) {
    try {
      await (prisma as any).allergySeverity.upsert({
        where: { code: s.code },
        update: {},
        create: { ...s, schoolId: SCHOOL_ID },
      });
      count++;
    } catch (e) { /* skip */ }
  }

  for (const t of transportTypes) {
    try {
      await (prisma as any).transportType.upsert({
        where: { code: t.code },
        update: {},
        create: { ...t, schoolId: SCHOOL_ID },
      });
      count++;
    } catch (e) { /* skip */ }
  }

  console.log(`✅ Lookup tables: ${count} rows seeded (guarded against missing models)`);
}

main()
  .catch((e) => {
    console.error('❌ Lookup seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
