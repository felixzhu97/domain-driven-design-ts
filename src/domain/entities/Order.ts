import { AggregateRoot } from "./AggregateRoot";
import { OrderItem } from "./OrderItem";
import { Money, Address } from "../value-objects";
import { DomainEvent, EntityId } from "../../shared/types";
import {
  OrderCreatedEvent,
  OrderItemAddedEvent,
  OrderConfirmedEvent,
  OrderShippedEvent,
  OrderDeliveredEvent,
  OrderCancelledEvent,
} from "../events/OrderEvents";

export enum OrderStatus {
  PENDING = "PENDING", // 待确认
  CONFIRMED = "CONFIRMED", // 已确认
  PAID = "PAID", // 已支付
  SHIPPED = "SHIPPED", // 已发货
  DELIVERED = "DELIVERED", // 已送达
  CANCELLED = "CANCELLED", // 已取消
  REFUNDED = "REFUNDED", // 已退款
}

export interface OrderProps {
  customerId: EntityId;
  orderItems: OrderItem[];
  status: OrderStatus;
  shippingAddress: Address;
  billingAddress: Address;
  totalAmount: Money;
  shippingCost: Money;
  taxAmount: Money;
  discountAmount: Money;
  orderNumber: string;
  notes: string;
  trackingNumber: string | undefined;
  createdAt: Date;
  confirmedAt: Date | undefined;
  shippedAt: Date | undefined;
  deliveredAt: Date | undefined;
  cancelledAt: Date | undefined;
}

export class Order extends AggregateRoot {
  private _customerId: EntityId;
  private _orderItems: OrderItem[];
  private _status: OrderStatus;
  private _shippingAddress: Address;
  private _billingAddress: Address;
  private _totalAmount: Money;
  private _shippingCost: Money;
  private _taxAmount: Money;
  private _discountAmount: Money;
  private _orderNumber: string;
  private _notes: string;
  private _trackingNumber: string | undefined;
  private _createdAt: Date;
  private _confirmedAt: Date | undefined;
  private _shippedAt: Date | undefined;
  private _deliveredAt: Date | undefined;
  private _cancelledAt: Date | undefined;

  constructor(props: OrderProps, id?: EntityId) {
    super(id);
    this.validateProps(props);
    this._customerId = props.customerId;
    this._orderItems = [...props.orderItems];
    this._status = props.status;
    this._shippingAddress = props.shippingAddress;
    this._billingAddress = props.billingAddress;
    this._totalAmount = props.totalAmount;
    this._shippingCost = props.shippingCost;
    this._taxAmount = props.taxAmount;
    this._discountAmount = props.discountAmount;
    this._orderNumber = props.orderNumber;
    this._notes = props.notes;
    this._trackingNumber = props.trackingNumber;
    this._createdAt = props.createdAt;
    this._confirmedAt = props.confirmedAt;
    this._shippedAt = props.shippedAt;
    this._deliveredAt = props.deliveredAt;
    this._cancelledAt = props.cancelledAt;

    // 如果是新创建的订单，发布事件
    if (!id) {
      this.addEvent(
        new OrderCreatedEvent(this.id, this._customerId, this._totalAmount)
      );
    }
  }

  // Getters
  public get customerId(): EntityId {
    return this._customerId;
  }

  public get orderItems(): OrderItem[] {
    return [...this._orderItems];
  }

  public get status(): OrderStatus {
    return this._status;
  }

  public get shippingAddress(): Address {
    return this._shippingAddress;
  }

  public get billingAddress(): Address {
    return this._billingAddress;
  }

  public get totalAmount(): Money {
    return this._totalAmount;
  }

  public get shippingCost(): Money {
    return this._shippingCost;
  }

  public get taxAmount(): Money {
    return this._taxAmount;
  }

  public get discountAmount(): Money {
    return this._discountAmount;
  }

  public get orderNumber(): string {
    return this._orderNumber;
  }

  public get notes(): string {
    return this._notes;
  }

  public get trackingNumber(): string | undefined {
    return this._trackingNumber;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get confirmedAt(): Date | undefined {
    return this._confirmedAt;
  }

  public get shippedAt(): Date | undefined {
    return this._shippedAt;
  }

  public get deliveredAt(): Date | undefined {
    return this._deliveredAt;
  }

  public get cancelledAt(): Date | undefined {
    return this._cancelledAt;
  }

  public get subtotalAmount(): Money {
    return this._orderItems.reduce(
      (total, item) => total.add(item.totalPrice),
      Money.zero(this._totalAmount.currency)
    );
  }

  public get itemCount(): number {
    return this._orderItems.reduce((count, item) => count + item.quantity, 0);
  }

  public get canBeModified(): boolean {
    return this._status === OrderStatus.PENDING;
  }

  public get canBeCancelled(): boolean {
    return [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PAID,
    ].includes(this._status);
  }

  public get canBeShipped(): boolean {
    return this._status === OrderStatus.PAID;
  }

  // 业务方法
  public addItem(orderItem: OrderItem): void {
    if (!this.canBeModified) {
      throw new Error("订单状态不允许修改订单项");
    }

    // 检查是否已存在相同商品
    const existingItem = this._orderItems.find(
      (item) => item.productId === orderItem.productId
    );
    if (existingItem) {
      // 合并数量
      const newQuantity = existingItem.quantity + orderItem.quantity;
      existingItem.changeQuantity(newQuantity);
    } else {
      this._orderItems.push(orderItem);
    }

    this.recalculateTotal();
    this.addEvent(
      new OrderItemAddedEvent(
        this.id,
        orderItem.productId,
        orderItem.quantity,
        orderItem.unitPrice
      )
    );
  }

  public removeItem(productId: EntityId): void {
    if (!this.canBeModified) {
      throw new Error("订单状态不允许修改订单项");
    }

    const index = this._orderItems.findIndex(
      (item) => item.productId === productId
    );
    if (index === -1) {
      throw new Error("订单项不存在");
    }

    this._orderItems.splice(index, 1);
    this.recalculateTotal();
  }

  public updateItemQuantity(productId: EntityId, newQuantity: number): void {
    if (!this.canBeModified) {
      throw new Error("订单状态不允许修改订单项");
    }

    const item = this._orderItems.find((item) => item.productId === productId);
    if (!item) {
      throw new Error("订单项不存在");
    }

    item.changeQuantity(newQuantity);
    this.recalculateTotal();
  }

  public changeShippingAddress(newAddress: Address): void {
    if (!this.canBeModified) {
      throw new Error("订单状态不允许修改收货地址");
    }

    this._shippingAddress = newAddress;
  }

  public changeBillingAddress(newAddress: Address): void {
    if (!this.canBeModified) {
      throw new Error("订单状态不允许修改账单地址");
    }

    this._billingAddress = newAddress;
  }

  public addNotes(notes: string): void {
    if (notes.length > 1000) {
      throw new Error("订单备注长度不能超过1000个字符");
    }

    this._notes = notes;
  }

  public confirm(): void {
    if (this._status !== OrderStatus.PENDING) {
      throw new Error("只有待确认的订单可以确认");
    }

    if (this._orderItems.length === 0) {
      throw new Error("订单必须包含至少一个商品");
    }

    this._status = OrderStatus.CONFIRMED;
    this._confirmedAt = new Date();

    this.addEvent(new OrderConfirmedEvent(this.id, this._confirmedAt));
  }

  public markAsPaid(): void {
    if (this._status !== OrderStatus.CONFIRMED) {
      throw new Error("只有已确认的订单可以标记为已支付");
    }

    this._status = OrderStatus.PAID;
  }

  public ship(trackingNumber: string): void {
    if (!this.canBeShipped) {
      throw new Error("订单状态不允许发货");
    }

    if (!trackingNumber || trackingNumber.trim().length === 0) {
      throw new Error("物流跟踪号不能为空");
    }

    this._status = OrderStatus.SHIPPED;
    this._trackingNumber = trackingNumber.trim();
    this._shippedAt = new Date();

    this.addEvent(
      new OrderShippedEvent(this.id, this._trackingNumber, this._shippedAt)
    );
  }

  public markAsDelivered(): void {
    if (this._status !== OrderStatus.SHIPPED) {
      throw new Error("只有已发货的订单可以标记为已送达");
    }

    this._status = OrderStatus.DELIVERED;
    this._deliveredAt = new Date();

    this.addEvent(new OrderDeliveredEvent(this.id, this._deliveredAt));
  }

  public cancel(reason: string): void {
    if (!this.canBeCancelled) {
      throw new Error("当前订单状态不允许取消");
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("取消原因不能为空");
    }

    this._status = OrderStatus.CANCELLED;
    this._cancelledAt = new Date();

    this.addEvent(new OrderCancelledEvent(this.id, reason, this._cancelledAt));
  }

  public markAsRefunded(): void {
    if (
      this._status !== OrderStatus.CANCELLED &&
      this._status !== OrderStatus.DELIVERED
    ) {
      throw new Error("只有已取消或已送达的订单可以标记为已退款");
    }

    this._status = OrderStatus.REFUNDED;
  }

  private recalculateTotal(): void {
    const subtotal = this.subtotalAmount;
    this._totalAmount = subtotal
      .add(this._shippingCost)
      .add(this._taxAmount)
      .subtract(this._discountAmount);
  }

  private validateProps(props: OrderProps): void {
    if (!props.customerId) {
      throw new Error("客户ID不能为空");
    }

    if (!props.orderNumber || props.orderNumber.trim().length === 0) {
      throw new Error("订单号不能为空");
    }

    if (props.shippingCost.amount < 0) {
      throw new Error("运费不能为负数");
    }

    if (props.taxAmount.amount < 0) {
      throw new Error("税费不能为负数");
    }

    if (props.discountAmount.amount < 0) {
      throw new Error("折扣金额不能为负数");
    }
  }

  protected applyEvent(event: DomainEvent, isNew: boolean): void {
    switch (event.eventType) {
      case "OrderCreated":
        // 创建事件已在构造函数中处理
        break;
      case "OrderItemAdded":
        // 添加订单项事件已在addItem方法中处理
        break;
      case "OrderConfirmed":
        // 确认事件已在confirm方法中处理
        break;
      case "OrderShipped":
        // 发货事件已在ship方法中处理
        break;
      case "OrderDelivered":
        // 送达事件已在markAsDelivered方法中处理
        break;
      case "OrderCancelled":
        // 取消事件已在cancel方法中处理
        break;
      default:
        // 忽略未知事件
        break;
    }
  }

  // 静态工厂方法
  public static create(
    customerId: EntityId,
    shippingAddress: Address,
    billingAddress: Address,
    orderNumber: string,
    shippingCost: Money = Money.zero(),
    taxAmount: Money = Money.zero(),
    discountAmount: Money = Money.zero()
  ): Order {
    if (!customerId) {
      throw new Error("客户ID不能为空");
    }

    if (!orderNumber || orderNumber.trim().length === 0) {
      throw new Error("订单号不能为空");
    }

    return new Order({
      customerId,
      orderItems: [],
      status: OrderStatus.PENDING,
      shippingAddress,
      billingAddress,
      totalAmount: shippingCost.add(taxAmount).subtract(discountAmount),
      shippingCost,
      taxAmount,
      discountAmount,
      orderNumber: orderNumber.trim(),
      notes: "",
      trackingNumber: undefined,
      createdAt: new Date(),
      confirmedAt: undefined,
      shippedAt: undefined,
      deliveredAt: undefined,
      cancelledAt: undefined,
    });
  }

  public static fromSnapshot(props: OrderProps, id: EntityId): Order {
    return new Order(props, id);
  }
}
