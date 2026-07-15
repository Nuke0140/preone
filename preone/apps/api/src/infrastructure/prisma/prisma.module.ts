/**
 * PrismaModule — Prisma client wiring + multi-tenant RLS hook.
 *
 * Per BTD §21.3 PostgreSQL RLS Policy:
 *   - Each connection sets app.tenant_id session variable
 *   - RLS policies filter rows automatically
 *   - Platform admin role has BYPASSRLS
 *
 * Per BTD §25.3 Connection Pooling:
 *   - Formula: pool_size = (num_cpus * 2) + 1
 *   - Pool wait time monitored + alert on >100ms
 *
 * Per ERD v3.0 §5.2 Tenant-Scoped Connections:
 *   - On connection acquire: SET app.school_id = ?
 *   - On connection release: RESET app.school_id
 */
import { Global, Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaModule.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
    this.logger.log('✅ Prisma connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
    this.logger.log('🔌 Prisma disconnected');
  }
}
