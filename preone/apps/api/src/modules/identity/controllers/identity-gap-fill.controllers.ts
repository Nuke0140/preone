/**
 * Identity Gap-Fill Controllers — Wave 21.
 *
 * Adds 15 missing REST endpoints across the Identity bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1):
 *   PATCH  /v1/users/:id                                — Update user profile
 *   DELETE /v1/users/:id                                — Soft-delete user
 *   POST   /v1/users/:id/activate                       — Activate a deactivated user
 *   POST   /v1/users/:id/deactivate                     — Deactivate a user
 *   POST   /v1/users/:id/reset-password                 — Trigger password reset flow
 *   POST   /v1/users/:id/lock                           — Lock user account
 *   POST   /v1/users/:id/unlock                         — Unlock user account
 *   PATCH  /v1/roles/:id                                — Update role metadata
 *   DELETE /v1/roles/:id                                — Delete role (must be unassigned)
 *   GET    /v1/roles/:id/permissions                    — List permissions granted to a role
 *   PATCH  /v1/branches/:id                             — Update branch info
 *   DELETE /v1/branches/:id                             — Deactivate branch
 *   PATCH  /v1/schools/:id                              — Update school info
 *   GET    /v1/schools/:id/branches                     — List branches under a school
 *   GET    /v1/permissions/search                       — Search permissions by code/label
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

@Controller('v1')
export class IdentityGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('users/:id')
  async patchUsersByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Identity.UpdateUser',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('users/:id')
  async deleteUsersByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Identity.DeleteUser',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('users/:id/activate')
  async postUsersByidActivate(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Identity.Activate',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('users/:id/deactivate')
  async postUsersByidDeactivate(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Identity.Deactivate',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('users/:id/reset-password')
  async postUsersByidResetpassword(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Identity.ResetPassword',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('users/:id/lock')
  async postUsersByidLock(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Identity.Lock',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('users/:id/unlock')
  async postUsersByidUnlock(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Identity.Unlock',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1')
export class IdentityGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('roles/:id')
  async patchRolesByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Identity.UpdateRole',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('roles/:id')
  async deleteRolesByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Identity.DeleteRole',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('roles/:id/permissions')
  async getRolesByidPermissions(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Identity.ListRolePermissions',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('branches/:id')
  async patchBranchesByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Identity.UpdateBranche',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('branches/:id')
  async deleteBranchesByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Identity.DeleteBranche',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Patch('schools/:id')
  async patchSchoolsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Identity.UpdateSchool',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('schools/:id/branches')
  async getSchoolsByidBranches(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Identity.ListSchoolBranches',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1')
export class IdentityGapFillControllerPart3 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Get('permissions/search')
  async getPermissionsSearch(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Identity.ListSearch',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}


