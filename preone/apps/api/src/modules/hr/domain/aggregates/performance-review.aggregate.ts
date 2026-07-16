/**
 * PerformanceReviewAggregate — quarterly staff performance review (R-HR-007).
 *
 * Lifecycle:
 *   DRAFT → SELF_ASSESSMENT → MANAGER_REVIEW → HR_REVIEW → COMPLETED → {ARCHIVED}
 *
 * Invariants (per BRC R-HR-007):
 *   - Quarterly review cycle (Q1, Q2, Q3, Q4)
 *   - 360-degree feedback (peers, manager, self)
 *   - Rating scale: 1-5 (1=Needs Improvement, 5=Outstanding)
 *   - Calibration by HR before finalization
 *   - Goals set during review feed into next cycle
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  PerformanceReviewStartedEvent, PerformanceReviewSelfSubmittedEvent,
  PerformanceReviewManagerSubmittedEvent, PerformanceReviewCompletedEvent,
  PerformanceReviewArchivedEvent,
} from '../events/hr-events';

export type ReviewCycle = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ANNUAL' | 'PROBATION_END';
export type ReviewStatus =
  | 'DRAFT' | 'SELF_ASSESSMENT' | 'MANAGER_REVIEW'
  | 'HR_REVIEW' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED';

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface ReviewGoal {
  id: string;
  title: string;
  description: string;
  weightPercent: number;
  selfRating?: Rating;
  managerRating?: Rating;
  finalRating?: Rating;
  selfComments?: string;
  managerComments?: string;
}

export interface CompetencyAssessment {
  competency: string;
  selfRating?: Rating;
  managerRating?: Rating;
  finalRating?: Rating;
  comments?: string;
}

export interface ReviewProps {
  tenantId: string;
  branchId?: string;
  employeeId: string;
  reviewerId: string; // direct manager
  hrReviewerId?: string;
  cycle: ReviewCycle;
  cycleYear: number;
  status: ReviewStatus;
  goals: ReviewGoal[];
  competencies: CompetencyAssessment[];
  selfAssessmentSubmittedAt?: string;
  managerReviewSubmittedAt?: string;
  hrReviewSubmittedAt?: string;
  completedAt?: string;
  overallRating?: Rating;
  promotionRecommended: boolean;
  salaryRevisionPercent?: number;
  strengths?: string;
  improvements?: string;
  actionPlan?: string;
  employeeAcknowledgedAt?: string;
  employeeFeedback?: string;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  DRAFT: ['SELF_ASSESSMENT', 'CANCELLED'],
  SELF_ASSESSMENT: ['MANAGER_REVIEW', 'CANCELLED'],
  MANAGER_REVIEW: ['HR_REVIEW', 'COMPLETED', 'CANCELLED'],
  HR_REVIEW: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: [],
};

export class PerformanceReviewAggregate extends AggregateRoot<ReviewProps> {
  get tenantId(): string { return this._props.tenantId; }
  get employeeId(): string { return this._props.employeeId; }
  get status(): ReviewStatus { return this._props.status; }
  get cycle(): ReviewCycle { return this._props.cycle; }
  get overallRating(): Rating | undefined { return this._props.overallRating; }

  static create(props: Omit<
    ReviewProps,
    'status' | 'goals' | 'competencies' | 'promotionRecommended' |
    'createdAt' | 'updatedAt'
  >): PerformanceReviewAggregate {
    const now = new Date().toISOString();
    const agg = new PerformanceReviewAggregate({
      ...props,
      status: 'DRAFT',
      goals: [],
      competencies: [],
      promotionRecommended: false,
      createdAt: now,
      updatedAt: now,
    });
    return agg;
  }

  /**
   * Start the review — moves to self-assessment phase.
   */
  start(): void {
    this._requireTransition('SELF_ASSESSMENT');
    this._props.status = 'SELF_ASSESSMENT';
    this._touch();
    this._addDomainEvent(new PerformanceReviewStartedEvent({
      reviewId: this.id,
      tenantId: this._props.tenantId,
      employeeId: this._props.employeeId,
      cycle: this._props.cycle,
      cycleYear: this._props.cycleYear,
    }));
  }

  addGoal(goal: Omit<ReviewGoal, 'id'>): void {
    if (this._props.status !== 'DRAFT' && this._props.status !== 'SELF_ASSESSMENT') {
      throw new Error('Cannot add goals after self-assessment starts');
    }
    const totalWeight = this._props.goals.reduce((s, g) => s + g.weightPercent, 0) + goal.weightPercent;
    if (totalWeight > 100) {
      throw new Error(`Goal weights exceed 100% (would be ${totalWeight}%)`);
    }
    this._props.goals.push({ ...goal, id: crypto.randomUUID() });
    this._touch();
  }

  /**
   * Submit self-assessment — sets self-ratings + comments.
   */
  submitSelfAssessment(goalRatings: Record<string, { rating: Rating; comments?: string }>): void {
    this._requireTransition('MANAGER_REVIEW');
    if (this._props.goals.length === 0) {
      throw new Error('Cannot submit self-assessment without goals');
    }
    for (const goal of this._props.goals) {
      const r = goalRatings[goal.id];
      if (r) {
        goal.selfRating = r.rating;
        goal.selfComments = r.comments;
      }
    }
    this._props.status = 'MANAGER_REVIEW';
    this._props.selfAssessmentSubmittedAt = new Date().toISOString();
    this._touch();
    this._addDomainEvent(new PerformanceReviewSelfSubmittedEvent({
      reviewId: this.id,
      tenantId: this._props.tenantId,
      employeeId: this._props.employeeId,
    }));
  }

  /**
   * Submit manager review — sets manager ratings + overall assessment.
   */
  submitManagerReview(
    goalRatings: Record<string, { rating: Rating; comments?: string }>,
    strengths: string,
    improvements: string,
    actionPlan: string,
    promotionRecommended: boolean,
    salaryRevisionPercent?: number,
  ): void {
    if (this._props.status !== 'MANAGER_REVIEW' && this._props.status !== 'HR_REVIEW') {
      throw new Error(`Cannot submit manager review from ${this._props.status}`);
    }
    for (const goal of this._props.goals) {
      const r = goalRatings[goal.id];
      if (r) {
        goal.managerRating = r.rating;
        goal.managerComments = r.comments;
      }
    }
    this._props.strengths = strengths;
    this._props.improvements = improvements;
    this._props.actionPlan = actionPlan;
    this._props.promotionRecommended = promotionRecommended;
    this._props.salaryRevisionPercent = salaryRevisionPercent;
    this._props.managerReviewSubmittedAt = new Date().toISOString();
    // If no HR reviewer, go directly to COMPLETED; else HR_REVIEW
    if (this._props.hrReviewerId && this._props.status === 'MANAGER_REVIEW') {
      this._props.status = 'HR_REVIEW';
    } else if (this._props.status === 'MANAGER_REVIEW') {
      this._props.status = 'COMPLETED';
      this._props.completedAt = new Date().toISOString();
      this._computeOverallRating();
      this._addDomainEvent(new PerformanceReviewCompletedEvent({
        reviewId: this.id,
        tenantId: this._props.tenantId,
        employeeId: this._props.employeeId,
        overallRating: this._props.overallRating!,
        promotionRecommended,
      }));
    }
    this._touch();
    this._addDomainEvent(new PerformanceReviewManagerSubmittedEvent({
      reviewId: this.id,
      tenantId: this._props.tenantId,
      employeeId: this._props.employeeId,
      reviewerId: this._props.reviewerId,
    }));
  }

  /**
   * Complete HR review — finalize ratings + overall.
   */
  completeHrReview(
    goalFinalRatings: Record<string, Rating>,
    overallRating: Rating,
  ): void {
    this._requireTransition('COMPLETED');
    for (const goal of this._props.goals) {
      const r = goalFinalRatings[goal.id];
      if (r) goal.finalRating = r;
    }
    this._props.overallRating = overallRating;
    this._props.status = 'COMPLETED';
    this._props.completedAt = new Date().toISOString();
    this._props.hrReviewSubmittedAt = this._props.completedAt;
    this._touch();
    this._addDomainEvent(new PerformanceReviewCompletedEvent({
      reviewId: this.id,
      tenantId: this._props.tenantId,
      employeeId: this._props.employeeId,
      overallRating,
      promotionRecommended: this._props.promotionRecommended,
    }));
  }

  acknowledgeByEmployee(feedback?: string): void {
    if (this._props.status !== 'COMPLETED') {
      throw new Error('Employee can only acknowledge COMPLETED reviews');
    }
    this._props.employeeAcknowledgedAt = new Date().toISOString();
    this._props.employeeFeedback = feedback;
    this._touch();
  }

  archive(): void {
    this._requireTransition('ARCHIVED');
    this._props.status = 'ARCHIVED';
    this._touch();
    this._addDomainEvent(new PerformanceReviewArchivedEvent({
      reviewId: this.id,
      tenantId: this._props.tenantId,
      employeeId: this._props.employeeId,
    }));
  }

  private _computeOverallRating(): void {
    if (this._props.goals.length === 0) return;
    const totalWeight = this._props.goals.reduce((s, g) => s + g.weightPercent, 0);
    if (totalWeight === 0) return;
    const weightedSum = this._props.goals.reduce(
      (s, g) => s + (g.managerRating ?? g.selfRating ?? 3) * g.weightPercent, 0,
    );
    const overall = Math.round(weightedSum / totalWeight) as Rating;
    this._props.overallRating = Math.max(1, Math.min(5, overall)) as Rating;
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: ReviewStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid review transition: ${this._props.status} → ${target}`);
    }
  }
}
