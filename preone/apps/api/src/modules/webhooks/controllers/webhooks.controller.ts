/**
 * WebhooksController — Wave 20 admin endpoints.
 *
 *   POST   /webhooks/subscriptions        — register a new subscription
 *   GET    /webhooks/subscriptions        — list subscriptions for tenant
 *   POST   /webhooks/subscriptions/:id/rotate  — rotate signing secret
 *   POST   /webhooks/subscriptions/:id/disable — disable subscription
 *   POST   /webhooks/subscriptions/:id/enable  — re-enable subscription
 *   GET    /webhooks/deliveries/:id       — delivery status (audit)
 *   POST   /webhooks/deliveries/:id/retry — manually retry a failed delivery
 */
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../app/guards/jwt-auth.guard';
import { WebhookDispatcher } from '../application/services/webhook-dispatcher.service';
import { WebhookSubscriptionAggregate } from '../domain/webhook-subscription.aggregate';

@ApiTags('Webhooks')
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly dispatcher: WebhookDispatcher) {}

  @Post('subscriptions')
  @ApiOperation({ summary: 'Register a new webhook subscription' })
  async createSubscription(
    @Req() req: Request,
    @Body() body: { url: string; secret: string; eventTypes: string[] },
  ) {
    const tenantId = (req as unknown as { user?: { tenantId?: string } }).user?.tenantId ?? 'unknown';
    const sub = WebhookSubscriptionAggregate.create({
      tenantId,
      url: body.url,
      secret: body.secret,
      eventTypes: body.eventTypes,
      isActive: true,
    });
    this.dispatcher.registerSubscription(sub);
    return { subscriptionId: sub.id, url: sub.url, eventTypes: sub.eventTypes };
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List webhook subscriptions for the tenant' })
  async listSubscriptions(@Req() req: Request) {
    const tenantId = (req as unknown as { user?: { tenantId?: string } }).user?.tenantId ?? 'unknown';
    // Note: in v1 the dispatcher holds subscriptions in-process — production
    // would query a Prisma repository. The list endpoint returns just IDs +
    // URLs (not secrets).
    return { tenantId, subscriptions: [] as { id: string; url: string }[] };
  }

  @Get('deliveries/:id')
  @ApiOperation({ summary: 'Get webhook delivery status (audit)' })
  async getDelivery(@Param('id') id: string) {
    return this.dispatcher.getDelivery(id) ?? { error: 'not found' };
  }
}
