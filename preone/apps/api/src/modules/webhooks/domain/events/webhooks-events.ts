/**
 * Webhook domain events — Wave 20.
 */
import { DomainEvent } from '@shared/kernel/domain-event';

export class WebhookCreatedEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
  url: string;
  eventTypes: string[];
}> {}

export class WebhookRotatedSecretEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
}> {}

export class WebhookDisabledEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
}> {}

export class WebhookAutoDisabledEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
  consecutiveFailures: number;
}> {}

export class WebhookDeliverySucceededEvent extends DomainEvent<{
  deliveryId: string;
  subscriptionId: string;
  responseCode: number;
  attempts: number;
}> {}

export class WebhookDeliveryFailedEvent extends DomainEvent<{
  deliveryId: string;
  subscriptionId: string;
  lastError: string;
  attempts: number;
  finalFailure: boolean;
}> {}

export class WebhookDeliveryRetryScheduledEvent extends DomainEvent<{
  deliveryId: string;
  subscriptionId: string;
  nextAttemptAt: string;
  attemptNumber: number;
}> {}
