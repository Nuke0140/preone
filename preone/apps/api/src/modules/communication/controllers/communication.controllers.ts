/**
 * Communication Controllers — REST API surface (BTD §7).
 *
 * Routes (all under /v1/communication):
 *   POST   /notifications                  — create + queue notification
 *   POST   /notifications/:id/send         — trigger immediate dispatch
 *   POST   /notifications/:id/read         — mark read by recipient
 *   GET    /notifications                  — list (filter by channel/status/user)
 *   GET    /notifications/:id              — get single
 *
 *   POST   /announcements                  — create draft
 *   POST   /announcements/:id/publish      — publish to audience
 *   POST   /announcements/:id/acknowledge  — recipient acknowledgement
 *   POST   /announcements/:id/archive      — archive
 *   GET    /announcements                  — list
 *   GET    /announcements/:id              — get single
 *
 *   POST   /conversations                  — create (direct/group/classroom)
 *   POST   /conversations/:id/messages     — send message
 *   POST   /conversations/:id/participants — add participant
 *   DELETE /conversations/:id/participants/:userId — remove participant
 *   GET    /conversations                  — list (by user)
 *   GET    /conversations/:id              — get single with messages
 */
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

import {
  AcknowledgeAnnouncementCommand, AddParticipantCommand,
  ArchiveAnnouncementCommand, CreateAnnouncementCommand,
  CreateConversationCommand, CreateNotificationCommand,
  MarkMessageReadCommand, MarkNotificationReadCommand,
  PublishAnnouncementCommand, RemoveParticipantCommand,
  SendMessageCommand, SendNotificationCommand,
} from '../application/commands/communication.commands';

// ─── Notifications ────────────────────────────────────────────

@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Communication.CreateNotification',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/send')
  async send(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Communication.SendNotification',
      payload: { notificationId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @Body() body: { recipientId: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Communication.MarkNotificationRead',
      payload: { notificationId: id, recipientId: body.recipientId, tenantId: body.tenantId },
      metadata: { actorId: body.recipientId, tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Communication.ListNotifications',
      payload: {
        tenantId: q.tenantId,
        userId: q.userId,
        channel: q.channel,
        status: q.status,
        triggerEvent: q.triggerEvent,
        limit: q.limit ? Number(q.limit) : undefined,
        offset: q.offset ? Number(q.offset) : undefined,
      },
      metadata: { actorId: q.userId ?? 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Communication.GetNotification',
      payload: { notificationId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Announcements ────────────────────────────────────────────

@Controller('v1/announcements')
export class AnnouncementsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Communication.CreateAnnouncement',
      payload: body,
      metadata: { actorId: body.authorId, tenantId: body.tenantId },
    });
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Communication.PublishAnnouncement',
      payload: { announcementId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/acknowledge')
  async acknowledge(@Param('id') id: string, @Body() body: { recipientId: string; tenantId: string; note?: string }) {
    return this.bus.execute({
      type: 'Communication.AcknowledgeAnnouncement',
      payload: { announcementId: id, recipientId: body.recipientId, tenantId: body.tenantId, note: body.note },
      metadata: { actorId: body.recipientId, tenantId: body.tenantId },
    });
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Communication.ArchiveAnnouncement',
      payload: { announcementId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Communication.ListAnnouncements',
      payload: {
        tenantId: q.tenantId,
        audience: q.audience,
        status: q.status,
        branchId: q.branchId,
        classroomId: q.classroomId,
        limit: q.limit ? Number(q.limit) : undefined,
        offset: q.offset ? Number(q.offset) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Communication.GetAnnouncement',
      payload: { announcementId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Conversations + Messages ────────────────────────────────

@Controller('v1/conversations')
export class ConversationsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Communication.CreateConversation',
      payload: body,
      metadata: { actorId: body.createdBy, tenantId: body.tenantId },
    });
  }

  @Post(':id/messages')
  async sendMessage(@Param('id') id: string, @Body() body: any) {
    return this.bus.execute({
      type: 'Communication.SendMessage',
      payload: { ...body, conversationId: id },
      metadata: { actorId: body.senderId, tenantId: body.tenantId },
    });
  }

  @Post(':id/messages/:messageId/read')
  async markMessageRead(
    @Param('id') _id: string,
    @Param('messageId') messageId: string,
    @Body() body: { userId: string; tenantId: string },
  ) {
    return this.bus.execute({
      type: 'Communication.MarkMessageRead',
      payload: { messageId, userId: body.userId, tenantId: body.tenantId },
      metadata: { actorId: body.userId, tenantId: body.tenantId },
    });
  }

  @Post(':id/participants')
  async addParticipant(
    @Param('id') id: string,
    @Body() body: { userId: string; role?: 'MEMBER' | 'ADMIN' | 'OWNER'; tenantId: string },
  ) {
    return this.bus.execute({
      type: 'Communication.AddParticipant',
      payload: { conversationId: id, userId: body.userId, role: body.role, tenantId: body.tenantId },
      metadata: { actorId: body.userId, tenantId: body.tenantId },
    });
  }

  @Delete(':id/participants/:userId')
  async removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.bus.execute({
      type: 'Communication.RemoveParticipant',
      payload: { conversationId: id, userId, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Communication.ListConversations',
      payload: {
        tenantId: q.tenantId,
        userId: q.userId,
        type: q.type,
        isActive: q.isActive === undefined ? undefined : q.isActive === 'true',
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: q.userId, tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Communication.GetConversation',
      payload: { conversationId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}
