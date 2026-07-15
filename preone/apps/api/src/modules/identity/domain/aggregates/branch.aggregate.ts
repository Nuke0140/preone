/**
 * BranchAggregate — physical location of a school.
 *
 * Per ERD v3.0 §11.4.3: "Each branch has its own address, contacts, classrooms,
 *   staff, and operational settings. A school can have one or more branches."
 *
 * Per ADR-001: Multi-School → Multi-Branch → Multi-Academic-Year isolation.
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export interface BranchProps {
  schoolId: string;
  code: string;          // BR-001, BR-002
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  phone: string;
  email?: string;
  timezone: string;
  locale: string;
  isActive: boolean;
  openedAt?: string;
  closedAt?: string;
  deletedAt?: string;
}

export class BranchCreatedEvent extends DomainEvent<{
  branchId: string;
  schoolId: string;
  code: string;
  name: string;
  createdBy: string;
}> {}

export class BranchDeactivatedEvent extends DomainEvent<{
  branchId: string;
  deactivatedAt: string;
}> {}

export class BranchAggregate extends AggregateRoot<BranchProps> {
  get schoolId(): string { return this._props.schoolId; }
  get code(): string { return this._props.code; }
  get name(): string { return this._props.name; }
  get addressLine1(): string { return this._props.addressLine1; }
  get addressLine2(): string | undefined { return this._props.addressLine2; }
  get city(): string { return this._props.city; }
  get state(): string { return this._props.state; }
  get pincode(): string { return this._props.pincode; }
  get country(): string { return this._props.country; }
  get latitude(): number | undefined { return this._props.latitude; }
  get longitude(): number | undefined { return this._props.longitude; }
  get googlePlaceId(): string | undefined { return this._props.googlePlaceId; }
  get phone(): string { return this._props.phone; }
  get email(): string | undefined { return this._props.email; }
  get timezone(): string { return this._props.timezone; }
  get locale(): string { return this._props.locale; }
  get isActive(): boolean { return this._props.isActive; }
  get openedAt(): string | undefined { return this._props.openedAt; }
  get closedAt(): string | undefined { return this._props.closedAt; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  updateProfile(props: Partial<Pick<BranchProps, 'name' | 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'pincode' | 'phone' | 'email' | 'latitude' | 'longitude' | 'googlePlaceId' | 'timezone' | 'locale'>>): void {
    if (props.name !== undefined) this._props.name = props.name;
    if (props.addressLine1 !== undefined) this._props.addressLine1 = props.addressLine1;
    if (props.addressLine2 !== undefined) this._props.addressLine2 = props.addressLine2;
    if (props.city !== undefined) this._props.city = props.city;
    if (props.state !== undefined) this._props.state = props.state;
    if (props.pincode !== undefined) this._props.pincode = props.pincode;
    if (props.phone !== undefined) this._props.phone = props.phone;
    if (props.email !== undefined) this._props.email = props.email;
    if (props.latitude !== undefined) this._props.latitude = props.latitude;
    if (props.longitude !== undefined) this._props.longitude = props.longitude;
    if (props.googlePlaceId !== undefined) this._props.googlePlaceId = props.googlePlaceId;
    if (props.timezone !== undefined) this._props.timezone = props.timezone;
    if (props.locale !== undefined) this._props.locale = props.locale;
  }

  activate(): void {
    this._props.isActive = true;
    this._props.closedAt = undefined;
  }

  deactivate(now: string): void {
    this._props.isActive = false;
    this._props.closedAt = now;
    this._addDomainEvent(new BranchDeactivatedEvent({ branchId: this.id, deactivatedAt: now }));
  }

  softDelete(now: string): void {
    this._props.deletedAt = now;
    this._props.isActive = false;
  }

  static create(
    props: Omit<BranchProps, 'isActive' | 'country' | 'timezone' | 'locale'> & {
      country?: string;
      timezone?: string;
      locale?: string;
    },
    createdBy: string,
  ): BranchAggregate {
    const aggregate = new BranchAggregate({
      ...props,
      country: props.country ?? 'India',
      timezone: props.timezone ?? 'Asia/Kolkata',
      locale: props.locale ?? 'en-IN',
      isActive: true,
    });
    aggregate._addDomainEvent(new BranchCreatedEvent({
      branchId: aggregate.id,
      schoolId: props.schoolId,
      code: props.code,
      name: props.name,
      createdBy,
    }));
    return aggregate;
  }
}
