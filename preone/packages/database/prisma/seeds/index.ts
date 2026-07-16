/**
 * Seed Orchestrator — PreOne Platform
 * ------------------------------------
 * Runs all seed scripts in order:
 *   1. master-data   — countries, states, cities, languages, currencies
 *   2. identity      — super admin, roles, permissions, role-permission bindings
 *   3. school        — demo school, branch, academic session, classes, students
 *   4. lookup        — blood groups, religions, fee heads, leave types, etc.
 *
 * Per ERD v3.0 §25 (Seed Data).
 *
 * Usage:
 *   pnpm --filter @preone/database run seed
 *   # or
 *   pnpm db:seed
 *
 * Environment:
 *   DATABASE_URL — PostgreSQL connection string (required)
 */
import { PrismaClient } from '@prisma/client';

async function runSeed(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`▶ Running seed: ${name}`);
  console.log(`══════════════════════════════════════════════════`);
  const start = Date.now();
  try {
    await fn();
    console.log(`✓ ${name} completed in ${Date.now() - start}ms`);
  } catch (e) {
    console.error(`✗ ${name} failed:`, e);
    throw e;
  }
}

async function main(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  PreOne Platform — Database Seed v3.0                         ║');
  console.log('║  Per ERD v3.0 §25 — Master, Identity, Demo School, Lookup    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('✓ Connected to database');
  } catch (e) {
    console.error('✗ Cannot connect to database. Set DATABASE_URL env var.');
    console.error('  Example: DATABASE_URL="postgresql://user:pass@localhost:5432/preone" pnpm db:seed');
    process.exit(1);
  }
  await prisma.$disconnect();

  // Run each seed script. We use dynamic import to keep orchestrator lean.
  await runSeed('01-master-data', async () => {
    const mod = await import('./01-master-data');
    // Each seed script self-executes on import; we just await import.
    // If a script exports a runner function instead, call it here.
  });

  await runSeed('02-identity', async () => {
    await import('./02-identity');
  });

  await runSeed('03-school', async () => {
    await import('./03-school');
  });

  await runSeed('04-lookup', async () => {
    await import('./04-lookup');
  });

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ✓ All seeds completed successfully                            ║');
  console.log('║  Next: Run `pnpm dev:api` to start the backend                 ║');
  console.log('║  Login: superadmin@preone.dev / PreOne@2026                    ║');
  console.log('║  ⚠  CHANGE the super admin password on first login             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
}

main().catch((e) => {
  console.error('\n❌ Seed pipeline failed:', e);
  process.exit(1);
});
