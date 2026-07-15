/**
 * Admissions Aggregates unit tests — pure domain logic (no IO, no NestJS).
 *
 * Per BTD §24 — Testing Strategy
 */
import { describe, it, expect } from 'vitest';

import { AdmissionAggregate } from '../domain/aggregates/admission.aggregate';
import { ApplicationAggregate } from '../domain/aggregates/application.aggregate';
import { WaitingListAggregate } from '../domain/aggregates/waiting-list.aggregate';

describe('ApplicationAggregate', () => {
  const baseProps = {
    tenantId: 'school-1',
    branchId: 'branch-1',
    academicSessionId: 'session-2027',
    applicationNumber: 'APP-2027-00001',
    programType: 'NURSERY' as const,
    admissionType: 'REGULAR' as const,
    childFirstName: 'Aarav',
    childLastName: 'Sharma',
    childDob: '2024-04-15',
    childGender: 'MALE' as const,
    preferredStartDate: '2027-06-01',
    parentDeclarations: {},
    metadata: {},
    createdBy: 'user-1',
  };

  describe('create', () => {
    it('should create a DRAFT application with ApplicationCreatedEvent', () => {
      const app = ApplicationAggregate.create(baseProps);
      expect(app.id).toBeDefined();
      expect(app.status).toBe('DRAFT');
      expect(app.applicationNumber).toBe('APP-2027-00001');
      expect(app.childFirstName).toBe('Aarav');
      expect(app.domainEvents.length).toBe(1);
      expect(app.domainEvents[0].eventType).toBe('ApplicationCreatedEvent');
    });

    it('should start with empty child entity collections', () => {
      const app = ApplicationAggregate.create(baseProps);
      expect(app.documents).toHaveLength(0);
      expect(app.counsellingSessions).toHaveLength(0);
      expect(app.approvals).toHaveLength(0);
      expect(app.offers).toHaveLength(0);
      expect(app.priorityFactors).toHaveLength(0);
    });
  });

  describe('submit', () => {
    it('should transition DRAFT → SUBMITTED and emit ApplicationSubmittedEvent', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.submit('2027-05-01T10:00:00Z');
      expect(app.status).toBe('SUBMITTED');
      expect(app.domainEvents.some(e => e.eventType === 'ApplicationSubmittedEvent')).toBe(true);
    });

    it('should throw when submitting from terminal state', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.submit('2027-05-01T10:00:00Z');
      expect(() => app.submit('2027-05-02T10:00:00Z')).toThrow(/Illegal transition/);
    });
  });

  describe('document verification', () => {
    it('should upload a document with PENDING status', () => {
      const app = ApplicationAggregate.create(baseProps);
      const doc = app.uploadDocument({
        documentType: 'BIRTH_CERTIFICATE',
        fileName: 'birth.pdf',
        fileUrl: 'https://example.com/birth.pdf',
        fileSizeBytes: 1024,
        mimeType: 'application/pdf',
      });
      expect(doc.status).toBe('PENDING');
      expect(app.documents).toHaveLength(1);
      expect(app.domainEvents.some(e => e.eventType === 'ApplicationDocumentUploadedEvent')).toBe(true);
    });

    it('should verify a document and emit ApplicationDocumentVerifiedEvent', () => {
      const app = ApplicationAggregate.create(baseProps);
      const doc = app.uploadDocument({
        documentType: 'BIRTH_CERTIFICATE',
        fileName: 'birth.pdf',
        fileUrl: 'https://example.com/birth.pdf',
        fileSizeBytes: 1024,
        mimeType: 'application/pdf',
      });
      app.verifyDocument(doc.id, 'admin-1', '2027-05-01T11:00:00Z');
      expect(app.documents[0].status).toBe('VERIFIED');
    });

    it('should reject a document with reason', () => {
      const app = ApplicationAggregate.create(baseProps);
      const doc = app.uploadDocument({
        documentType: 'PHOTO',
        fileName: 'photo.jpg',
        fileUrl: 'https://example.com/photo.jpg',
        fileSizeBytes: 2048,
        mimeType: 'image/jpeg',
      });
      app.rejectDocument(doc.id, 'Blurry image');
      expect(app.documents[0].status).toBe('REJECTED');
    });
  });

  describe('counselling', () => {
    it('should schedule a counselling session', () => {
      const app = ApplicationAggregate.create(baseProps);
      const session = app.scheduleCounselling(
        'counsellor-1', '2027-05-05T10:00:00Z', 'IN_PERSON', 30, true,
      );
      expect(session.status).toBe('SCHEDULED');
      expect(app.counsellingSessions).toHaveLength(1);
      expect(app.domainEvents.some(e => e.eventType === 'CounsellingScheduledEvent')).toBe(true);
    });

    it('should complete counselling with recommendation', () => {
      const app = ApplicationAggregate.create(baseProps);
      const session = app.scheduleCounselling(
        'counsellor-1', '2027-05-05T10:00:00Z', 'IN_PERSON',
      );
      app.completeCounselling(session.id, 'APPROVE', 'Great interaction', '2027-05-05T10:30:00Z');
      expect(app.counsellingSessions[0].status).toBe('COMPLETED');
      expect(app.counsellingSessions[0].recommendation).toBe('APPROVE');
    });
  });

  describe('approval flow', () => {
    it('should approve when counselling recommendation is APPROVE', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.submit('2027-05-01T10:00:00Z');
      app.markDocumentsPending();
      const doc1 = app.uploadDocument({
        documentType: 'BIRTH_CERTIFICATE', fileName: 'b.pdf',
        fileUrl: 'https://e.com/b.pdf', fileSizeBytes: 1, mimeType: 'application/pdf',
      });
      app.verifyDocument(doc1.id, 'admin-1', '2027-05-01T11:00:00Z');
      const doc2 = app.uploadDocument({
        documentType: 'PHOTO', fileName: 'p.jpg',
        fileUrl: 'https://e.com/p.jpg', fileSizeBytes: 1, mimeType: 'image/jpeg',
      });
      app.verifyDocument(doc2.id, 'admin-1', '2027-05-01T11:00:00Z');
      app.verify('2027-05-02T10:00:00Z');
      const session = app.scheduleCounselling('c-1', '2027-05-05T10:00:00Z', 'IN_PERSON');
      app.completeCounselling(session.id, 'APPROVE', 'Good', '2027-05-05T10:30:00Z');
      app.approve('director-1', '2027-05-10T10:00:00Z', 'admission-1');
      expect(app.status).toBe('APPROVED');
      expect(app.domainEvents.some(e => e.eventType === 'ApplicationApprovedEvent')).toBe(true);
    });

    it('should reject with reason', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.submit('2027-05-01T10:00:00Z');
      app.markDocumentsPending();
      const doc1 = app.uploadDocument({
        documentType: 'BIRTH_CERTIFICATE', fileName: 'b.pdf',
        fileUrl: 'https://e.com/b.pdf', fileSizeBytes: 1, mimeType: 'application/pdf',
      });
      app.verifyDocument(doc1.id, 'admin-1', '2027-05-01T11:00:00Z');
      const doc2 = app.uploadDocument({
        documentType: 'PHOTO', fileName: 'p.jpg',
        fileUrl: 'https://e.com/p.jpg', fileSizeBytes: 1, mimeType: 'image/jpeg',
      });
      app.verifyDocument(doc2.id, 'admin-1', '2027-05-01T11:00:00Z');
      app.verify('2027-05-02T10:00:00Z');
      app.reject('director-1', '2027-05-10T10:00:00Z', 'NO_SEAT', 'No seats available');
      expect(app.status).toBe('REJECTED');
      expect(app.domainEvents.some(e => e.eventType === 'ApplicationRejectedEvent')).toBe(true);
    });

    it('should refuse approve without counselling APPROVE recommendation', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.submit('2027-05-01T10:00:00Z');
      app.markDocumentsPending();
      const doc1 = app.uploadDocument({
        documentType: 'BIRTH_CERTIFICATE', fileName: 'b.pdf',
        fileUrl: 'https://e.com/b.pdf', fileSizeBytes: 1, mimeType: 'application/pdf',
      });
      app.verifyDocument(doc1.id, 'a-1', '2027-05-01T11:00:00Z');
      const doc2 = app.uploadDocument({
        documentType: 'PHOTO', fileName: 'p.jpg',
        fileUrl: 'https://e.com/p.jpg', fileSizeBytes: 1, mimeType: 'image/jpeg',
      });
      app.verifyDocument(doc2.id, 'a-1', '2027-05-01T11:00:00Z');
      app.verify('2027-05-02T10:00:00Z');
      expect(() => app.approve('d-1', '2027-05-10T10:00:00Z', 'adm-1')).toThrow(/counselling/);
    });
  });

  describe('waitlist', () => {
    it('should waitlist an application with position + score', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.submit('2027-05-01T10:00:00Z');
      app.markDocumentsPending();
      const doc1 = app.uploadDocument({
        documentType: 'BIRTH_CERTIFICATE', fileName: 'b.pdf',
        fileUrl: 'https://e.com/b.pdf', fileSizeBytes: 1, mimeType: 'application/pdf',
      });
      app.verifyDocument(doc1.id, 'admin-1', '2027-05-01T11:00:00Z');
      const doc2 = app.uploadDocument({
        documentType: 'PHOTO', fileName: 'p.jpg',
        fileUrl: 'https://e.com/p.jpg', fileSizeBytes: 1, mimeType: 'image/jpeg',
      });
      app.verifyDocument(doc2.id, 'admin-1', '2027-05-01T11:00:00Z');
      app.verify('2027-05-02T10:00:00Z');
      app.waitlist(3, 25);
      expect(app.status).toBe('WAITLISTED');
      expect(app.domainEvents.some(e => e.eventType === 'ApplicationWaitlistedEvent')).toBe(true);
    });
  });

  describe('cancel', () => {
    it('should cancel a submitted application', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.submit('2027-05-01T10:00:00Z');
      app.cancel('Parent changed mind', '2027-05-02T10:00:00Z');
      expect(app.status).toBe('CANCELLED');
    });
  });

  describe('age verification', () => {
    it('should set eligibility based on age range', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.performAgeVerification(2.5, 3.5, 3.0, 'admin-1', '2027-05-01T11:00:00Z');
      expect(app.ageEligible).toBe(true);
    });

    it('should mark ineligible when age is below min', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.performAgeVerification(3.0, 4.0, 2.5, 'admin-1', '2027-05-01T11:00:00Z');
      expect(app.ageEligible).toBe(false);
    });

    it('should allow override of ineligible child', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.performAgeVerification(3.0, 4.0, 2.5, 'admin-1', '2027-05-01T11:00:00Z');
      app.overrideAgeEligibility('Special case — principal approval', 'principal-1');
      expect(app.ageEligible).toBe(true);
    });
  });

  describe('priority factors', () => {
    it('should add priority factors and compute score', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.addPriorityFactor('SIBLING', 20);
      app.addPriorityFactor('STAFF_CHILD', 15);
      expect(app.priorityScore).toBe(0);
      const sibling = app.priorityFactors.find(p => p.factor === 'SIBLING');
      app.verifyPriorityFactor(sibling!.id);
      expect(app.priorityScore).toBe(20);
    });
  });

  describe('offers', () => {
    it('should issue offer with unique number', () => {
      const app = ApplicationAggregate.create(baseProps);
      const offer = app.issueOffer({
        offerNumber: 'OFR-2027-00001',
        offeredProgram: 'NURSERY',
        feeQuoteCents: 500000,
        securityDepositCents: 25000,
        offerLetterUrl: 'https://e.com/offer.pdf',
        issuedAt: '2027-05-10T10:00:00Z',
        expiresAt: '2027-12-17T10:00:00Z',
      });
      expect(offer.offerNumber).toBe('OFR-2027-00001');
      expect(offer.isActive).toBe(true);
      expect(app.hasActiveOffer).toBe(true);
    });

    it('should refuse second offer when one is active', () => {
      const app = ApplicationAggregate.create(baseProps);
      app.issueOffer({
        offerNumber: 'OFR-2027-00001',
        offeredProgram: 'NURSERY',
        feeQuoteCents: 500000,
        securityDepositCents: 25000,
        offerLetterUrl: 'https://e.com/offer.pdf',
        issuedAt: '2027-05-10T10:00:00Z',
        expiresAt: '2027-12-17T10:00:00Z',
      });
      expect(() => app.issueOffer({
        offerNumber: 'OFR-2027-00002',
        offeredProgram: 'NURSERY',
        feeQuoteCents: 500000,
        securityDepositCents: 25000,
        offerLetterUrl: 'https://e.com/offer2.pdf',
        issuedAt: '2027-05-11T10:00:00Z',
        expiresAt: '2027-12-18T10:00:00Z',
      })).toThrow(/active offer already exists/);
    });

    it('should accept an offer', () => {
      const app = ApplicationAggregate.create(baseProps);
      const offer = app.issueOffer({
        offerNumber: 'OFR-2027-00001',
        offeredProgram: 'NURSERY',
        feeQuoteCents: 500000,
        securityDepositCents: 25000,
        offerLetterUrl: 'https://e.com/offer.pdf',
        issuedAt: '2027-05-10T10:00:00Z',
        expiresAt: '2027-12-17T10:00:00Z',
      });
      app.acceptOffer(offer.id, '2027-05-12T10:00:00Z');
      expect(app.hasActiveOffer).toBe(false);
    });
  });
});

describe('AdmissionAggregate', () => {
  const baseProps = {
    tenantId: 'school-1',
    applicationId: 'app-1',
    admissionNumber: 'ADM-2027-00001',
    admissionDate: '2027-06-01',
    admissionType: 'REGULAR' as const,
  };

  it('should create an ACTIVE admission with AdmissionCreatedEvent', () => {
    const admission = AdmissionAggregate.create(baseProps);
    expect(admission.status).toBe('ACTIVE');
    expect(admission.admissionNumber).toBe('ADM-2027-00001');
    expect(admission.domainEvents.length).toBe(1);
    expect(admission.domainEvents[0].eventType).toBe('AdmissionCreatedEvent');
  });

  it('should assign student after creation', () => {
    const admission = AdmissionAggregate.create(baseProps);
    admission.assignStudent('student-1');
    expect(admission.studentId).toBe('student-1');
  });

  it('should refuse double student assignment', () => {
    const admission = AdmissionAggregate.create(baseProps);
    admission.assignStudent('student-1');
    expect(() => admission.assignStudent('student-2')).toThrow(/already assigned/);
  });

  it('should cancel admission with refund', () => {
    const admission = AdmissionAggregate.create(baseProps);
    admission.cancel('Parent withdrew', 50000, '2027-07-01T10:00:00Z');
    expect(admission.status).toBe('CANCELLED');
    expect(admission.domainEvents.some(e => e.eventType === 'AdmissionCancelledEvent')).toBe(true);
  });

  it('should graduate an active admission', () => {
    const admission = AdmissionAggregate.create(baseProps);
    admission.graduate();
    expect(admission.status).toBe('GRADUATED');
  });

  it('should refuse cancel on terminal admission', () => {
    const admission = AdmissionAggregate.create(baseProps);
    admission.graduate();
    expect(() => admission.cancel('x', null, '2027-07-01T10:00:00Z')).toThrow(/Illegal transition/);
  });
});

describe('WaitingListAggregate', () => {
  const baseProps = {
    tenantId: 'school-1',
    applicationId: 'app-1',
    branchId: 'branch-1',
    programType: 'NURSERY' as const,
    academicSessionId: 'session-2027',
    position: 3,
    priorityScore: 20,
  };

  it('should create a WAITING entry with WaitingListEntryAddedEvent', () => {
    const entry = WaitingListAggregate.create(baseProps);
    expect(entry.state).toBe('WAITING');
    expect(entry.position).toBe(3);
    expect(entry.domainEvents[0].eventType).toBe('WaitingListEntryAddedEvent');
  });

  it('should refuse position < 1', () => {
    expect(() => WaitingListAggregate.create({ ...baseProps, position: 0 })).toThrow(/Position/);
  });

  it('should offer a seat with expiry', () => {
    const entry = WaitingListAggregate.create(baseProps);
    entry.offerSeat('2027-05-10T10:00:00Z', '2027-12-17T10:00:00Z');
    expect(entry.state).toBe('SEAT_OFFERED');
    expect(entry.isOfferActive).toBe(true);
    expect(entry.domainEvents.some(e => e.eventType === 'WaitingListSeatOfferedEvent')).toBe(true);
  });

  it('should accept an active offer', () => {
    const entry = WaitingListAggregate.create(baseProps);
    entry.offerSeat('2027-05-10T10:00:00Z', '2027-12-17T10:00:00Z');
    entry.accept('2027-05-12T10:00:00Z');
    expect(entry.state).toBe('ACCEPTED');
  });

  it('should refuse accept on expired offer', () => {
    const entry = WaitingListAggregate.create(baseProps);
    entry.offerSeat('2027-05-10T10:00:00Z', '2027-05-11T10:00:00Z');
    expect(() => entry.accept('2027-05-20T10:00:00Z')).toThrow(/expired/);
    expect(entry.state).toBe('EXPIRED');
  });

  it('should promote (decrement position) when seat frees up', () => {
    const entry = WaitingListAggregate.create({ ...baseProps, position: 5 });
    entry.promote();
    expect(entry.position).toBe(4);
    expect(entry.domainEvents.some(e => e.eventType === 'WaitingListPromotedEvent')).toBe(true);
  });

  it('should refuse promote at position 1', () => {
    const entry = WaitingListAggregate.create({ ...baseProps, position: 1 });
    expect(() => entry.promote()).toThrow(/position 1/);
  });

  it('should demote when higher-priority entry added', () => {
    const entry = WaitingListAggregate.create({ ...baseProps, position: 3 });
    entry.demote();
    expect(entry.position).toBe(4);
  });

  it('should refuse offer seat when not WAITING', () => {
    const entry = WaitingListAggregate.create(baseProps);
    entry.offerSeat('2027-05-10T10:00:00Z', '2027-12-17T10:00:00Z');
    expect(() => entry.offerSeat('2027-05-12T10:00:00Z', '2027-12-19T10:00:00Z')).toThrow(/state/);
  });
});
