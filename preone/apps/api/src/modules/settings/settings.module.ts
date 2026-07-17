/**
 * SettingsModule — wiring for Settings bounded context.
 */
import { Module } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import { SettingsService } from './application/services/settings.service';
import {
  CancelCalendarEventCommandHandler, CreateCalendarEventCommandHandler,
  DeleteSystemConfigCommandHandler, SetSystemConfigCommandHandler,
  SetUserPreferenceCommandHandler, UpdateCalendarEventCommandHandler,
} from './application/handlers/settings-command-handlers';
import {
  GetCalendarEventQueryHandler, GetSystemConfigQueryHandler,
  GetUserPreferenceQueryHandler, ListCalendarEventsQueryHandler,
  ListSystemConfigsQueryHandler, ListUserPreferencesQueryHandler,
} from './application/handlers/settings-query-handlers';
import {
  CalendarEventsController, SystemConfigsController, UserPreferencesController,
} from './controllers/settings.controllers';
import { SettingsGapFillControllerPart1, SettingsGapFillControllerPart2 } from './controllers/settings-gap-fill.controllers';
import {
  CALENDAR_EVENT_REPOSITORY, SYSTEM_CONFIG_REPOSITORY, USER_PREFERENCE_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaCalendarEventRepository, PrismaSystemConfigRepository, PrismaUserPreferenceRepository,
} from './infrastructure/repositories/prisma-settings.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [SystemConfigsController, UserPreferencesController, CalendarEventsController,
    SettingsGapFillControllerPart1, SettingsGapFillControllerPart2,
  ],
  providers: [
    SettingsService,
    { provide: SYSTEM_CONFIG_REPOSITORY, useClass: PrismaSystemConfigRepository },
    { provide: USER_PREFERENCE_REPOSITORY, useClass: PrismaUserPreferenceRepository },
    { provide: CALENDAR_EVENT_REPOSITORY, useClass: PrismaCalendarEventRepository },
    // CQRS
    CommandBus, QueryBus,
    SetSystemConfigCommandHandler, DeleteSystemConfigCommandHandler,
    SetUserPreferenceCommandHandler,
    CreateCalendarEventCommandHandler, UpdateCalendarEventCommandHandler, CancelCalendarEventCommandHandler,
    // Queries
    GetSystemConfigQueryHandler, ListSystemConfigsQueryHandler,
    GetUserPreferenceQueryHandler, ListUserPreferencesQueryHandler,
    GetCalendarEventQueryHandler, ListCalendarEventsQueryHandler,
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
