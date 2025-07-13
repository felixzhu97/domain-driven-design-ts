import { DomainEvent } from "../../shared/types";
import { Money } from "../value-objects/Money";
import { PaymentMethod } from "../value-objects/PaymentMethod";
import { PaymentStatus } from "../entities/Payment";
import { v4 as uuidv4 } from "uuid";

// 支付创建事件
export class PaymentCreatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly eventType: string;
  readonly occurredOn: Date;

  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly amount: Money,
    public readonly paymentMethod: string
  ) {
    this.eventId = uuidv4();
    this.eventVersion = 1;
    this.eventType = "PaymentCreated";
    this.occurredOn = new Date();
  }
}

// 支付开始处理事件
export class PaymentProcessingStartedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly eventType: string;
  readonly occurredOn: Date;

  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly gatewayOrderId: string,
    public readonly processingStartedAt: Date
  ) {
    this.eventId = uuidv4();
    this.eventVersion = 1;
    this.eventType = "PaymentProcessingStarted";
    this.occurredOn = new Date();
  }
}

// 支付成功事件
export class PaymentSucceededEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly eventType: string;
  readonly occurredOn: Date;

  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly transactionId: string,
    public readonly amount: Money,
    public readonly succeededAt: Date,
    public readonly gatewayResponse: Record<string, unknown>
  ) {
    this.eventId = uuidv4();
    this.eventVersion = 1;
    this.eventType = "PaymentSucceeded";
    this.occurredOn = new Date();
  }
}

// 支付失败事件
export class PaymentFailedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly eventType: string;
  readonly occurredOn: Date;

  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly failureReason: string,
    public readonly errorCode: string,
    public readonly failedAt: Date,
    public readonly gatewayResponse: Record<string, unknown>
  ) {
    this.eventId = uuidv4();
    this.eventVersion = 1;
    this.eventType = "PaymentFailed";
    this.occurredOn = new Date();
  }
}

// 支付取消事件
export class PaymentCancelledEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly eventType: string;
  readonly occurredOn: Date;

  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly reason: string,
    public readonly cancelledAt: Date
  ) {
    this.eventId = uuidv4();
    this.eventVersion = 1;
    this.eventType = "PaymentCancelled";
    this.occurredOn = new Date();
  }
}

// 退款发起事件
export class RefundInitiatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly eventType: string;
  readonly occurredOn: Date;

  constructor(
    public readonly paymentId: string,
    public readonly refundId: string,
    public readonly amount: Money,
    public readonly reason: string,
    public readonly initiatedAt: Date
  ) {
    this.eventId = uuidv4();
    this.eventVersion = 1;
    this.eventType = "RefundInitiated";
    this.occurredOn = new Date();
  }
}

// 退款完成事件
export class RefundCompletedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly eventType: string;
  readonly occurredOn: Date;

  constructor(
    public readonly paymentId: string,
    public readonly refundId: string,
    public readonly amount: Money,
    public readonly completedAt: Date,
    public readonly gatewayResponse: Record<string, unknown>
  ) {
    this.eventId = uuidv4();
    this.eventVersion = 1;
    this.eventType = "RefundCompleted";
    this.occurredOn = new Date();
  }
}

// 退款失败事件
export class RefundFailedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly eventType: string;
  readonly occurredOn: Date;

  constructor(
    public readonly paymentId: string,
    public readonly refundId: string,
    public readonly amount: Money,
    public readonly reason: string,
    public readonly errorCode: string,
    public readonly failedAt: Date
  ) {
    this.eventId = uuidv4();
    this.eventVersion = 1;
    this.eventType = "RefundFailed";
    this.occurredOn = new Date();
  }
}

// 支付超时事件
export class PaymentTimeoutEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly eventType: string;
  readonly occurredOn: Date;

  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly timeoutAt: Date,
    public readonly reason: string
  ) {
    this.eventId = uuidv4();
    this.eventVersion = 1;
    this.eventType = "PaymentTimeout";
    this.occurredOn = new Date();
  }
}
