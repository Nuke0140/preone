/**
 * SettingsService — application-layer orchestrator.
 */
import { Injectable, Inject, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { CalendarEventAggregate } from '../../domain/aggregates/calendar-event.aggregate';
import { SystemConfigAggregate } from '../../domain/aggregates/system-config.aggregate';
import { UserPreferenceAggregate } from '../../domain/aggregates/user-preference.aggregate';
import type {
  CalendarEventRepository, SystemConfigRepository, UserPreferenceRepository,
} from '../../domain/repositories/settings.repository';
import {
  CALENDAR_EVENT_REPOSITORY, SYSTEM_CONFIG_REPOSITORY, USER_PREFERENCE_REPOSITORY,
} from '../../domain/repositories/tokens';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @Inject(SYSTEM_CONFIG_REPOSITORY) private readonly configs: SystemConfigRepository,
    @Inject(USER_PREFERENCE_REPOSITORY) private readonly prefs: UserPreferenceRepository,
    @Inject(CALENDAR_EVENT_REPOSITORY) private readonly events: CalendarEventRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── System Config ──────────────────────────────────────────

  async setSystemConfig(props: {
    tenantId?: string;
    branchId?: string;
    scope: any;
    key: string;
    value: any;
    description?: string;
    isEncrypted?: boolean;
    changedBy: string;
  }): Promise<SystemConfigAggregate> {
    const existing = await this.configs.findByKey(
      props.scope, props.key, props.tenantId, props.branchId,
    );
    let agg: SystemConfigAggregate;
    if (existing) {
      existing.update(props.value, props.changedBy, props.isEncrypted);
      agg = existing;
    } else {
      agg = SystemConfigAggregate.create({
        tenantId: props.tenantId,
        branchId: props.branchId,
        scope: props.scope,
        key: props.key,
        value: props.value,
        description: props.description,
        isEncrypted: props.isEncrypted ?? false,
        changedBy: props.changedBy,
      });
    }
    await this.configs.save(agg);
    await this.eventBus.publishAll(agg.commit());
    return agg;
  }

  async deleteSystemConfig(configId: string, tenantId?: string): Promise<void> {
    const c = await this.configs.findById(configId, tenantId);
    if (!c) throw new Error(`Config ${configId} not found`);
    c.delete();
    await this.configs.delete(configId, tenantId);
    await this.eventBus.publishAll(c.commit());
  }

  /**
   * Resolve config with hierarchical override:
   *   USER → BRANCH → SCHOOL → PLATFORM (first hit wins)
   */
  async resolveConfig(key: string, tenantId?: string, branchId?: string, userId?: string): Promise<any> {
    if (userId && tenantId) {
      const userCfg = await this.configs.findByKey('USER', key, tenantId, branchId);
      if (userCfg) return userCfg.value;
    }
    if (branchId) {
      const branchCfg = await this.configs.findByKey('BRANCH', key, tenantId, branchId);
      if (branchCfg) return branchCfg.value;
    }
    if (tenantId) {
      const schoolCfg = await this.configs.findByKey('SCHOOL', key, tenantId);
      if (schoolCfg) return schoolCfg.value;
    }
    const platformCfg = await this.configs.findByKey('PLATFORM', key);
    return platformCfg?.value ?? null;
  }

  // ─── User Preferences ───────────────────────────────────────

  async setUserPreference(props: {
    tenantId: string;
    userId: string;
    category: string;
    key: string;
    value: any;
  }): Promise<UserPreferenceAggregate> {
    const existing = await this.prefs.findByUserAndKey(
      props.userId, props.tenantId, props.category, props.key,
    );
    let agg: UserPreferenceAggregate;
    if (existing) {
      existing.update(props.value);
      agg = existing;
    } else {
      agg = UserPreferenceAggregate.create({
        tenantId: props.tenantId,
        userId: props.userId,
        category: props.category,
        key: props.key,
        value: props.value,
      });
    }
    await this.prefs.save(agg);
    await this.eventBus.publishAll(agg.commit());
    return agg;
  }

  async listUserPreferences(userId: string, tenantId: string, category?: string): Promise<UserPreferenceAggregate[]> {
    return this.prefs.findByUser(userId, tenantId, category);
  }

  // ─── Calendar Events ────────────────────────────────────────

  async createCalendarEvent(props: {
    tenantId: string;
    branchId?: string;
    academicSessionId?: string;
    title: string;
    description?: string;
    type: any;
    visibility?: any;
    startDate: string;
    endDate: string;
    isFullDay?: boolean;
    location?: string;
    organizerId?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    metadata?: any;
  }): Promise<CalendarEventAggregate> {
    const evt = CalendarEventAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      academicSessionId: props.academicSessionId,
      title: props.title,
      description: props.description,
      type: props.type,
      visibility: props.visibility ?? 'PUBLIC',
      startDate: props.startDate,
      endDate: props.endDate,
      isFullDay: props.isFullDay ?? true,
      location: props.location,
      organizerId: props.organizerId,
      isRecurring: props.isRecurring ?? false,
      recurrenceRule: props.recurrenceRule,
      metadata: props.metadata,
    });
    await this.events.save(evt);
    await this.eventBus.publishAll(evt.commit());
    this.logger.log(`Created calendar event "${evt.title}" (${evt.id})`);
    return evt;
  }

  async updateCalendarEvent(eventId: string, tenantId: string, changes: Record<string, unknown>): Promise<void> {
    const evt = await this._loadEvent(eventId, tenantId);
    evt.update(changes);
    await this.events.save(evt);
    await this.eventBus.publishAll(evt.commit());
  }

  async cancelCalendarEvent(eventId: string, tenantId: string): Promise<void> {
    const evt = await this._loadEvent(eventId, tenantId);
    evt.cancel();
    await this.events.save(evt);
    await this.eventBus.publishAll(evt.commit());
  }

  async listCalendarEvents(tenantId: string, dateFrom: string, dateTo: string, branchId?: string): Promise<CalendarEventAggregate[]> {
    return this.events.findByDateRange(tenantId, dateFrom, dateTo, branchId);
  }

  private async _loadEvent(id: string, tenantId: string): Promise<CalendarEventAggregate> {
    const e = await this.events.findById(id, tenantId);
    if (!e) throw new Error(`Calendar event ${id} not found`);
    return e;
  }
}
