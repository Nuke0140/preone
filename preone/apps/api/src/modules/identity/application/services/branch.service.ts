/**
 * BranchService — orchestrates branch lifecycle.
 *
 * Per BRC v1.0:
 *   - R-PLT-005: License seat allocation per plan (max branches enforced)
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { NotFoundException, ConflictException, BusinessException } from '@common/errors/exceptions';

import { BranchAggregate } from '../../domain/aggregates/branch.aggregate';
import { BRANCH_REPOSITORY, SCHOOL_REPOSITORY } from '../../domain/repositories/tokens';

import type { BranchRepository } from '../../domain/repositories/branch.repository';
import type { SchoolRepository } from '../../domain/repositories/school.repository';
import type {
  CreateBranchDto, UpdateBranchDto, ListBranchesQueryDto, BranchResponseDto,
} from '../dto/branch.dto';

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branches: BranchRepository,
    @Inject(SCHOOL_REPOSITORY) private readonly schools: SchoolRepository,
  ) {}

  async createBranch(dto: CreateBranchDto, schoolId: string, createdBy: string): Promise<BranchResponseDto> {
    // Pre-check: unique code within school
    const existing = await this.branches.findByCode(schoolId, dto.code);
    if (existing) {
      throw new ConflictException('BRANCH_CODE_TAKEN', `Branch with code ${dto.code} already exists in this school.`);
    }

    // Verify school can add branch (maxBranches cap)
    const school = await this.schools.findById(schoolId);
    if (!school) throw new NotFoundException('School', schoolId);
    if (!school.canAddBranch()) {
      throw new BusinessException(
        'SCHOOL_MAX_BRANCHES_REACHED',
        `School has reached its max branches (${school.maxBranches}) for tier ${school.tier}.`,
      );
    }

    const aggregate = BranchAggregate.create({
      schoolId,
      code: dto.code,
      name: dto.name,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      phone: dto.phone ?? school.phone,
      email: dto.email,
      latitude: dto.latitude,
      longitude: dto.longitude,
      googlePlaceId: dto.googlePlaceId,
      timezone: dto.timezone ?? school.timezone,
      locale: dto.locale ?? school.locale,
    }, createdBy);

    await this.branches.save(aggregate);

    // Bump school.branchCount
    school.incrementBranchCount();
    await this.schools.save(school);

    this.logger.log(`Branch created: ${aggregate.id} (${aggregate.code}) by ${createdBy}`);
    return this.toResponse(aggregate);
  }

  async getBranch(id: string): Promise<BranchResponseDto> {
    const branch = await this.branches.findById(id);
    if (!branch || branch.deletedAt) {
      throw new NotFoundException('Branch', id);
    }
    return this.toResponse(branch);
  }

  async listBranches(query: ListBranchesQueryDto, schoolId: string): Promise<{
    items: BranchResponseDto[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const result = await this.branches.list({
      schoolId,
      isActive: query.isActive,
      search: query.search,
    }, page, pageSize);
    return {
      items: result.items.map((b) => this.toResponse(b)),
      total: result.total,
      page,
      pageSize,
      hasNext: page * pageSize < result.total,
    };
  }

  async updateBranch(id: string, dto: UpdateBranchDto): Promise<BranchResponseDto> {
    const branch = await this.branches.findById(id);
    if (!branch || branch.deletedAt) {
      throw new NotFoundException('Branch', id);
    }
    branch.updateProfile({
      name: dto.name,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      phone: dto.phone,
      email: dto.email,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    if (dto.isActive !== undefined) {
      if (dto.isActive) branch.activate();
      else branch.deactivate(new Date().toISOString());
    }

    await this.branches.save(branch);
    return this.toResponse(branch);
  }

  async deactivateBranch(id: string): Promise<BranchResponseDto> {
    const branch = await this.branches.findById(id);
    if (!branch || branch.deletedAt) {
      throw new NotFoundException('Branch', id);
    }
    branch.deactivate(new Date().toISOString());
    await this.branches.save(branch);
    // Decrement school.branchCount
    const school = await this.schools.findById(branch.schoolId);
    if (school) {
      school.decrementBranchCount();
      await this.schools.save(school);
    }
    return this.toResponse(branch);
  }

  // ─────── Mapper ───────
  private toResponse(a: BranchAggregate): BranchResponseDto {
    return {
      id: a.id,
      schoolId: a.schoolId,
      code: a.code,
      name: a.name,
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      country: a.country,
      latitude: a.latitude,
      longitude: a.longitude,
      googlePlaceId: a.googlePlaceId,
      phone: a.phone,
      email: a.email,
      timezone: a.timezone,
      locale: a.locale,
      isActive: a.isActive,
      openedAt: a.openedAt,
      closedAt: a.closedAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
