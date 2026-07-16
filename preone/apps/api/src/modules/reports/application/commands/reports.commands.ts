/**
 * Reports Commands.
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

export class CreateReportDefinitionCommand implements Command<{
  tenantId?: string;
  key: string;
  name: string;
  description?: string;
  category: any;
  dataSource: string;
  queryTemplate: string;
  parameters?: any;
  defaultFormat?: any;
  allowedFormats?: any[];
  isSystem?: boolean;
}, { id: string }> {
  readonly type = 'Reports.CreateDefinition';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ExecuteReportCommand implements Command<{
  tenantId: string;
  branchId?: string;
  reportDefId: string;
  requestedById: string;
  format?: any;
  parameters?: any;
}, { id: string }> {
  readonly type = 'Reports.Execute';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CancelReportExecutionCommand implements Command<{ executionId: string; tenantId: string }, { id: string }> {
  readonly type = 'Reports.CancelExecution';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CreateSavedReportCommand implements Command<{
  tenantId: string;
  userId: string;
  reportDefId: string;
  name: string;
  parameters?: any;
}, { id: string }> {
  readonly type = 'Reports.CreateSavedReport';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CreateReportSubscriptionCommand implements Command<{
  tenantId: string;
  userId: string;
  reportDefId: string;
  frequency: any;
  cronExpression?: string;
  parameters?: any;
  channels?: string[];
  nextRunAt: string;
}, { id: string }> {
  readonly type = 'Reports.CreateSubscription';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class DeleteReportSubscriptionCommand implements Command<{ subscriptionId: string; tenantId: string }, { id: string }> {
  readonly type = 'Reports.DeleteSubscription';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}
