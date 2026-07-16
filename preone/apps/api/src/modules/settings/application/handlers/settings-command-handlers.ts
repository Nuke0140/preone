/**
 * Settings Command Handlers.
 */
import { Injectable } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  CancelCalendarEventCommand, CreateCalendarEventCommand, DeleteSystemConfigCommand,
  SetSystemConfigCommand, SetUserPreferenceCommand, UpdateCalendarEventCommand,
} from '../commands/settings.commands';
import { SettingsService } from '../services/settings.service';

@Injectable()
export class SetSystemConfigCommandHandler implements CommandHandler<SetSystemConfigCommand> {
  private static readonly TYPE = 'Settings.SetSystemConfig';
  constructor(private readonly bus: CommandBus, private readonly svc: SettingsService) {
    bus.register(SetSystemConfigCommandHandler.TYPE, this);
  }
  async handle(c: SetSystemConfigCommand) {
    const cfg = await this.svc.setSystemConfig(c.payload);
    return { id: cfg.id };
  }
}

@Injectable()
export class DeleteSystemConfigCommandHandler implements CommandHandler<DeleteSystemConfigCommand> {
  private static readonly TYPE = 'Settings.DeleteSystemConfig';
  constructor(private readonly bus: CommandBus, private readonly svc: SettingsService) {
    bus.register(DeleteSystemConfigCommandHandler.TYPE, this);
  }
  async handle(c: DeleteSystemConfigCommand) {
    await this.svc.deleteSystemConfig(c.payload.configId, c.payload.tenantId);
    return { id: c.payload.configId };
  }
}

@Injectable()
export class SetUserPreferenceCommandHandler implements CommandHandler<SetUserPreferenceCommand> {
  private static readonly TYPE = 'Settings.SetUserPreference';
  constructor(private readonly bus: CommandBus, private readonly svc: SettingsService) {
    bus.register(SetUserPreferenceCommandHandler.TYPE, this);
  }
  async handle(c: SetUserPreferenceCommand) {
    const p = await this.svc.setUserPreference(c.payload);
    return { id: p.id };
  }
}

@Injectable()
export class CreateCalendarEventCommandHandler implements CommandHandler<CreateCalendarEventCommand> {
  private static readonly TYPE = 'Settings.CreateCalendarEvent';
  constructor(private readonly bus: CommandBus, private readonly svc: SettingsService) {
    bus.register(CreateCalendarEventCommandHandler.TYPE, this);
  }
  async handle(c: CreateCalendarEventCommand) {
    const e = await this.svc.createCalendarEvent(c.payload);
    return { id: e.id };
  }
}

@Injectable()
export class UpdateCalendarEventCommandHandler implements CommandHandler<UpdateCalendarEventCommand> {
  private static readonly TYPE = 'Settings.UpdateCalendarEvent';
  constructor(private readonly bus: CommandBus, private readonly svc: SettingsService) {
    bus.register(UpdateCalendarEventCommandHandler.TYPE, this);
  }
  async handle(c: UpdateCalendarEventCommand) {
    await this.svc.updateCalendarEvent(c.payload.eventId, c.payload.tenantId, c.payload.changes);
    return { id: c.payload.eventId };
  }
}

@Injectable()
export class CancelCalendarEventCommandHandler implements CommandHandler<CancelCalendarEventCommand> {
  private static readonly TYPE = 'Settings.CancelCalendarEvent';
  constructor(private readonly bus: CommandBus, private readonly svc: SettingsService) {
    bus.register(CancelCalendarEventCommandHandler.TYPE, this);
  }
  async handle(c: CancelCalendarEventCommand) {
    await this.svc.cancelCalendarEvent(c.payload.eventId, c.payload.tenantId);
    return { id: c.payload.eventId };
  }
}
