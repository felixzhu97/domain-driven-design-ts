import { AggregateRoot } from "./AggregateRoot";
import { Money } from "../value-objects";
import { PaymentMethod, PaymentType } from "../value-objects/PaymentMethod";
import { DomainEvent, EntityId } from "../../shared/types";
import {
  PaymentCreatedEvent,
  PaymentProcessingStartedEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  PaymentCancelledEvent,
  RefundInitiatedEvent,
  RefundCompletedEvent,
  RefundFailedEvent,
  PaymentTimeoutEvent,
} from "../events/PaymentEvents";

export enum PaymentStatus {
  PENDING = "PENDING", // 待支付
  PROCESSING = "PROCESSING", // 处理中
  SUCCEEDED = "SUCCEEDED", // 支付成功
  FAILED = "FAILED", // 支付失败
  CANCELLED = "CANCELLED", // 已取消
  REFUNDED = "REFUNDED", // 已退款
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", // 部分退款
  TIMEOUT = "TIMEOUT", // 超时
}

export interface PaymentRefund {
  readonly id: string;
  readonly amount: Money;
  readonly reason: string;
  readonly status: "INITIATED" | "COMPLETED" | "FAILED";
  readonly initiatedAt: Date;
  readonly completedAt?: Date;
  readonly failureReason?: string;
  readonly gatewayResponse?: Record<string, unknown>;
}

export interface PaymentProps {
  readonly orderId: EntityId;
  readonly customerId: EntityId;
  readonly amount: Money;
  readonly paymentMethod: PaymentMethod;
  readonly status: PaymentStatus;
  readonly transactionId?: string;
  readonly gatewayOrderId?: string;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  readonly processingStartedAt?: Date;
  readonly succeededAt?: Date;
  readonly failedAt?: Date;
  readonly cancelledAt?: Date;
  readonly timeoutAt?: Date;
  readonly failureReason?: string;
  readonly errorCode?: string;
  readonly gatewayResponse?: Record<string, unknown>;
  readonly refunds: PaymentRefund[];
  readonly expiresAt?: Date;
}

export class Payment extends AggregateRoot {
  private _orderId: EntityId;
  private _customerId: EntityId;
  private _amount: Money;
  private _paymentMethod: PaymentMethod;
  private _status: PaymentStatus;
  private _transactionId?: string;
  private _gatewayOrderId?: string;
  private _description?: string;
  private _metadata: Record<string, unknown>;
  private _createdAt: Date;
  private _processingStartedAt?: Date;
  private _succeededAt?: Date;
  private _failedAt?: Date;
  private _cancelledAt?: Date;
  private _timeoutAt?: Date;
  private _failureReason?: string;
  private _errorCode?: string;
  private _gatewayResponse?: Record<string, unknown>;
  private _refunds: PaymentRefund[];
  private _expiresAt?: Date;

  constructor(props: PaymentProps, id?: EntityId) {
    super(id);
    this.validateProps(props);
    this._orderId = props.orderId;
    this._customerId = props.customerId;
    this._amount = props.amount;
    this._paymentMethod = props.paymentMethod;
    this._status = props.status;
    this._transactionId = props.transactionId;
    this._gatewayOrderId = props.gatewayOrderId;
    this._description = props.description;
    this._metadata = props.metadata || {};
    this._createdAt = props.createdAt;
    this._processingStartedAt = props.processingStartedAt;
    this._succeededAt = props.succeededAt;
    this._failedAt = props.failedAt;
    this._cancelledAt = props.cancelledAt;
    this._timeoutAt = props.timeoutAt;
    this._failureReason = props.failureReason;
    this._errorCode = props.errorCode;
    this._gatewayResponse = props.gatewayResponse;
    this._refunds = [...props.refunds];
    this._expiresAt = props.expiresAt;

    // 如果是新创建的支付，发布事件
    if (!id) {
      this.addEvent(
        new PaymentCreatedEvent(
          this.id,
          this._orderId,
          this._customerId,
          this._amount,
          this._paymentMethod.type
        )
      );
    }
  }

  // Getters
  public get orderId(): EntityId {
    return this._orderId;
  }

  public get customerId(): EntityId {
    return this._customerId;
  }

  public get amount(): Money {
    return this._amount;
  }

  public get paymentMethod(): PaymentMethod {
    return this._paymentMethod;
  }

  public get status(): PaymentStatus {
    return this._status;
  }

  public get transactionId(): string | undefined {
    return this._transactionId;
  }

  public get gatewayOrderId(): string | undefined {
    return this._gatewayOrderId;
  }

  public get description(): string | undefined {
    return this._description;
  }

  public get metadata(): Record<string, unknown> {
    return { ...this._metadata };
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get processingStartedAt(): Date | undefined {
    return this._processingStartedAt;
  }

  public get succeededAt(): Date | undefined {
    return this._succeededAt;
  }

  public get failedAt(): Date | undefined {
    return this._failedAt;
  }

  public get cancelledAt(): Date | undefined {
    return this._cancelledAt;
  }

  public get timeoutAt(): Date | undefined {
    return this._timeoutAt;
  }

  public get failureReason(): string | undefined {
    return this._failureReason;
  }

  public get errorCode(): string | undefined {
    return this._errorCode;
  }

  public get gatewayResponse(): Record<string, unknown> | undefined {
    return this._gatewayResponse ? { ...this._gatewayResponse } : undefined;
  }

  public get refunds(): PaymentRefund[] {
    return [...this._refunds];
  }

  public get expiresAt(): Date | undefined {
    return this._expiresAt;
  }

  public get totalRefundedAmount(): Money {
    return this._refunds
      .filter((refund) => refund.status === "COMPLETED")
      .reduce(
        (total, refund) => total.add(refund.amount),
        Money.zero(this._amount.currency)
      );
  }

  public get remainingRefundableAmount(): Money {
    return this._amount.subtract(this.totalRefundedAmount);
  }

  public get isExpired(): boolean {
    return this._expiresAt ? this._expiresAt <= new Date() : false;
  }

  public get canBeProcessed(): boolean {
    return (
      this._status === PaymentStatus.PENDING &&
      !this.isExpired &&
      this._paymentMethod.isValid
    );
  }

  public get canBeCancelled(): boolean {
    return [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(
      this._status
    );
  }

  public get canBeRefunded(): boolean {
    return (
      this._status === PaymentStatus.SUCCEEDED &&
      this.remainingRefundableAmount.amount > 0
    );
  }

  // 业务方法
  public startProcessing(transactionId: string, gatewayOrderId?: string): void {
    if (!this.canBeProcessed) {
      throw new Error(
        `支付状态 ${this._status} 不允许开始处理，或支付已过期或支付方式无效`
      );
    }

    if (!transactionId || transactionId.trim().length === 0) {
      throw new Error("交易ID不能为空");
    }

    this._status = PaymentStatus.PROCESSING;
    this._transactionId = transactionId.trim();
    this._gatewayOrderId = gatewayOrderId?.trim();
    this._processingStartedAt = new Date();

    this.addEvent(
      new PaymentProcessingStartedEvent(
        this.id,
        this._orderId,
        this._transactionId,
        this._processingStartedAt
      )
    );
  }

  public markAsSucceeded(gatewayResponse?: Record<string, unknown>): void {
    if (this._status !== PaymentStatus.PROCESSING) {
      throw new Error("只有处理中的支付可以标记为成功");
    }

    if (!this._transactionId) {
      throw new Error("交易ID为空，无法标记支付成功");
    }

    this._status = PaymentStatus.SUCCEEDED;
    this._succeededAt = new Date();
    this._gatewayResponse = gatewayResponse;

    this.addEvent(
      new PaymentSucceededEvent(
        this.id,
        this._orderId,
        this._transactionId,
        this._amount,
        this._succeededAt,
        gatewayResponse
      )
    );
  }

  public markAsFailed(
    failureReason: string,
    errorCode: string,
    gatewayResponse?: Record<string, unknown>
  ): void {
    if (this._status !== PaymentStatus.PROCESSING) {
      throw new Error("只有处理中的支付可以标记为失败");
    }

    if (!failureReason || failureReason.trim().length === 0) {
      throw new Error("失败原因不能为空");
    }

    if (!errorCode || errorCode.trim().length === 0) {
      throw new Error("错误代码不能为空");
    }

    if (!this._transactionId) {
      throw new Error("交易ID为空，无法标记支付失败");
    }

    this._status = PaymentStatus.FAILED;
    this._failedAt = new Date();
    this._failureReason = failureReason.trim();
    this._errorCode = errorCode.trim();
    this._gatewayResponse = gatewayResponse;

    this.addEvent(
      new PaymentFailedEvent(
        this.id,
        this._orderId,
        this._transactionId,
        this._failureReason,
        this._errorCode,
        this._failedAt,
        gatewayResponse
      )
    );
  }

  public cancel(reason: string): void {
    if (!this.canBeCancelled) {
      throw new Error(`支付状态 ${this._status} 不允许取消`);
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("取消原因不能为空");
    }

    this._status = PaymentStatus.CANCELLED;
    this._cancelledAt = new Date();

    this.addEvent(
      new PaymentCancelledEvent(
        this.id,
        this._orderId,
        this._transactionId || "",
        reason.trim(),
        this._cancelledAt
      )
    );
  }

  public markAsTimeout(reason: string): void {
    if (
      ![PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(this._status)
    ) {
      throw new Error(`支付状态 ${this._status} 不能标记为超时`);
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("超时原因不能为空");
    }

    this._status = PaymentStatus.TIMEOUT;
    this._timeoutAt = new Date();

    this.addEvent(
      new PaymentTimeoutEvent(
        this.id,
        this._orderId,
        this._transactionId || "",
        this._timeoutAt,
        reason.trim()
      )
    );
  }

  public initiateRefund(
    refundAmount: Money,
    reason: string,
    refundId: string
  ): void {
    if (!this.canBeRefunded) {
      throw new Error("当前支付状态不允许退款或没有可退款金额");
    }

    if (refundAmount.amount <= 0) {
      throw new Error("退款金额必须大于0");
    }

    if (refundAmount.amount > this.remainingRefundableAmount.amount) {
      throw new Error("退款金额不能超过可退款余额");
    }

    if (!refundAmount.currency.equals(this._amount.currency)) {
      throw new Error("退款货币类型必须与原支付货币类型一致");
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("退款原因不能为空");
    }

    if (!refundId || refundId.trim().length === 0) {
      throw new Error("退款ID不能为空");
    }

    // 检查退款ID是否已存在
    if (this._refunds.some((refund) => refund.id === refundId)) {
      throw new Error("退款ID已存在");
    }

    const refund: PaymentRefund = {
      id: refundId.trim(),
      amount: refundAmount,
      reason: reason.trim(),
      status: "INITIATED",
      initiatedAt: new Date(),
    };

    this._refunds.push(refund);

    this.addEvent(
      new RefundInitiatedEvent(
        this.id,
        this.id,
        refundAmount,
        reason.trim(),
        refundId.trim()
      )
    );
  }

  public completeRefund(
    refundId: string,
    gatewayResponse?: Record<string, unknown>
  ): void {
    const refund = this._refunds.find((r) => r.id === refundId);
    if (!refund) {
      throw new Error("退款记录不存在");
    }

    if (refund.status !== "INITIATED") {
      throw new Error("只有已发起的退款可以标记为完成");
    }

    // 更新退款状态
    const refundIndex = this._refunds.indexOf(refund);
    this._refunds[refundIndex] = {
      ...refund,
      status: "COMPLETED",
      completedAt: new Date(),
      gatewayResponse,
    };

    // 更新支付状态
    const totalRefunded = this.totalRefundedAmount;
    if (totalRefunded.equals(this._amount)) {
      this._status = PaymentStatus.REFUNDED;
    } else {
      this._status = PaymentStatus.PARTIALLY_REFUNDED;
    }

    this.addEvent(
      new RefundCompletedEvent(
        this.id,
        refundId,
        refund.amount,
        new Date(),
        gatewayResponse
      )
    );
  }

  public failRefund(
    refundId: string,
    failureReason: string,
    errorCode: string
  ): void {
    const refund = this._refunds.find((r) => r.id === refundId);
    if (!refund) {
      throw new Error("退款记录不存在");
    }

    if (refund.status !== "INITIATED") {
      throw new Error("只有已发起的退款可以标记为失败");
    }

    if (!failureReason || failureReason.trim().length === 0) {
      throw new Error("退款失败原因不能为空");
    }

    // 更新退款状态
    const refundIndex = this._refunds.indexOf(refund);
    this._refunds[refundIndex] = {
      ...refund,
      status: "FAILED",
      failureReason: failureReason.trim(),
    };

    this.addEvent(
      new RefundFailedEvent(
        this.id,
        refundId,
        refund.amount,
        failureReason.trim(),
        errorCode,
        new Date()
      )
    );
  }

  public updateMetadata(metadata: Record<string, unknown>): void {
    this._metadata = { ...this._metadata, ...metadata };
  }

  private validateProps(props: PaymentProps): void {
    if (!props.orderId) {
      throw new Error("订单ID不能为空");
    }

    if (!props.customerId) {
      throw new Error("客户ID不能为空");
    }

    if (props.amount.amount <= 0) {
      throw new Error("支付金额必须大于0");
    }

    if (!props.paymentMethod) {
      throw new Error("支付方式不能为空");
    }

    if (!props.paymentMethod.isValid) {
      throw new Error("支付方式无效");
    }

    if (props.expiresAt && props.expiresAt <= props.createdAt) {
      throw new Error("过期时间必须晚于创建时间");
    }
  }

  protected applyEvent(event: DomainEvent, isNew: boolean): void {
    switch (event.eventType) {
      case "PaymentCreated":
        // 创建事件已在构造函数中处理
        break;
      case "PaymentProcessingStarted":
        // 处理开始事件已在startProcessing方法中处理
        break;
      case "PaymentSucceeded":
        // 支付成功事件已在markAsSucceeded方法中处理
        break;
      case "PaymentFailed":
        // 支付失败事件已在markAsFailed方法中处理
        break;
      case "PaymentCancelled":
        // 支付取消事件已在cancel方法中处理
        break;
      case "PaymentTimeout":
        // 支付超时事件已在markAsTimeout方法中处理
        break;
      case "RefundInitiated":
        // 退款发起事件已在initiateRefund方法中处理
        break;
      case "RefundCompleted":
        // 退款完成事件已在completeRefund方法中处理
        break;
      case "RefundFailed":
        // 退款失败事件已在failRefund方法中处理
        break;
      default:
        // 忽略未知事件
        break;
    }
  }

  // 静态工厂方法
  public static create(
    orderId: EntityId,
    customerId: EntityId,
    amount: Money,
    paymentMethod: PaymentMethod,
    description?: string,
    expiresAt?: Date,
    metadata?: Record<string, unknown>
  ): Payment {
    if (!orderId) {
      throw new Error("订单ID不能为空");
    }

    if (!customerId) {
      throw new Error("客户ID不能为空");
    }

    if (amount.amount <= 0) {
      throw new Error("支付金额必须大于0");
    }

    if (!paymentMethod.isValid) {
      throw new Error("支付方式无效");
    }

    const now = new Date();
    if (expiresAt && expiresAt <= now) {
      throw new Error("过期时间必须晚于当前时间");
    }

    return new Payment({
      orderId,
      customerId,
      amount,
      paymentMethod,
      status: PaymentStatus.PENDING,
      description: description?.trim(),
      metadata: metadata || {},
      createdAt: now,
      refunds: [],
      expiresAt,
    });
  }

  public static fromSnapshot(props: PaymentProps, id: EntityId): Payment {
    return new Payment(props, id);
  }
}
