/**
 * PortfolioAggregate — per-enrollment student portfolio with items.
 *
 * Per ERD v3.0 §15.4.21: "A portfolio is a curated collection of student
 *   work, milestones, and observations. Used for parent engagement and
 *   progress tracking across the academic session."
 *
 * Contains child entities (PortfolioItem) — managed through the aggregate root.
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { Entity } from '@shared/kernel/entity';

import {
  PortfolioItemAddedEvent, PortfolioItemHighlightedEvent,
} from '../events/academics-events';

export type PortfolioItemType =
  | 'ARTWORK' | 'PHOTO' | 'VIDEO' | 'AUDIO' | 'WRITTEN'
  | 'PROJECT' | 'CERTIFICATE' | 'MILESTONE' | 'OTHER';

export interface PortfolioItemProps {
  id: string;
  type: PortfolioItemType;
  title: string;
  description?: string;
  s3ObjectKey?: string;
  thumbnailUrl?: string;
  capturedAt: string;
  capturedBy: string;
  tags: string[];
  milestoneIds: string[];
  isHighlight: boolean;
  isSharedWithParent: boolean;
  sortOrder: number;
  deletedAt?: string;
}

export class PortfolioItem extends Entity<PortfolioItemProps> {
  get type(): PortfolioItemType { return this._props.type; }
  get title(): string { return this._props.title; }
  get description(): string | undefined { return this._props.description; }
  get s3ObjectKey(): string | undefined { return this._props.s3ObjectKey; }
  get thumbnailUrl(): string | undefined { return this._props.thumbnailUrl; }
  get capturedAt(): string { return this._props.capturedAt; }
  get capturedBy(): string { return this._props.capturedBy; }
  get tags(): string[] { return [...this._props.tags]; }
  get milestoneIds(): string[] { return [...this._props.milestoneIds]; }
  get isHighlight(): boolean { return this._props.isHighlight; }
  get isSharedWithParent(): boolean { return this._props.isSharedWithParent; }
  get sortOrder(): number { return this._props.sortOrder; }

  updateTitle(title: string): void {
    this._props.title = title;
  }

  updateDescription(description: string): void {
    this._props.description = description;
  }

  setHighlight(highlight: boolean): void {
    this._props.isHighlight = highlight;
  }

  addTag(tag: string): void {
    if (!this._props.tags.includes(tag)) {
      this._props.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    this._props.tags = this._props.tags.filter((t) => t !== tag);
  }
}

export interface PortfolioProps {
  tenantId: string;
  enrollmentId: string;
  sectionId: string;

  title: string;
  description?: string;
  coverImageUrl?: string;
  itemCount: number;
  isSharedWithParent: boolean;

  items: PortfolioItem[];

  deletedAt?: string;
}

export class PortfolioAggregate extends AggregateRoot<PortfolioProps> {
  get tenantId(): string { return this._props.tenantId; }
  get enrollmentId(): string { return this._props.enrollmentId; }
  get sectionId(): string { return this._props.sectionId; }
  get title(): string { return this._props.title; }
  get description(): string | undefined { return this._props.description; }
  get coverImageUrl(): string | undefined { return this._props.coverImageUrl; }
  get itemCount(): number { return this._props.itemCount; }
  get isSharedWithParent(): boolean { return this._props.isSharedWithParent; }
  get items(): PortfolioItem[] { return [...this._props.items]; }
  get highlights(): PortfolioItem[] { return this._props.items.filter((i) => i.isHighlight); }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  addItem(item: Omit<PortfolioItemProps, 'id'> & { id?: string }): PortfolioItem {
    const { id, ...rest } = item;
    const entity = new PortfolioItem(rest as PortfolioItemProps, id);
    this._props.items.push(entity);
    this._props.itemCount = this._props.items.length;
    this._addDomainEvent(new PortfolioItemAddedEvent({
      portfolioId: this.id,
      tenantId: this._props.tenantId,
      enrollmentId: this._props.enrollmentId,
      itemId: entity.id,
      type: entity.type,
      title: entity.title,
    }));
    return entity;
  }

  removeItem(itemId: string): void {
    const item = this._props.items.find((i) => i.id === itemId);
    if (!item) return;
    this._props.items = this._props.items.filter((i) => i.id !== itemId);
    this._props.itemCount = this._props.items.length;
  }

  highlightItem(itemId: string): void {
    const item = this._props.items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error(`Portfolio item ${itemId} not found`);
    }
    item.setHighlight(true);
    this._addDomainEvent(new PortfolioItemHighlightedEvent({
      portfolioId: this.id, itemId,
    }));
  }

  unhighlightItem(itemId: string): void {
    const item = this._props.items.find((i) => i.id === itemId);
    if (item) item.setHighlight(false);
  }

  updateTitle(title: string): void {
    this._props.title = title;
  }

  updateDescription(description: string): void {
    this._props.description = description;
  }

  setCoverImage(url: string): void {
    this._props.coverImageUrl = url;
  }

  shareWithParent(): void {
    this._props.isSharedWithParent = true;
  }

  unshareWithParent(): void {
    this._props.isSharedWithParent = false;
  }

  softDelete(now: string): void {
    this._props.deletedAt = now;
  }

  static create(props: Omit<PortfolioProps, 'itemCount' | 'items'> & {
    itemCount?: number;
    items?: PortfolioItem[];
  }): PortfolioAggregate {
    return new PortfolioAggregate({
      ...props,
      itemCount: props.itemCount ?? 0,
      items: props.items ?? [],
    });
  }
}
