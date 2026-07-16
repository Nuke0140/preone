/**
 * CRM Integration Event Subscriber — emits cross-module integration events
 * + listens to Admissions events (BTD §14.2).
 *
 * Subscribed domain events:
 *   - AdmissionApprovedEvent (Admissions) → mark lead as CONVERTED if linked
 *
 * Emits integration events:
 *   - LeadCaptured.v1     → Communication (welcome SMS/email)
 *   - LeadConverted.v1    → Admissions (auto-create application, sync HTTP)
 *   - LeadLost.v1         → Communication (win-back campaign)
 *   - CampaignLaunched.v1 → Communication (fan-out to channels)
 */
import { Injectable, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { CrmService } from './crm.service';

import {
  CampaignLaunchedEvent, LeadCapturedEvent, LeadConvertedEvent,
  LeadLostEvent,
} from '../../domain/events/crm-events';
import { AdmissionApprovedEvent } from '../../../admissions/domain/events/admissions-events';

@Injectable()
export class CrmIntegrationEventSubscriber {
  private readonly logger = new Logger(CrmIntegrationEventSubscriber.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly crm: CrmService,
    private readonly prisma: PrismaService,
  ) {}

  register(): void {
    // ─── LeadCaptured → Communication (welcome SMS/email) ───
    this.eventBus.subscribe(LeadCapturedEvent.name, async (event) => {
      const e = event as LeadCapturedEvent;
      this.logger.log(
        `[Integration Event] LeadCaptured.v1 emitted — leadId=${e.payload.leadId}, ` +
        `code=${e.payload.leadCode}, source=${e.payload.source}. ` +
        `Subscriber: Communication (welcome SMS/email to ${e.payload.phone}).`,
      );
    });

    // ─── LeadConverted → Admissions (auto-create application) ───
    // NOTE: In normal flow, CRM converts lead AFTER application is created in Admissions.
    // This event notifies Admissions to link the application back to the lead for attribution.
    this.eventBus.subscribe(LeadConvertedEvent.name, async (event) => {
      const e = event as LeadConvertedEvent;
      this.logger.log(
        `[Integration Event] LeadConverted.v1 emitted — leadId=${e.payload.leadId}, ` +
        `applicationId=${e.payload.applicationId}. ` +
        `Subscribers: Admissions (link application → lead for attribution) + ` +
        `Communication (conversion thank-you message).`,
      );
      try {
        // Update the admission application with lead attribution (leadId only —
        // source/campaignId are stored on the Lead itself for attribution)
        await this.prisma.application.update({
          where: { id: e.payload.applicationId },
          data: {
            leadId: e.payload.leadId,
          },
        }).catch(() => {
          this.logger.debug(`Application ${e.payload.applicationId} not found or already linked`);
        });
      } catch (err) {
        this.logger.error(`Failed to link application to lead: ${(err as Error).message}`);
      }
    });

    // ─── LeadLost → Communication (win-back campaign trigger) ───
    this.eventBus.subscribe(LeadLostEvent.name, async (event) => {
      const e = event as LeadLostEvent;
      this.logger.log(
        `[Integration Event] LeadLost.v1 emitted — leadId=${e.payload.leadId}, ` +
        `reason=${e.payload.reason}. ` +
        `Subscriber: Communication (win-back campaign eligibility check).`,
      );
    });

    // ─── CampaignLaunched → Communication (fan-out) ───
    this.eventBus.subscribe(CampaignLaunchedEvent.name, async (event) => {
      const e = event as CampaignLaunchedEvent;
      this.logger.log(
        `[Integration Event] CampaignLaunched.v1 emitted — campaignId=${e.payload.campaignId}, ` +
        `channel=${e.payload.channel}, audienceSize=${e.payload.audienceSize}. ` +
        `Subscriber: Communication (fan-out via ${e.payload.channel}).`,
      );
    });

    // ─── AdmissionApproved → mark lead as CONVERTED if linked ───
    // When an admission is approved, find the linked lead (if any) and mark it CONVERTED.
    this.eventBus.subscribe(AdmissionApprovedEvent.name, async (event) => {
      const e = event as AdmissionApprovedEvent;
      try {
        // Find application by admissionId to get the leadId
        const admission = await this.prisma.admission.findUnique({
          where: { id: e.payload.admissionId },
          include: { application: true },
        });
        if (!admission?.application?.leadId) {
          this.logger.debug(`AdmissionApproved: no linked lead for admission ${e.payload.admissionId}`);
          return;
        }
        const leadId = admission.application.leadId;
        const tenantId = admission.schoolId;
        // Mark the lead as converted (idempotent — skip if already converted)
        const leadRow = await this.prisma.lead.findUnique({ where: { id: leadId } });
        if (!leadRow || leadRow.status === 'CONVERTED') return;
        await this.crm.convertLead(leadId, tenantId, admission.applicationId);
        if (admission.studentId) {
          await this.crm.linkConvertedStudent(leadId, admission.studentId, tenantId);
        }
        this.logger.log(
          `Auto-converted lead ${leadRow.leadCode} on admission approval`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to auto-convert lead on AdmissionApproved: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });
  }
}
