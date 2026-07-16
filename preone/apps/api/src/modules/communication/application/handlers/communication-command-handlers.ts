/**
 * Communication Command Handlers — CQRS write side (BTD §12.2).
 */
import { Injectable } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  AcknowledgeAnnouncementCommand, AddParticipantCommand,
  ArchiveAnnouncementCommand, CreateAnnouncementCommand,
  CreateConversationCommand, CreateNotificationCommand,
  MarkMessageReadCommand, MarkNotificationReadCommand,
  PublishAnnouncementCommand, RemoveParticipantCommand,
  SendMessageCommand, SendNotificationCommand,
} from '../commands/communication.commands';
import { CommunicationService } from '../services/communication.service';

@Injectable()
export class CreateNotificationCommandHandler implements CommandHandler<CreateNotificationCommand> {
  private static readonly TYPE = 'Communication.CreateNotification';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(CreateNotificationCommandHandler.TYPE, this);
  }
  async handle(c: CreateNotificationCommand) {
    const n = await this.svc.createNotification(c.payload);
    return { id: n.id };
  }
}

@Injectable()
export class SendNotificationCommandHandler implements CommandHandler<SendNotificationCommand> {
  private static readonly TYPE = 'Communication.SendNotification';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(SendNotificationCommandHandler.TYPE, this);
  }
  async handle(c: SendNotificationCommand) {
    await this.svc.sendNotification(c.payload.notificationId, c.payload.tenantId);
    return { id: c.payload.notificationId };
  }
}

@Injectable()
export class MarkNotificationReadCommandHandler implements CommandHandler<MarkNotificationReadCommand> {
  private static readonly TYPE = 'Communication.MarkNotificationRead';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(MarkNotificationReadCommandHandler.TYPE, this);
  }
  async handle(c: MarkNotificationReadCommand) {
    await this.svc.markNotificationRead(c.payload.notificationId, c.payload.recipientId, c.payload.tenantId);
    return { id: c.payload.notificationId };
  }
}

@Injectable()
export class CreateAnnouncementCommandHandler implements CommandHandler<CreateAnnouncementCommand> {
  private static readonly TYPE = 'Communication.CreateAnnouncement';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(CreateAnnouncementCommandHandler.TYPE, this);
  }
  async handle(c: CreateAnnouncementCommand) {
    const a = await this.svc.createAnnouncement(c.payload);
    return { id: a.id };
  }
}

@Injectable()
export class PublishAnnouncementCommandHandler implements CommandHandler<PublishAnnouncementCommand> {
  private static readonly TYPE = 'Communication.PublishAnnouncement';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(PublishAnnouncementCommandHandler.TYPE, this);
  }
  async handle(c: PublishAnnouncementCommand) {
    await this.svc.publishAnnouncement(c.payload.announcementId, c.payload.tenantId);
    return { id: c.payload.announcementId };
  }
}

@Injectable()
export class AcknowledgeAnnouncementCommandHandler implements CommandHandler<AcknowledgeAnnouncementCommand> {
  private static readonly TYPE = 'Communication.AcknowledgeAnnouncement';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(AcknowledgeAnnouncementCommandHandler.TYPE, this);
  }
  async handle(c: AcknowledgeAnnouncementCommand) {
    await this.svc.acknowledgeAnnouncement(
      c.payload.announcementId, c.payload.recipientId, c.payload.tenantId, c.payload.note,
    );
    return { id: c.payload.announcementId };
  }
}

@Injectable()
export class ArchiveAnnouncementCommandHandler implements CommandHandler<ArchiveAnnouncementCommand> {
  private static readonly TYPE = 'Communication.ArchiveAnnouncement';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(ArchiveAnnouncementCommandHandler.TYPE, this);
  }
  async handle(c: ArchiveAnnouncementCommand) {
    await this.svc.archiveAnnouncement(c.payload.announcementId, c.payload.tenantId);
    return { id: c.payload.announcementId };
  }
}

@Injectable()
export class CreateConversationCommandHandler implements CommandHandler<CreateConversationCommand> {
  private static readonly TYPE = 'Communication.CreateConversation';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(CreateConversationCommandHandler.TYPE, this);
  }
  async handle(c: CreateConversationCommand) {
    const conv = await this.svc.createConversation(c.payload);
    return { id: conv.id };
  }
}

@Injectable()
export class SendMessageCommandHandler implements CommandHandler<SendMessageCommand> {
  private static readonly TYPE = 'Communication.SendMessage';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(SendMessageCommandHandler.TYPE, this);
  }
  async handle(c: SendMessageCommand) {
    const r = await this.svc.sendMessage(c.payload);
    return r;
  }
}

@Injectable()
export class MarkMessageReadCommandHandler implements CommandHandler<MarkMessageReadCommand> {
  private static readonly TYPE = 'Communication.MarkMessageRead';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(MarkMessageReadCommandHandler.TYPE, this);
  }
  async handle(c: MarkMessageReadCommand) {
    await this.svc.markMessageRead(c.payload.messageId, c.payload.userId, c.payload.tenantId);
    return { id: c.payload.messageId };
  }
}

@Injectable()
export class AddParticipantCommandHandler implements CommandHandler<AddParticipantCommand> {
  private static readonly TYPE = 'Communication.AddParticipant';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(AddParticipantCommandHandler.TYPE, this);
  }
  async handle(c: AddParticipantCommand) {
    await this.svc.addParticipant(c.payload);
    return { id: c.payload.conversationId };
  }
}

@Injectable()
export class RemoveParticipantCommandHandler implements CommandHandler<RemoveParticipantCommand> {
  private static readonly TYPE = 'Communication.RemoveParticipant';
  constructor(private readonly bus: CommandBus, private readonly svc: CommunicationService) {
    bus.register(RemoveParticipantCommandHandler.TYPE, this);
  }
  async handle(c: RemoveParticipantCommand) {
    await this.svc.removeParticipant(c.payload);
    return { id: c.payload.conversationId };
  }
}
