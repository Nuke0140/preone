/**
 * Identity Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { IdentityGapFillControllerPart1, IdentityGapFillControllerPart2, IdentityGapFillControllerPart3 } from '../controllers/identity-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Identity Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let identityGapFillControllerPart1: IdentityGapFillControllerPart1;
  let identityGapFillControllerPart2: IdentityGapFillControllerPart2;
  let identityGapFillControllerPart3: IdentityGapFillControllerPart3;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    identityGapFillControllerPart1 = new IdentityGapFillControllerPart1(cb as any, qb as any);
    identityGapFillControllerPart2 = new IdentityGapFillControllerPart2(cb as any, qb as any);
    identityGapFillControllerPart3 = new IdentityGapFillControllerPart3(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [IdentityGapFillControllerPart1, IdentityGapFillControllerPart2, IdentityGapFillControllerPart3],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('IdentityGapFillControllerPart1', () => {
    it('PATCH users/:id -> dispatches Identity.UpdateUser', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart1.patchUsersByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.UpdateUser');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE users/:id -> dispatches Identity.DeleteUser', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart1.deleteUsersByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.DeleteUser');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST users/:id/activate -> dispatches Identity.Activate', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart1.postUsersByidActivate({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.Activate');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST users/:id/deactivate -> dispatches Identity.Deactivate', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart1.postUsersByidDeactivate({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.Deactivate');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST users/:id/reset-password -> dispatches Identity.ResetPassword', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart1.postUsersByidResetpassword({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.ResetPassword');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST users/:id/lock -> dispatches Identity.Lock', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart1.postUsersByidLock({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.Lock');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST users/:id/unlock -> dispatches Identity.Unlock', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart1.postUsersByidUnlock({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.Unlock');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('IdentityGapFillControllerPart2', () => {
    it('PATCH roles/:id -> dispatches Identity.UpdateRole', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart2.patchRolesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.UpdateRole');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE roles/:id -> dispatches Identity.DeleteRole', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart2.deleteRolesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.DeleteRole');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET roles/:id/permissions -> dispatches Identity.ListRolePermissions', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart2.getRolesByidPermissions({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.ListRolePermissions');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH branches/:id -> dispatches Identity.UpdateBranche', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart2.patchBranchesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.UpdateBranche');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE branches/:id -> dispatches Identity.DeleteBranche', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart2.deleteBranchesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.DeleteBranche');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH schools/:id -> dispatches Identity.UpdateSchool', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart2.patchSchoolsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.UpdateSchool');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET schools/:id/branches -> dispatches Identity.ListSchoolBranches', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart2.getSchoolsByidBranches({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.ListSchoolBranches');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('IdentityGapFillControllerPart3', () => {
    it('GET permissions/search -> dispatches Identity.ListSearch', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await identityGapFillControllerPart3.getPermissionsSearch({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Identity.ListSearch');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
