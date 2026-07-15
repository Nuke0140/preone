/**
 * FinanceModule — Fees, Invoices, Payments, Refunds, Receipts, GST, TDS
 *
 * Per BTD §4.3 Module Catalog #8:
 *   "finance — Fees, Invoices, Payments, Ledger, GST — ~60 APIs"
 *
 * Per BRC v1.0 §3 (Financial Rules, 20 rules) + §10 (Approval Matrix, 15 rules) +
 *   API Catalog §16.11 (Finance APIs, 60 endpoints) + ERD v3.0 (Finance, 38 tables):
 *   - Fee structure + fee heads (admission / tuition / transport / meal / activity)
 *   - Invoice generation (R-FIN-008: Invoice Number Generation)
 *   - Late fee calculation (R-FIN-002)
 *   - Payment gateway integration (Razorpay primary, Cashfree fallback)
 *   - Refund policy (R-FIN-003: Before Term, R-FIN-004: Mid-Term)
 *   - Sibling discount (R-FIN-005) + Early bird (R-FIN-006)
 *   - GST on educational services (R-FIN-007)
 *   - Receipt generation (R-FIN-009)
 *   - Cheque bounce handling (R-FIN-011)
 *   - Installment plan approval (R-FIN-012)
 *   - Merit scholarship (R-FIN-013) + RTE reimbursement (R-FIN-019)
 *   - Bad debt write-off (R-FIN-014) + Financial hardship waiver (R-FIN-018)
 *   - Vendor payment terms (R-FIN-016) + TDS deduction (R-FIN-017)
 *   - Annual financial audit (R-FIN-020)
 *
 * Money: ALL amounts stored as integer paise (amount_cents) — NEVER float.
 * Aggregate: InvoiceAggregate (versioned, optimistic locking on payment).
 * Saga: PaymentReceived → Receipt generation → Parent notification.
 *
 * Status: STUB — to be implemented in Wave 6 per BUILD_ROADMAP.md
 */
import { Module } from '@nestjs/common';

@Module({})
export class FinanceModule {}
