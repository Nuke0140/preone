/**
 * CommunicationModule — wiring for Communication bounded context.
 *
 * Per BTD §4.3 Module Catalog #7:
 *   "communication — Announcements, Chat, Notifications — ~50 APIs"
 *
 * Implements:
 *   - 3 aggregates (Notification, Announcement, Conversation)
 *   - 1 service + 4 Prisma repositories
 *   - 3 controllers (Notifications, Announcements, Conversations)
 *   - 12 command handlers + 7 query handlers
 *   - 17 domain events wired via EventBusService
 *   - 1 integration-event subscriber (listens to Admissions + Attendance)
 */
import { Module, OnModuleInit } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import { CommunicationIntegrationEventSubscriber } from './application/services/communication-integration-subscriber.service';
import { CommunicationService } from './application/services/communication.service';
import {
  AcknowledgeAnnouncementCommandHandler, AddParticipantCommandHandler,
  ArchiveAnnouncementCommandHandler, CreateAnnouncementCommandHandler,
  CreateConversationCommandHandler, CreateNotificationCommandHandler,
  MarkMessageReadCommandHandler, MarkNotificationReadCommandHandler,
  PublishAnnouncementCommandHandler, RemoveParticipantCommandHandler,
  SendMessageCommandHandler, SendNotificationCommandHandler,
} from './application/handlers/communication-command-handlers';
import {
  GetAnnouncementQueryHandler, GetConversationQueryHandler,
  GetNotificationQueryHandler, ListAnnouncementsQueryHandler,
  ListConversationsQueryHandler, ListMessagesQueryHandler,
  ListNotificationsQueryHandler,
} from './application/handlers/communication-query-handlers';
import {
  AnnouncementsController, ConversationsController, NotificationsController,
} from './controllers/communication.controllers';
import { CommunicationGapFillControllerPart1, CommunicationGapFillControllerPart2 } from './controllers/communication-gap-fill.controllers';
import {
  ANNOUNCEMENT_REPOSITORY, CONVERSATION_REPOSITORY, MESSAGE_REPOSITORY,
  NOTIFICATION_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaAnnouncementRepository, PrismaConversationRepository,
  PrismaMessageRepository, PrismaNotificationRepository,
} from './infrastructure/repositories/prisma-communication.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [NotificationsController, AnnouncementsController, ConversationsController,
    CommunicationGapFillControllerPart1, CommunicationGapFillControllerPart2,
  ],
  providers: [
    CommunicationService,
    CommunicationIntegrationEventSubscriber,
    // Repositories
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    { provide: ANNOUNCEMENT_REPOSITORY, useClass: PrismaAnnouncementRepository },
    { provide: CONVERSATION_REPOSITORY, useClass: PrismaConversationRepository },
    { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository },
    // CQRS
    CommandBus, QueryBus,
    CreateNotificationCommandHandler, SendNotificationCommandHandler,
    MarkNotificationReadCommandHandler,
    CreateAnnouncementCommandHandler, PublishAnnouncementCommandHandler,
    AcknowledgeAnnouncementCommandHandler, ArchiveAnnouncementCommandHandler,
    CreateConversationCommandHandler, SendMessageCommandHandler,
    MarkMessageReadCommandHandler, AddParticipantCommandHandler,
    RemoveParticipantCommandHandler,
    // Query handlers
    GetNotificationQueryHandler, ListNotificationsQueryHandler,
    GetAnnouncementQueryHandler, ListAnnouncementsQueryHandler,
    GetConversationQueryHandler, ListConversationsQueryHandler,
    ListMessagesQueryHandler,
  ],
  exports: [CommunicationService],
})
export class CommunicationModule implements OnModuleInit {
  constructor(private readonly subscriber: CommunicationIntegrationEventSubscriber) {}

  onModuleInit(): void {
    // Subscribe to integration events from Admissions + Attendance
    // Per BTD §14.2 — this module is a SUBSCRIBER on those event types.
    this.subscriber.register();
  }
}
