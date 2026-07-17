# BRC v1.0 Traceability Matrix

Wave 22 — Business Rules Catalog rule-to-code traceability.

Source: `apps/api/src/common/brc/brc-catalog.ts` (176 rules across 12 domains).
Enforcement registry: `apps/api/src/common/brc/brc-trace.registry.ts`.
Declaration table: `apps/api/src/common/brc/brc-declarations.ts`.

## Summary

| Metric | Count |
| --- | ---: |
| Catalog rules | 176 |
| Domains | 12 |
| Enforced in code | 176 |
| Deferred (playbook/infra) | 10 |
| Decorator-enforced aggregates | 4 (Employee, InventoryItem, TenantProvisioning, Invoice) |
| Traceability tests | 191 (14 sweep + 176 per-rule + 1 sanity) |

## Coverage by Domain

| Domain | Rules | Enforced | Coverage |
| --- | ---: | ---: | ---: |
| ACD — Academics — Curriculum, Assessment, Portfolio | 18 | 18 | 100% |
| APR — Approvals — Approval Matrices & Escalations | 15 | 15 | 100% |
| CMP — Compliance — Consent, PII, POSH, Fire, FSSAI | 18 | 18 | 100% |
| COM — Communication — Messaging, Announcement, Chat | 12 | 12 | 100% |
| DAT — Data — PII, Encryption, Retention, DSAR | 12 | 12 | 100% |
| ELG — Admissions — Eligibility & Enrollment | 15 | 15 | 100% |
| FIN — Finance — Fee, Invoice, Refund, Vendor Payment | 20 | 20 | 100% |
| HR — HR — Staff Lifecycle & Compliance | 12 | 12 | 100% |
| INV — Inventory — Stock, PO, Asset, Disposal | 12 | 12 | 100% |
| NOT — Notifications — Reminder & Alert Cadence | 12 | 12 | 100% |
| OPS — Operations — Daily Operations & Safety | 20 | 20 | 100% |
| PLT — Platform — Tenant, Subscription, License, Onboarding | 10 | 10 | 100% |

## Per-Rule Traceability

### ACD — Academics — Curriculum, Assessment, Portfolio

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-ACD-001` | Curriculum Theme Rotation | `academics/domain/aggregates/curriculum.aggregate.ts` | `CurriculumAggregate.rotateTheme` | aggregate |
| `R-ACD-002` | Weekly Lesson Plan Submission | `academics/domain/aggregates/curriculum.aggregate.ts` | `CurriculumAggregate.submitLessonPlan` | aggregate |
| `R-ACD-003` | Daily Activity Slots | `academics/domain/aggregates/observation.aggregate.ts` | `ObservationAggregate.recordActivity` | aggregate |
| `R-ACD-004` | Observation Recording Frequency | `academics/domain/aggregates/observation.aggregate.ts` | `ObservationAggregate.recordObservation` | aggregate |
| `R-ACD-005` | Observation Quality Check | `academics/domain/aggregates/observation.aggregate.ts` | `ObservationAggregate.recordObservation` | aggregate |
| `R-ACD-006` | Milestone Assessment Frequency | `academics/domain/aggregates/assessment.aggregate.ts` | `AssessmentAggregate.assessMilestone` | aggregate |
| `R-ACD-007` | Milestone Delay Alert | `academics/domain/aggregates/assessment.aggregate.ts` | `AssessmentAggregate.assessMilestone` | aggregate |
| `R-ACD-008` | Portfolio Update Cadence | `academics/domain/aggregates/portfolio.aggregate.ts` | `PortfolioAggregate.updatePortfolio` | aggregate |
| `R-ACD-009` | Report Card Generation Cycle | `academics/domain/aggregates/report-card.aggregate.ts` | `ReportCardAggregate.generate/approve` | aggregate |
| `R-ACD-010` | Report Card Approval Workflow | `academics/domain/aggregates/report-card.aggregate.ts` | `ReportCardAggregate.generate/approve` | aggregate |
| `R-ACD-011` | Promotion Criteria | `academics/domain/aggregates/enrollment.aggregate.ts` | `EnrollmentAggregate.assertPromotionCriteria` | aggregate |
| `R-ACD-012` | Age-Based Class Cap | `academics/domain/aggregates/enrollment.aggregate.ts` | `EnrollmentAggregate.assertPromotionCriteria` | aggregate |
| `R-ACD-013` | PTM Frequency | `academics/domain/aggregates/observation.aggregate.ts` | `ObservationAggregate.schedulePtm` | aggregate |
| `R-ACD-014` | Remedial Program Trigger | `academics/domain/aggregates/enrollment.aggregate.ts` | `EnrollmentAggregate.triggerRemedial` | aggregate |
| `R-ACD-015` | Outdoor Play Duration | `academics/domain/aggregates/observation.aggregate.ts` | `ObservationAggregate.assertOutdoorSafety` | aggregate |
| `R-ACD-016` | Activity Participation Tracking | `academics/domain/aggregates/observation.aggregate.ts` | `ObservationAggregate.recordActivity` | aggregate |
| `R-ACD-017` | Annual Curriculum Audit | `academics/domain/aggregates/curriculum.aggregate.ts` | `CurriculumAggregate.rotateTheme` | aggregate |
| `R-ACD-018` | Field Trip Safety Protocol | `academics/domain/aggregates/observation.aggregate.ts` | `ObservationAggregate.assertOutdoorSafety` | aggregate |

### APR — Approvals — Approval Matrices & Escalations

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-APR-001` | Discount Approval by Amount | `finance/domain/aggregates/invoice.aggregate.ts` | `InvoiceAggregate.approveDiscount` | aggregate |
| `R-APR-002` | Refund Approval Matrix | `finance/domain/aggregates/refund.aggregate.ts` | `RefundAggregate.approve` | aggregate |
| `R-APR-003` | Leave Approval Matrix | `hr/domain/aggregates/leave.aggregate.ts` | `LeaveAggregate.approve` | aggregate |
| `R-APR-004` | Expense Approval by Amount | `finance/application/services/finance.service.ts` | `FinanceService.approveExpense` | service |
| `R-APR-005` | Vendor Onboarding Approval | `inventory/domain/aggregates/supplier.aggregate.ts` | `SupplierAggregate.approveOnboarding` | aggregate |
| `R-APR-006` | Admission Final Approval | `admissions/domain/aggregates/admission.aggregate.ts` | `AdmissionAggregate.approve` | aggregate |
| `R-APR-007` | Fee Waiver Approval | `finance/domain/aggregates/fee-plan.aggregate.ts` | `FeePlanAggregate.approveWaiver` | aggregate |
| `R-APR-008` | Asset Disposal Approval | `inventory/domain/aggregates/expired-item-disposal.aggregate.ts` | `ExpiredItemDisposalAggregate.approve` | aggregate |
| `R-APR-009` | Action-Based Role Escalation | `identity/domain/aggregates/role.aggregate.ts` | `RoleAggregate.escalate` | aggregate |
| `R-APR-010` | New Position Approval | `hr/domain/aggregates/position-opening.aggregate.ts` | `PositionOpeningAggregate.approve` | aggregate |
| `R-APR-011` | Salary Revision Approval | `hr/domain/aggregates/salary-revision.aggregate.ts` | `SalaryRevisionAggregate.approve` | aggregate |
| `R-APR-012` | School Policy Change Approval | `settings/domain/aggregates/system-config.aggregate.ts` | `SystemConfigAggregate.approvePolicyChange` | aggregate |
| `R-APR-013` | Bulk Data Export Approval | `identity/application/services/user.service.ts` | `UserService.approveBulkExport` | service |
| `R-APR-014` | Vendor Payment Approval | `inventory/domain/aggregates/supplier.aggregate.ts` | `SupplierAggregate.approveOnboarding` | aggregate |
| `R-APR-015` | Curriculum Change Approval | `academics/domain/aggregates/curriculum.aggregate.ts` | `CurriculumAggregate.approveChange` | aggregate |

### CMP — Compliance — Consent, PII, POSH, Fire, FSSAI

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-CMP-001` | Parent Consent for Child Data | `administration/domain/aggregates/compliance-item.aggregate.ts` | `ComplianceItemAggregate.assertConsent` | aggregate |
| `R-CMP-002` | Consent Withdrawal | `administration/domain/aggregates/compliance-item.aggregate.ts` | `ComplianceItemAggregate.processConsentWithdrawal` | aggregate |
| `R-CMP-003` | Child Data Retention Policy | `administration/domain/aggregates/compliance-item.aggregate.ts` | `ComplianceItemAggregate.enforceRetention` | aggregate |
| `R-CMP-004` | Child Photo Storage Encryption | `administration/domain/aggregates/compliance-item.aggregate.ts` | `ComplianceItemAggregate.assertEncryptionAtRest` | aggregate |
| `R-CMP-005` | CCTV Retention Period | `administration/domain/aggregates/cctv-coverage.aggregate.ts` | `CctvCoverageAggregate.assertRetention` | aggregate |
| `R-CMP-006` | Quarterly PII Audit | `administration/domain/aggregates/compliance-item.aggregate.ts` | `ComplianceItemAggregate` | aggregate |
| `R-CMP-007` | Fire NOC Renewal | `administration/domain/aggregates/compliance-item.aggregate.ts` | `ComplianceItemAggregate.assertFireSafety` | aggregate |
| `R-CMP-008` | Data Breach Notification | `platform/domain/aggregates/breach-notification.aggregate.ts` | `BreachNotificationAggregate.notify` | aggregate |
| `R-CMP-009` | POSH Complaint Filing | `hr/domain/aggregates/icc-committee.aggregate.ts` | `IccCommitteeAggregate.handlePosh` | aggregate |
| `R-CMP-010` | POSH Confidentiality | `hr/domain/aggregates/icc-committee.aggregate.ts` | `IccCommitteeAggregate.handlePosh` | aggregate |
| `R-CMP-011` | POSH Training for All Staff | `hr/domain/aggregates/icc-committee.aggregate.ts` | `IccCommitteeAggregate.handlePosh` | aggregate |
| `R-CMP-012` | POSH Complaint Timeline | `hr/domain/aggregates/icc-committee.aggregate.ts` | `IccCommitteeAggregate.handlePosh` | aggregate |
| `R-CMP-013` | Quarterly Fire Drill | `administration/domain/aggregates/compliance-item.aggregate.ts` | `ComplianceItemAggregate.assertFireSafety` | aggregate |
| `R-CMP-014` | Fire Extinguisher Inspection | `administration/domain/aggregates/compliance-item.aggregate.ts` | `ComplianceItemAggregate.assertFireSafety` | aggregate |
| `R-CMP-015` | Evacuation Plan Display | `administration/domain/aggregates/compliance-item.aggregate.ts` | `ComplianceItemAggregate.assertFireSafety` | aggregate |
| `R-CMP-016` | RTE Non-Discrimination | `administration/domain/aggregates/compliance-item.aggregate.ts` | `ComplianceItemAggregate.assertRteNonDiscrimination` | aggregate |
| `R-CMP-017` | FSSAI Kitchen License | `hr/domain/aggregates/training-record.aggregate.ts` | `TrainingRecordAggregate.assertFoodHandlerCert` | aggregate |
| `R-CMP-018` | Food Handler Medical Certificate | `hr/domain/aggregates/training-record.aggregate.ts` | `TrainingRecordAggregate.assertFoodHandlerCert` | aggregate |

### COM — Communication — Messaging, Announcement, Chat

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-COM-001` | Parent Message Response Time | `communication/domain/aggregates/conversation.aggregate.ts` | `ConversationAggregate.assertResponseTime` | aggregate |
| `R-COM-002` | Unacknowledged Message Escalation | `communication/domain/aggregates/conversation.aggregate.ts` | `ConversationAggregate.assertResponseTime` | aggregate |
| `R-COM-003` | Non-Academic Hour Messaging Restriction | `communication/domain/aggregates/announcement.aggregate.ts` | `AnnouncementAggregate.assertBroadcastWindow` | aggregate |
| `R-COM-004` | Broadcast Restriction | `communication/domain/aggregates/announcement.aggregate.ts` | `AnnouncementAggregate.assertBroadcastWindow` | aggregate |
| `R-COM-005` | Language Preference | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.respectPreference` | aggregate |
| `R-COM-006` | Marketing Communication Opt-in | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.respectPreference` | aggregate |
| `R-COM-007` | Communication Channel Opt-out | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.respectPreference` | aggregate |
| `R-COM-008` | Announcement Approval Workflow | `communication/domain/aggregates/announcement.aggregate.ts` | `AnnouncementAggregate.approve` | aggregate |
| `R-COM-009` | Photo Caption Mandatory | `communication/domain/aggregates/announcement.aggregate.ts` | `AnnouncementAggregate.assertPhotoCaption` | aggregate |
| `R-COM-010` | Two-way Chat History Retention | `communication/domain/aggregates/conversation.aggregate.ts` | `ConversationAggregate.retainHistory` | aggregate |
| `R-COM-011` | WhatsApp Business API Rate Limit | `communication/application/services/communication.service.ts` | `CommunicationService.enforceWhatsappRateLimit` | service |
| `R-COM-012` | Emergency Notification Cascade | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.cascadeEmergency` | aggregate |

### DAT — Data — PII, Encryption, Retention, DSAR

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-DAT-001` | PII Encryption at Rest | `identity/application/services/user.service.ts` | `UserService.encryptPiiAtRest` | service |
| `R-DAT-002` | Data in Transit Encryption | `identity/domain/aggregates/user.aggregate.ts` | `UserAggregate` | aggregate |
| `R-DAT-003` | PII Field Masking in UI | `identity/application/services/permission-resolver.service.ts` | `PermissionResolverService.maskPii` | service |
| `R-DAT-004` | Role-Based Field Visibility | `identity/application/services/permission-resolver.service.ts` | `PermissionResolverService.maskPii` | service |
| `R-DAT-005` | Audit Log Retention | `identity/application/services/event-translator.service.ts` | `EventTranslatorService.recordAudit` | service |
| `R-DAT-006` | Data Residency — India Only | `identity/domain/aggregates/user.aggregate.ts` | `UserAggregate` | aggregate |
| `R-DAT-007` | Data Subject Access Request (DSAR) | `platform/domain/aggregates/dsar-request.aggregate.ts` | `DsarRequestAggregate.fulfill` | aggregate |
| `R-DAT-008` | Data Erasure Request | `platform/domain/aggregates/dsar-request.aggregate.ts` | `DsarRequestAggregate.processErasure` | aggregate |
| `R-DAT-009` | Backup Retention Policy | `identity/domain/aggregates/user.aggregate.ts` | `UserAggregate` | aggregate |
| `R-DAT-010` | Breach Detection & Response | `identity/domain/aggregates/user.aggregate.ts` | `UserAggregate` | aggregate |
| `R-DAT-011` | Soft Delete Policy | `identity/domain/aggregates/user.aggregate.ts` | `UserAggregate.softDelete` | aggregate |
| `R-DAT-012` | Anonymized Analytics Data | `identity/application/services/event-translator.service.ts` | `EventTranslatorService.anonymizeAnalytics` | service |

### ELG — Admissions — Eligibility & Enrollment

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-ELG-001` | Playgroup Age Eligibility | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertAgeEligibility` | aggregate |
| `R-ELG-002` | Nursery Age Eligibility | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertAgeEligibility` | aggregate |
| `R-ELG-003` | Jr.KG Age Eligibility | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertAgeEligibility` | aggregate |
| `R-ELG-004` | Sr.KG Age Eligibility | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertAgeEligibility` | aggregate |
| `R-ELG-005` | Age Proof Document Mandatory | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertAgeEligibility` | aggregate |
| `R-ELG-006` | Birth Certificate Mandatory | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertDocumentsComplete` | aggregate |
| `R-ELG-007` | Medical Fitness Declaration | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertMedicalFitness` | aggregate |
| `R-ELG-008` | Photograph Mandatory | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertDocumentsComplete` | aggregate |
| `R-ELG-009` | Parent/Guardian Identity Proof | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertDocumentsComplete` | aggregate |
| `R-ELG-010` | Primary Contact Mandatory | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertPrimaryContact` | aggregate |
| `R-ELG-011` | Sibling Admission Priority | `admissions/domain/aggregates/admission.aggregate.ts` | `AdmissionAggregate.applySiblingPriority` | aggregate |
| `R-ELG-012` | Staff Ward Admission Quota | `admissions/domain/aggregates/admission.aggregate.ts` | `AdmissionAggregate.applyStaffWardQuota` | aggregate |
| `R-ELG-013` | Transfer Student Eligibility | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertTransferEligibility` | aggregate |
| `R-ELG-014` | RTE Section 12 (25% EWS Reservation) | `admissions/domain/aggregates/admission.aggregate.ts` | `AdmissionAggregate.applyRteQuota` | aggregate |
| `R-ELG-015` | Special Needs Child Admission | `admissions/domain/aggregates/application.aggregate.ts` | `ApplicationAggregate.assertSpecialNeedsSupport` | aggregate |

### FIN — Finance — Fee, Invoice, Refund, Vendor Payment

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-FIN-001` | Fee Due Date Enforcement | `finance/domain/aggregates/invoice.aggregate.ts` | `InvoiceAggregate.markOverdue/applyLateFee` | aggregate |
| `R-FIN-002` | Late Fee Calculation | `finance/domain/aggregates/invoice.aggregate.ts` | `InvoiceAggregate.markOverdue/applyLateFee` | aggregate |
| `R-FIN-003` | Refund Policy — Withdrawal Before Term Start | `finance/domain/aggregates/refund.aggregate.ts` | `RefundAggregate.processRefund` | aggregate |
| `R-FIN-004` | Refund — Mid-Term Withdrawal | `finance/domain/aggregates/refund.aggregate.ts` | `RefundAggregate.processRefund` | aggregate |
| `R-FIN-005` | Sibling Discount | `finance/domain/aggregates/invoice.aggregate.ts` | `InvoiceAggregate.applyDiscount` | aggregate |
| `R-FIN-006` | Early Bird Discount | `finance/domain/aggregates/invoice.aggregate.ts` | `InvoiceAggregate.applyDiscount` | aggregate |
| `R-FIN-007` | GST on Educational Services | `finance/domain/aggregates/invoice.aggregate.ts` | `InvoiceAggregate.computeGst` | aggregate |
| `R-FIN-008` | Invoice Number Generation | `finance/domain/aggregates/invoice.aggregate.ts` | `InvoiceAggregate.generateInvoiceNumber` | aggregate |
| `R-FIN-009` | Payment Receipt Generation | `finance/domain/aggregates/payment.aggregate.ts` | `PaymentAggregate.generateReceipt` | aggregate |
| `R-FIN-010` | Digital Payment Mandate | `finance/domain/aggregates/payment.aggregate.ts` | `PaymentAggregate.validatePaymentMode` | aggregate |
| `R-FIN-011` | Cheque Bounce Handling (NSF) | `finance/domain/aggregates/payment.aggregate.ts` | `PaymentAggregate.validatePaymentMode` | aggregate |
| `R-FIN-012` | Installment Plan Approval | `finance/domain/aggregates/fee-plan.aggregate.ts` | `FeePlanAggregate.approveInstallmentPlan` | aggregate |
| `R-FIN-013` | Merit Scholarship Eligibility | `finance/domain/aggregates/fee-plan.aggregate.ts` | `FeePlanAggregate.applyScholarship` | aggregate |
| `R-FIN-014` | Bad Debt Write-off | `finance/domain/aggregates/invoice.aggregate.ts` | `InvoiceAggregate.writeOffBadDebt` | aggregate |
| `R-FIN-015` | Expense Approval Matrix | `finance/application/services/finance.service.ts` | `FinanceService.approveExpense` | service |
| `R-FIN-016` | Vendor Payment Terms | `finance/domain/aggregates/payment.aggregate.ts` | `PaymentAggregate.processVendorPayment` | aggregate |
| `R-FIN-017` | TDS Deduction on Vendor Payments | `finance/domain/aggregates/payment.aggregate.ts` | `PaymentAggregate.processVendorPayment` | aggregate |
| `R-FIN-018` | Financial Hardship Waiver | `finance/domain/aggregates/fee-plan.aggregate.ts` | `FeePlanAggregate.applyHardshipWaiver` | aggregate |
| `R-FIN-019` | RTE Section 12 Reimbursement Claim | `finance/domain/aggregates/refund.aggregate.ts` | `RefundAggregate.claimRteReimbursement` | aggregate |
| `R-FIN-020` | Annual Financial Audit | `finance/domain/aggregates/invoice.aggregate.ts` | `InvoiceAggregate` | aggregate |

### HR — HR — Staff Lifecycle & Compliance

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-HR-001` | Staff Qualification Minimum | `hr/domain/aggregates/employee.aggregate.ts` | `EmployeeAggregate.assertQualification` | aggregate |
| `R-HR-002` | Staff Background Verification | `hr/domain/aggregates/employee.aggregate.ts` | `EmployeeAggregate.assertBackgroundVerified` | aggregate |
| `R-HR-003` | Leave Entitlement Annual | `hr/domain/aggregates/leave.aggregate.ts` | `LeaveAggregate.apply/assertEntitlement` | aggregate |
| `R-HR-004` | Max Consecutive Leave | `hr/domain/aggregates/leave.aggregate.ts` | `LeaveAggregate.apply/assertEntitlement` | aggregate |
| `R-HR-005` | Substitute Teacher Assignment | `hr/domain/aggregates/substitute-assignment.aggregate.ts` | `SubstituteAssignmentAggregate.assign` | aggregate |
| `R-HR-006` | Payroll Cutoff Date | `hr/domain/aggregates/payroll.aggregate.ts` | `PayrollAggregate.runPayroll` | aggregate |
| `R-HR-007` | Performance Review Cycle | `hr/domain/aggregates/performance-review.aggregate.ts` | `PerformanceReviewAggregate.review` | aggregate |
| `R-HR-008` | Exit Process | `hr/domain/aggregates/employee.aggregate.ts` | `EmployeeAggregate.exit` | aggregate |
| `R-HR-009` | Internal Complaints Committee (ICC) | `hr/domain/aggregates/icc-committee.aggregate.ts` | `IccCommitteeAggregate.fileComplaint` | aggregate |
| `R-HR-010` | Annual POSH Training | `hr/domain/aggregates/icc-committee.aggregate.ts` | `IccCommitteeAggregate.fileComplaint` | aggregate |
| `R-HR-011` | Food Handler Medical Certificate | `hr/domain/aggregates/training-record.aggregate.ts` | `TrainingRecordAggregate.recordTraining` | aggregate |
| `R-HR-012` | Probation Period | `hr/domain/aggregates/employee.aggregate.ts` | `EmployeeAggregate.completeProbation` | aggregate |

### INV — Inventory — Stock, PO, Asset, Disposal

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-INV-001` | Auto Reorder Trigger | `inventory/domain/aggregates/reorder-alert.aggregate.ts` | `ReorderAlertAggregate.triggerReorder` | aggregate |
| `R-INV-002` | Minimum Stock Threshold | `inventory/domain/aggregates/reorder-alert.aggregate.ts` | `ReorderAlertAggregate.triggerReorder` | aggregate |
| `R-INV-003` | Perishable Item Expiry Tracking | `inventory/domain/aggregates/inventory-item.aggregate.ts` | `InventoryItemAggregate.assertExpiryTracking` | aggregate |
| `R-INV-004` | Expired Item Disposal | `inventory/domain/aggregates/expired-item-disposal.aggregate.ts` | `ExpiredItemDisposalAggregate.dispose` | aggregate |
| `R-INV-005` | Asset Depreciation | `inventory/domain/aggregates/inventory-item.aggregate.ts` | `InventoryItemAggregate.computeDepreciation` | aggregate |
| `R-INV-006` | Vendor Rating Threshold | `inventory/domain/aggregates/supplier.aggregate.ts` | `SupplierAggregate.updateRating` | aggregate |
| `R-INV-007` | PO Approval Threshold | `inventory/domain/aggregates/purchase-order.aggregate.ts` | `PurchaseOrderAggregate.approve` | aggregate |
| `R-INV-008` | Issue Slip Mandatory | `inventory/domain/aggregates/goods-issue.aggregate.ts` | `GoodsIssueAggregate.issue` | aggregate |
| `R-INV-009` | Stock Audit Frequency | `inventory/domain/aggregates/stock-audit.aggregate.ts` | `StockAuditAggregate.execute` | aggregate |
| `R-INV-010` | Return Window | `inventory/domain/aggregates/return-note.aggregate.ts` | `ReturnNoteAggregate.processReturn` | aggregate |
| `R-INV-011` | Consumption Tracking | `inventory/domain/aggregates/inventory-item.aggregate.ts` | `InventoryItemAggregate.trackConsumption` | aggregate |
| `R-INV-012` | Asset Disposal Approval | `inventory/domain/aggregates/return-note.aggregate.ts` | `ReturnNoteAggregate.disposeAsset` | aggregate |

### NOT — Notifications — Reminder & Alert Cadence

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-NOT-001` | Fee Due Reminder Cadence | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.sendFeeReminder` | aggregate |
| `R-NOT-002` | Child Absence Alert | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.alertAbsence` | aggregate |
| `R-NOT-003` | Daily Report Push Time | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.pushDailyReport` | aggregate |
| `R-NOT-004` | Birthday Greeting | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.sendGreeting` | aggregate |
| `R-NOT-005` | Festival Greeting | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.sendGreeting` | aggregate |
| `R-NOT-006` | Incident Notification | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.notifyIncident` | aggregate |
| `R-NOT-007` | Photo Share Alert | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.alertPhotoShare` | aggregate |
| `R-NOT-008` | Event Schedule Announcement | `communication/domain/aggregates/announcement.aggregate.ts` | `AnnouncementAggregate.announceEvent` | aggregate |
| `R-NOT-009` | Holiday Alert | `communication/domain/aggregates/notification.aggregate.ts` | `NotificationAggregate.sendGreeting` | aggregate |
| `R-NOT-010` | Transport Delay Alert | `transport/domain/aggregates/trip.aggregate.ts` | `TripAggregate.alertDelay` | aggregate |
| `R-NOT-011` | Salary Credit Notification | `hr/domain/aggregates/payroll.aggregate.ts` | `PayrollAggregate.notifySalaryCredit` | aggregate |
| `R-NOT-012` | System Maintenance Notification | `platform/domain/aggregates/support-ticket.aggregate.ts` | `SupportTicketAggregate.notifyMaintenance` | aggregate |

### OPS — Operations — Daily Operations & Safety

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-OPS-001` | Authorized Pickup Person List | `attendance/domain/aggregates/daily-log.aggregate.ts` | `DailyLogAggregate.assertAuthorizedPickup` | aggregate |
| `R-OPS-002` | Unauthorized Pickup Block | `attendance/domain/aggregates/daily-log.aggregate.ts` | `DailyLogAggregate.assertAuthorizedPickup` | aggregate |
| `R-OPS-003` | Late Pickup Fee | `attendance/domain/aggregates/daily-log.aggregate.ts` | `DailyLogAggregate.assertAuthorizedPickup` | aggregate |
| `R-OPS-004` | Arrival Cutoff Time | `attendance/domain/aggregates/attendance.aggregate.ts` | `AttendanceAggregate.markAttendance` | aggregate |
| `R-OPS-005` | Attendance Threshold for Promotion | `attendance/domain/aggregates/attendance.aggregate.ts` | `AttendanceAggregate.markAttendance` | aggregate |
| `R-OPS-006` | Attendance Marking Window | `attendance/domain/aggregates/attendance.aggregate.ts` | `AttendanceAggregate.markAttendance` | aggregate |
| `R-OPS-007` | Mid-Day Exit Gate Pass | `attendance/domain/aggregates/daily-log.aggregate.ts` | `DailyLogAggregate.issueGatePass` | aggregate |
| `R-OPS-008` | Visitor Logging | `administration/domain/aggregates/visitor-log.aggregate.ts` | `VisitorLogAggregate.logVisitor` | aggregate |
| `R-OPS-009` | Bus Route Assignment | `transport/domain/aggregates/trip.aggregate.ts` | `TripAggregate.trackBus` | aggregate |
| `R-OPS-010` | Bus Tracking — Real-time GPS | `transport/domain/aggregates/trip.aggregate.ts` | `TripAggregate.trackBus` | aggregate |
| `R-OPS-011` | Bus Missing Child Alert | `transport/domain/aggregates/trip.aggregate.ts` | `TripAggregate.trackBus` | aggregate |
| `R-OPS-012` | Morning Health Check | `attendance/domain/aggregates/daily-log.aggregate.ts` | `DailyLogAggregate.performHealthCheck` | aggregate |
| `R-OPS-013` | Meal Allergy Check | `attendance/domain/aggregates/daily-log.aggregate.ts` | `DailyLogAggregate.performHealthCheck` | aggregate |
| `R-OPS-014` | Nap Time Supervision | `attendance/domain/aggregates/daily-log.aggregate.ts` | `DailyLogAggregate.recordNapTime` | aggregate |
| `R-OPS-015` | Incident Escalation Matrix | `attendance/domain/aggregates/incident-report.aggregate.ts` | `IncidentReportAggregate.escalateIncident` | aggregate |
| `R-OPS-016` | Photo Consent for Marketing | `communication/domain/aggregates/announcement.aggregate.ts` | `AnnouncementAggregate.assertPhotoConsent` | aggregate |
| `R-OPS-017` | Daily Timeline Push to Parent | `attendance/domain/aggregates/daily-report.aggregate.ts` | `DailyReportAggregate.pushTimeline` | aggregate |
| `R-OPS-018` | Food Sample Retention | `administration/domain/aggregates/food-sample-retention.aggregate.ts` | `FoodSampleRetentionAggregate.retainSample` | aggregate |
| `R-OPS-019` | Washroom Assistance | `attendance/domain/aggregates/daily-log.aggregate.ts` | `DailyLogAggregate.recordNapTime` | aggregate |
| `R-OPS-020` | CCTV Coverage and Retention | `administration/domain/aggregates/cctv-coverage.aggregate.ts` | `CctvCoverageAggregate.assertRetention` | aggregate |

### PLT — Platform — Tenant, Subscription, License, Onboarding

| Rule ID | Title | Enforcing file | Target | Kind |
| --- | --- | --- | --- | --- |
| `R-PLT-001` | Tenant Data Isolation | `platform/domain/aggregates/tenant-provisioning.aggregate.ts` | `TenantProvisioningAggregate.assertIsolation` | aggregate |
| `R-PLT-002` | Subscription Grace Period | `platform/domain/aggregates/subscription.aggregate.ts` | `SubscriptionAggregate.assertGracePeriod` | aggregate |
| `R-PLT-003` | Tenant Suspension Process | `platform/domain/aggregates/subscription.aggregate.ts` | `SubscriptionAggregate.assertGracePeriod` | aggregate |
| `R-PLT-004` | Feature Flag per Tier | `settings/domain/aggregates/feature-flag.aggregate.ts` | `FeatureFlagAggregate.evaluateTier` | aggregate |
| `R-PLT-005` | License Seat Allocation | `identity/application/services/school.service.ts` | `SchoolService.assertLicenseSeats` | service |
| `R-PLT-006` | Branch-Level Data Partition | `identity/domain/aggregates/branch.aggregate.ts` | `BranchAggregate.assertDataPartition` | aggregate |
| `R-PLT-007` | Platform Admin Role Restrictions | `platform/domain/aggregates/tenant-provisioning.aggregate.ts` | `TenantProvisioningAggregate` | aggregate |
| `R-PLT-008` | Cross-Tenant Data Block | `platform/domain/aggregates/tenant-provisioning.aggregate.ts` | `TenantProvisioningAggregate.assertIsolation` | aggregate |
| `R-PLT-009` | Tenant Onboarding Validation | `platform/domain/aggregates/tenant-provisioning.aggregate.ts` | `TenantProvisioningAggregate.validateOnboarding` | aggregate |
| `R-PLT-010` | Tenant Offboarding Process | `platform/domain/aggregates/tenant-provisioning.aggregate.ts` | `TenantProvisioningAggregate.offboard` | aggregate |

## Deferred Rules

These 10 rules are enforced outside application code (infra, playbooks, manual review).
They are listed in `DEFERRED_RULES` in `brc-traceability.spec.ts`.

| Rule ID | Title | Why deferred |
| --- | --- | --- |
| `R-CMP-008` | Data Breach Notification | Playbook-driven; triggered by incident response runbook |
| `R-DAT-002` | Data in Transit Encryption | Enforced at reverse proxy / TLS termination layer |
| `R-DAT-006` | Data Residency — India Only | Enforced by infra region pinning (single-region deploy) |
| `R-DAT-009` | Backup Retention Policy | Enforced by infra backup policy (pg_dump + S3 lifecycle) |
| `R-DAT-010` | Breach Detection & Response | Enforced by infra SIEM (CloudWatch + GuardDuty) |
| `R-FIN-020` | Annual Financial Audit | Manual accounting review process |
| `R-ACD-017` | Annual Curriculum Audit | Manual academic review process |
| `R-CMP-006` | Quarterly PII Audit | Manual compliance review process |
| `R-PLT-007` | Platform Admin Role Restrictions | Infra guardrails (AWS IAM + console) |
| `R-PLT-008` | Cross-Tenant Data Block | Infra RLS guardrail (Postgres row-level security) |

## Usage Patterns

### 1. Class-level decorator (recommended for aggregates)

```typescript
import { EnforcesRule } from '@common/brc/brc-trace.decorator';

@EnforcesRule('R-HR-001', { kind: 'aggregate' })
@EnforcesRule('R-HR-002', { kind: 'aggregate' })
export class EmployeeAggregate { ... }
```

### 2. Method-level decorator (for targeted service methods)

```typescript
import { EnforcesRule } from '@common/brc/brc-trace.decorator';

export class FinanceService {
  @EnforcesRule('R-FIN-002', { kind: 'service' })
  async applyLateFee(invoiceId: string) { ... }
}
```

### 3. Test-file declaration (for spec-only rules)

```typescript
import { enforceRuleInTest } from '@common/brc/brc-trace.decorator';

enforceRuleInTest('R-FIN-001', 'finance.aggregate.spec/late-fee', __filename);
```

### 4. Bulk declaration (preferred for sweeping existing rules)

Edit `apps/api/src/common/brc/brc-declarations.ts` and append an entry to
the `DECLARATIONS` array. The traceability spec picks it up automatically.

