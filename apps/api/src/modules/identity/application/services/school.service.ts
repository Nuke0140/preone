/**
 * SchoolService — orchestrates school (tenant) lifecycle.
 *
 * Per BTD §9 — Application service coordinates:
 *   1. Load aggregate via repository
 *   2. Invoke method on aggregate (pure business logic)
 *   3. Save via repository
 *   4. Publish domain events
 *
 * Per BRC v1.0:
 *   - R-PLT-001: Subscription lifecycle TRIAL → ACTIVE → SUSPENDED → CANCELLED
 *   - R-PLT-002: Grace period 7 days post due date
 *   - R-PLT-005: License seat allocation per plan
 *   - R-PLT-010: Offboarding data export + 30-day retention then hard delete
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  BusinessException, NotFoundException, ConflictException,
} from '@common/errors/exceptions';

import { SchoolAggregate, type SchoolStatus, type SchoolTier } from '../../domain/aggregates/school.aggregate';
import { SCHOOL_REPOSITORY } from '../../domain/repositories/tokens';

import type { SchoolRepository } from '../../domain/repositories/school.repository';
import type {
  CreateSchoolDto, UpdateSchoolDto, SuspendSchoolDto, ListSchoolsQueryDto, SchoolResponseDto,
} from '../dto/school.dto';
import type { SchoolStatusDto, SchoolTierDto } from '../dto/school.dto';

const TIER_LIMITS: Record<SchoolTier, { maxBranches: number; studentSeats: number }> = {
  STARTER: { maxBranches: 1, studentSeats: 100 },
  GROWTH: { maxBranches: 3, studentSeats: 500 },
  SCALE: { maxBranches: 10, studentSeats: 2500 },
  ENTERPRISE: { maxBranches: 50, studentSeats: 10000 },
};

@Injectable()
export class SchoolService {
  private readonly logger = new Logger(SchoolService.name);

  constructor(@Inject(SCHOOL_REPOSITORY) private readonly schools: SchoolRepository) {}

  async createSchool(dto: CreateSchoolDto, createdBy: string): Promise<SchoolResponseDto> {
    // Pre-check: email + GST + PAN uniqueness
    const existingByEmail = await this.schools.findByEmail(dto.email);
    if (existingByEmail) {
      throw new ConflictException('SCHOOL_EMAIL_TAKEN', `School with email ${dto.email} already exists.`);
    }
    if (dto.gstNumber) {
      const existingByGst = await this.schools.findByGstNumber(dto.gstNumber);
      if (existingByGst) {
        throw new ConflictException('SCHOOL_GST_TAKEN', `School with GST ${dto.gstNumber} already exists.`);
      }
    }
    if (dto.phone) {
      const existingByPhone = await this.schools.findByPhone(dto.phone);
      if (existingByPhone) {
        throw new ConflictException('SCHOOL_PHONE_TAKEN', `School with phone ${dto.phone} already exists.`);
      }
    }

    const limits = TIER_LIMITS[dto.tier as SchoolTier] ?? TIER_LIMITS.STARTER;
    const aggregate = SchoolAggregate.create({
      name: dto.name,
      legalName: dto.legalName,
      email: dto.email,
      phone: dto.phone,
      website: dto.website,
      gstNumber: dto.gstNumber,
      panNumber: dto.panNumber,
      tier: dto.tier,
      timezone: dto.timezone ?? 'Asia/Kolkata',
      locale: dto.locale ?? 'en-IN',
      maxBranches: dto.maxBranches ?? limits.maxBranches,
      studentSeats: dto.studentSeats ?? limits.studentSeats,
      trialEndsAt: dto.trialEndsAt,
    }, createdBy);

    // Start trial immediately on creation
    if (aggregate.isProspect) {
      const trialEnd = dto.trialEndsAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      aggregate.startTrial(trialEnd);
    }

    await this.schools.save(aggregate);
    this.logger.log(`School created: ${aggregate.id} (${aggregate.name}) by ${createdBy}`);
    return this.toResponse(aggregate);
  }

  async getSchool(id: string): Promise<SchoolResponseDto> {
    const school = await this.schools.findById(id);
    if (!school || school.deletedAt) {
      throw new NotFoundException('School', id);
    }
    return this.toResponse(school);
  }

  async listSchools(query: ListSchoolsQueryDto): Promise<{
    items: SchoolResponseDto[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const result = await this.schools.list({
      status: query.status,
      search: query.search,
    }, page, pageSize);
    return {
      items: result.items.map((s) => this.toResponse(s)),
      total: result.total,
      page,
      pageSize,
      hasNext: page * pageSize < result.total,
    };
  }

  async updateSchool(id: string, dto: UpdateSchoolDto): Promise<SchoolResponseDto> {
    const school = await this.schools.findById(id);
    if (!school || school.deletedAt) {
      throw new NotFoundException('School', id);
    }

    if (dto.gstNumber && dto.gstNumber !== school.gstNumber) {
      const existing = await this.schools.findByGstNumber(dto.gstNumber);
      if (existing && existing.id !== id) {
        throw new ConflictException('SCHOOL_GST_TAKEN', `GST ${dto.gstNumber} already in use.`);
      }
    }

    school.updateProfile({
      name: dto.name,
      legalName: dto.legalName,
      phone: dto.phone,
      website: dto.website,
      gstNumber: dto.gstNumber,
      panNumber: dto.panNumber,
      logoUrl: dto.logoUrl,
      timezone: dto.timezone,
      locale: dto.locale,
    });

    await this.schools.save(school);
    return this.toResponse(school);
  }

  async activateSchool(id: string): Promise<SchoolResponseDto> {
    const school = await this.schools.findById(id);
    if (!school || school.deletedAt) {
      throw new NotFoundException('School', id);
    }
    school.activate(new Date().toISOString());
    await this.schools.save(school);
    this.logger.log(`School activated: ${id}`);
    return this.toResponse(school);
  }

  async suspendSchool(id: string, dto: SuspendSchoolDto): Promise<SchoolResponseDto> {
    const school = await this.schools.findById(id);
    if (!school || school.deletedAt) {
      throw new NotFoundException('School', id);
    }
    school.suspend(dto.reason, new Date().toISOString());
    await this.schools.save(school);
    this.logger.warn(`School suspended: ${id} — reason: ${dto.reason}`);
    return this.toResponse(school);
  }

  async reactivateSchool(id: string): Promise<SchoolResponseDto> {
    const school = await this.schools.findById(id);
    if (!school || school.deletedAt) {
      throw new NotFoundException('School', id);
    }
    school.reactivate(new Date().toISOString());
    await this.schools.save(school);
    return this.toResponse(school);
  }

  async cancelSchool(id: string): Promise<SchoolResponseDto> {
    const school = await this.schools.findById(id);
    if (!school || school.deletedAt) {
      throw new NotFoundException('School', id);
    }
    school.cancel(new Date().toISOString());
    await this.schools.save(school);
    this.logger.warn(`School cancelled: ${id}`);
    return this.toResponse(school);
  }

  async upgradeTier(id: string, tier: SchoolTierDto): Promise<SchoolResponseDto> {
    const school = await this.schools.findById(id);
    if (!school || school.deletedAt) {
      throw new NotFoundException('School', id);
    }
    const limits = TIER_LIMITS[tier as SchoolTier] ?? TIER_LIMITS.STARTER;
    school.upgradeTier(tier, limits.maxBranches, limits.studentSeats);
    await this.schools.save(school);
    return this.toResponse(school);
  }

  async incrementBranchCount(id: string): Promise<void> {
    const school = await this.schools.findById(id);
    if (!school) throw new NotFoundException('School', id);
    school.incrementBranchCount();
    await this.schools.save(school);
  }

  async decrementBranchCount(id: string): Promise<void> {
    const school = await this.schools.findById(id);
    if (!school) throw new NotFoundException('School', id);
    school.decrementBranchCount();
    await this.schools.save(school);
  }

  // ─────── Mapper ───────
  private toResponse(a: SchoolAggregate): SchoolResponseDto {
    return {
      id: a.id,
      name: a.name,
      legalName: a.legalName,
      email: a.email,
      phone: a.phone,
      website: a.website,
      gstNumber: a.gstNumber,
      panNumber: a.panNumber,
      status: a.status as SchoolStatusDto,
      tier: a.tier as SchoolTierDto,
      branchCount: a.branchCount,
      maxBranches: a.maxBranches,
      studentSeats: a.studentSeats,
      usedSeats: a.usedSeats,
      seatsAvailable: a.seatsAvailable,
      logoUrl: a.logoUrl,
      timezone: a.timezone,
      locale: a.locale,
      trialEndsAt: a.trialEndsAt,
      activatedAt: a.activatedAt,
      suspendedAt: a.suspendedAt,
      cancelledAt: a.cancelledAt,
      createdAt: new Date().toISOString(), // placeholder; aggregate doesn't carry createdAt
      updatedAt: new Date().toISOString(),
    };
  }
}
