/**
 * SupplierAggregate — vendor master record for procurement.
 *
 * Per BRC §11 (R-INV-006): Vendor rating + onboarding
 * Per BRC §8 (R-APR-005): Supplier onboarding approval
 *
 * Lifecycle: ACTIVE → BLACKLISTED / INACTIVE
 *
 * Invariants:
 *   - supplierCode is unique per school
 *   - GST number (if provided) must be 15 chars
 *   - PAN number (if provided) must be 10 chars
 *   - Cannot blacklist supplier with open POs
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  SupplierCreatedEvent, SupplierUpdatedEvent, SupplierBlacklistedEvent,
} from '../events/inventory-events';

export type SupplierStatus = 'ACTIVE' | 'BLACKLISTED' | 'INACTIVE';

export interface SupplierProps {
  tenantId: string;
  supplierCode: string;
  name: string;
  legalName?: string;
  gstNumber?: string;
  panNumber?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  paymentTerms: number; // days
  status: SupplierStatus;
  blacklistReason?: string;
  createdAt: string;
  updatedAt: string;
}

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export class SupplierAggregate extends AggregateRoot<SupplierProps> {
  get tenantId(): string { return this._props.tenantId; }
  get supplierCode(): string { return this._props.supplierCode; }
  get name(): string { return this._props.name; }
  get status(): SupplierStatus { return this._props.status; }
  get paymentTerms(): number { return this._props.paymentTerms; }

  static create(props: Omit<SupplierProps, 'status' | 'createdAt' | 'updatedAt'>): SupplierAggregate {
    if (props.gstNumber && !GST_REGEX.test(props.gstNumber)) {
      throw new Error('Invalid GST number format');
    }
    if (props.panNumber && !PAN_REGEX.test(props.panNumber)) {
      throw new Error('Invalid PAN number format');
    }
    const now = new Date().toISOString();
    const agg = new SupplierAggregate({
      ...props,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new SupplierCreatedEvent({
      supplierId: agg.id,
      tenantId: agg._props.tenantId,
      supplierCode: agg._props.supplierCode,
      name: agg._props.name,
    }));
    return agg;
  }

  update(changes: Partial<Omit<SupplierProps, 'tenantId' | 'supplierCode' | 'status' | 'createdAt'>>): void {
    if (changes.gstNumber && !GST_REGEX.test(changes.gstNumber)) {
      throw new Error('Invalid GST number format');
    }
    if (changes.panNumber && !PAN_REGEX.test(changes.panNumber)) {
      throw new Error('Invalid PAN number format');
    }
    Object.assign(this._props, changes);
    this._touch();
    this._addDomainEvent(new SupplierUpdatedEvent({
      supplierId: this.id,
      tenantId: this._props.tenantId,
      changes,
    }));
  }

  blacklist(reason: string): void {
    if (this._props.status === 'BLACKLISTED') return;
    if (this._props.status === 'INACTIVE') {
      throw new Error('Cannot blacklist INACTIVE supplier');
    }
    this._props.status = 'BLACKLISTED';
    this._props.blacklistReason = reason;
    this._touch();
    this._addDomainEvent(new SupplierBlacklistedEvent({
      supplierId: this.id,
      tenantId: this._props.tenantId,
      reason,
    }));
  }

  reactivate(): void {
    if (this._props.status === 'ACTIVE') return;
    this._props.status = 'ACTIVE';
    this._props.blacklistReason = undefined;
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
