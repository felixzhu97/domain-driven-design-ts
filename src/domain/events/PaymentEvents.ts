import { DomainEvent, EntityId } from "../../shared/types";
import { Money } from "../value-objects";
import { PaymentType } from "../value-objects/PaymentMethod";

/**
 * 支付相关领域事件
 */

export class PaymentCreatedEvent implements DomainEvent {
  public readonly eventType = "PaymentCreated";
  public readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: EntityId,
    public readonly orderId: EntityId,
    public readonly customerId: EntityId,
    public readonly amount: Money,
    public readonly paymentMethod: PaymentType
  ) {
    this.occurredOn = new Date();
  }
}

export class PaymentProcessingStartedEvent implements DomainEvent {
  public readonly eventType = "PaymentProcessingStarted";
  public readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: EntityId,
    public readonly orderId: EntityId,
    public readonly transactionId: string,
    public readonly processingStartedAt: Date
  ) {
    this.occurredOn = new Date();
  }
}

export class PaymentSucceededEvent implements DomainEvent {
  public readonly eventType = "PaymentSucceeded";
  public readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: EntityId,
    public readonly orderId: EntityId,
    public readonly transactionId: string,
    public readonly amount: Money,
    public readonly paidAt: Date,
    public readonly gatewayResponse?: Record<string, unknown>
  ) {
    this.occurredOn = new Date();
  }
}

export class PaymentFailedEvent implements DomainEvent {
  public readonly eventType = "PaymentFailed";
  public readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: EntityId,
    public readonly orderId: EntityId,
    public readonly transactionId: string,
    public readonly failureReason: string,
    public readonly errorCode: string,
    public readonly failedAt: Date,
    public readonly gatewayResponse?: Record<string, unknown>
  ) {
    this.occurredOn = new Date();
  }
}

export class PaymentCancelledEvent implements DomainEvent {
  public readonly eventType = "PaymentCancelled";
  public readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: EntityId,
    public readonly orderId: EntityId,
    public readonly transactionId: string,
    public readonly cancellationReason: string,
    public readonly cancelledAt: Date
  ) {
    this.occurredOn = new Date();
  }
}

export class RefundInitiatedEvent implements DomainEvent {
  public readonly eventType = "RefundInitiated";
  public readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: EntityId,
    public readonly originalPaymentId: EntityId,
    public readonly refundAmount: Money,
    public readonly refundReason: string,
    public readonly refundId: string
  ) {
    this.occurredOn = new Date();
  }
}

export class RefundCompletedEvent implements DomainEvent {
  public readonly eventType = "RefundCompleted";
  public readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: EntityId,
    public readonly refundId: string,
    public readonly refundAmount: Money,
    public readonly completedAt: Date,
    public readonly gatewayResponse?: Record<string, unknown>
  ) {
    this.occurredOn = new Date();
  }
}

export class RefundFailedEvent implements DomainEvent {
  public readonly eventType = "RefundFailed";
  public readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: EntityId,
    public readonly refundId: string,
    public readonly refundAmount: Money,
    public readonly failureReason: string,
    public readonly errorCode: string,
    public readonly failedAt: Date
  ) {
    this.occurredOn = new Date();
  }
}

export class PaymentTimeoutEvent implements DomainEvent {
  public readonly eventType = "PaymentTimeout";
  public readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: EntityId,
    public readonly orderId: EntityId,
    public readonly transactionId: string,
    public readonly timeoutAt: Date,
    public readonly timeoutReason: string
  ) {
    this.occurredOn = new Date();
  }
}
