/**
 * ReportsModule — Cross-domain Reports, Analytics
 *
 * Per BTD §4.3 Module Catalog #12:
 *   "reports — Cross-domain Reports, Analytics — ~30 APIs"
 *
 * Per API Catalog §16.15 + BRC v1.0 §11 (Notification Rules for scheduled reports):
 *   - Finance reports (fee collection, outstanding, GST, TDS, P&L)
 *   - Attendance reports (daily, monthly, term-wise, comparative)
 *   - Admissions reports (funnel, source attribution, conversion rate)
 *   - Dashboard KPIs (real-time + aggregated)
 *   - Custom report builder (saved queries, scheduled exports)
 *   - Branch comparison + trend analysis
 *   - Regulatory exports (RTE, FSSAI, POSH, Fire safety audit)
 *   - Parent engagement metrics (login frequency, message response time)
 *   - Staff productivity metrics (observation count, lesson plan adherence)
 *
 * Read-optimized: Uses Prisma read replica via replica comment hint
 * (per BTD §25.1 — read replica routing for reports).
 *
 * BullMQ: Long-running reports (PDF generation) pushed to 'report-pdf' queue
 * (per BTD §15.1 — 12 queues, 30s pickup SLO).
 *
 * Status: STUB — to be implemented in Wave 8 per BUILD_ROADMAP.md
 */
import { Module } from '@nestjs/common';

@Module({})
export class ReportsModule {}
