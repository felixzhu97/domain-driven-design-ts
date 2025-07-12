import { EntityId, DomainEvent } from "../../shared/types";
import { EventSnapshot } from "../../shared/types/EventStore";
import { Order, OrderProps, OrderStatus } from "../../domain/entities/Order";
import { Money, Address } from "../../domain/value-objects";
import { EventSourcingRepository } from "../events/EventSourcingRepository";

/**
 * 订单事件溯源仓储
 */
export class OrderEventSourcingRepository extends EventSourcingRepository<Order> {
  constructor(eventStore: any, snapshotStore?: any) {
    super(eventStore, snapshotStore, "order");
  }

  /**
   * 创建空的订单聚合
   */
  protected createEmptyAggregate(id: EntityId): Order {
    // 这里需要创建一个最小的订单对象用于事件重放
    // 实际应用中可能需要更复杂的逻辑
    return Order.fromSnapshot(
      {
        customerId: "",
        orderItems: [],
        status: OrderStatus.PENDING,
        shippingAddress: new Address({
          street: "临时地址",
          city: "临时城市",
          province: "临时省份",
          district: "临时区域",
          country: "中国",
          postalCode: "000000",
        }),
        billingAddress: new Address({
          street: "临时地址",
          city: "临时城市",
          province: "临时省份",
          district: "临时区域",
          country: "中国",
          postalCode: "000000",
        }),
        totalAmount: Money.zero(),
        shippingCost: Money.zero(),
        taxAmount: Money.zero(),
        discountAmount: Money.zero(),
        orderNumber: "",
        notes: "",
        trackingNumber: undefined,
        createdAt: new Date(),
        confirmedAt: undefined,
        shippedAt: undefined,
        deliveredAt: undefined,
        cancelledAt: undefined,
      },
      id
    );
  }

  /**
   * 从快照创建订单聚合
   */
  protected createAggregateFromSnapshot(snapshot: EventSnapshot): Order {
    const orderProps = this.deserializeOrderProps(snapshot.snapshotData);
    return Order.fromSnapshot(orderProps, snapshot.streamId);
  }

  /**
   * 序列化订单用于快照
   */
  protected serializeAggregateForSnapshot(order: Order): any {
    return {
      customerId: order.customerId,
      orderItems: order.orderItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: {
          amount: item.unitPrice.amount,
          currency: item.unitPrice.currency,
        },
        totalPrice: {
          amount: item.totalPrice.amount,
          currency: item.totalPrice.currency,
        },
      })),
      status: order.status,
      shippingAddress: {
        street: order.shippingAddress.street,
        city: order.shippingAddress.city,
        province: order.shippingAddress.province,
        district: order.shippingAddress.district,
        country: order.shippingAddress.country,
        postalCode: order.shippingAddress.postalCode,
        detail: order.shippingAddress.detail,
      },
      billingAddress: {
        street: order.billingAddress.street,
        city: order.billingAddress.city,
        province: order.billingAddress.province,
        district: order.billingAddress.district,
        country: order.billingAddress.country,
        postalCode: order.billingAddress.postalCode,
        detail: order.billingAddress.detail,
      },
      totalAmount: {
        amount: order.totalAmount.amount,
        currency: order.totalAmount.currency,
      },
      shippingCost: {
        amount: order.shippingCost.amount,
        currency: order.shippingCost.currency,
      },
      taxAmount: {
        amount: order.taxAmount.amount,
        currency: order.taxAmount.currency,
      },
      discountAmount: {
        amount: order.discountAmount.amount,
        currency: order.discountAmount.currency,
      },
      orderNumber: order.orderNumber,
      notes: order.notes,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
    };
  }

  /**
   * 反序列化事件
   */
  protected deserializeEvent(eventData: any): DomainEvent {
    // 这里应该根据事件类型进行适当的反序列化
    return eventData as DomainEvent;
  }

  /**
   * 反序列化订单属性
   */
  private deserializeOrderProps(data: any): OrderProps {
    return {
      customerId: data.customerId,
      orderItems: data.orderItems.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: new Money(item.unitPrice.amount, item.unitPrice.currency),
        totalPrice: new Money(item.totalPrice.amount, item.totalPrice.currency),
      })),
      status: data.status,
      shippingAddress: new Address({
        street: data.shippingAddress.street,
        city: data.shippingAddress.city,
        province: data.shippingAddress.province,
        district: data.shippingAddress.district,
        country: data.shippingAddress.country,
        postalCode: data.shippingAddress.postalCode,
        detail: data.shippingAddress.detail,
      }),
      billingAddress: new Address({
        street: data.billingAddress.street,
        city: data.billingAddress.city,
        province: data.billingAddress.province,
        district: data.billingAddress.district,
        country: data.billingAddress.country,
        postalCode: data.billingAddress.postalCode,
        detail: data.billingAddress.detail,
      }),
      totalAmount: new Money(
        data.totalAmount.amount,
        data.totalAmount.currency
      ),
      shippingCost: new Money(
        data.shippingCost.amount,
        data.shippingCost.currency
      ),
      taxAmount: new Money(data.taxAmount.amount, data.taxAmount.currency),
      discountAmount: new Money(
        data.discountAmount.amount,
        data.discountAmount.currency
      ),
      orderNumber: data.orderNumber,
      notes: data.notes,
      trackingNumber: data.trackingNumber,
      createdAt: new Date(data.createdAt),
      confirmedAt: data.confirmedAt ? new Date(data.confirmedAt) : undefined,
      shippedAt: data.shippedAt ? new Date(data.shippedAt) : undefined,
      deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : undefined,
      cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : undefined,
    };
  }
}
