/**
 * 订单聚合工厂
 * 处理订单聚合的创建、重建和验证逻辑，包含复杂的业务规则
 */

import { Order, OrderProps, OrderStatus } from "../entities/Order";
import { Money } from "../value-objects/Money";
import { Address } from "../value-objects/Address";
import { EntityId } from "../../shared/types";
import { OrderCreatedEvent } from "../events/OrderEvents";
import {
  AbstractAggregateFactory,
  FactoryOptions,
  FactoryResult,
  FactoryValidationError,
} from "./DomainFactory";
import { v4 as uuidv4 } from "uuid";

/**
 * 订单项数据接口
 */
export interface CreateOrderItemData {
  readonly productId: string;
  readonly productName: string;
  readonly unitPrice: {
    readonly amount: number;
    readonly currency: string;
  };
  readonly quantity: number;
  readonly discount?: {
    readonly amount: number;
    readonly currency: string;
  };
}

/**
 * 订单创建数据接口
 */
export interface CreateOrderData {
  readonly id?: string;
  readonly userId: string;
  readonly items: readonly CreateOrderItemData[];
  readonly shippingAddress?: {
    readonly street: string;
    readonly city: string;
    readonly postalCode: string;
    readonly country: string;
  };
  readonly billingAddress?: {
    readonly street: string;
    readonly city: string;
    readonly postalCode: string;
    readonly country: string;
  };
  readonly paymentMethod?: {
    readonly type:
      | "credit_card"
      | "debit_card"
      | "paypal"
      | "bank_transfer"
      | "cash_on_delivery";
    readonly details?: Record<string, unknown>;
  };
  readonly notes?: string;
  readonly priority?: "low" | "normal" | "high" | "urgent";
  readonly expectedDeliveryDate?: string;
}

/**
 * 订单快照接口
 */
export interface OrderSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly status: OrderStatus;
  readonly items: readonly {
    readonly productId: string;
    readonly productName: string;
    readonly unitPrice: { amount: number; currency: string };
    readonly quantity: number;
    readonly discount?: { amount: number; currency: string };
  }[];
  readonly totalAmount: { amount: number; currency: string };
  readonly shippingAddress?: {
    readonly street: string;
    readonly city: string;
    readonly postalCode: string;
    readonly country: string;
  };
  readonly createdAt: string;
  readonly version: number;
}

/**
 * 订单工厂
 */
export class OrderFactory extends AbstractAggregateFactory<
  Order,
  CreateOrderData
> {
  private static readonly MAX_ITEMS_PER_ORDER = 50;
  private static readonly VALID_CURRENCIES = ["CNY", "USD", "EUR", "JPY"];
  private static readonly VALID_COUNTRIES = [
    "CN",
    "US",
    "UK",
    "DE",
    "FR",
    "JP",
    "AU",
  ];

  constructor() {
    super("Order");
  }

  public createDefault(options: FactoryOptions = {}): FactoryResult<Order> {
    const defaultData: CreateOrderData = {
      userId: "default-user-id",
      items: [
        {
          productId: "default-product-id",
          productName: "Default Product",
          unitPrice: { amount: 99.99, currency: "CNY" },
          quantity: 1,
        },
      ],
      shippingAddress: {
        street: "123 Default Street",
        city: "Default City",
        postalCode: "100000",
        country: "CN",
      },
      paymentMethod: {
        type: "credit_card",
      },
      priority: "normal",
    };

    return this.createFromData(defaultData, options);
  }

  public validateCreateData(data: CreateOrderData): string[] {
    const errors: string[] = [];

    // 验证用户ID
    if (!data.userId || data.userId.trim().length === 0) {
      errors.push("User ID is required");
    }

    // 验证订单项
    if (!data.items || data.items.length === 0) {
      errors.push("Order must have at least one item");
    } else {
      if (data.items.length > OrderFactory.MAX_ITEMS_PER_ORDER) {
        errors.push(
          `Order cannot have more than ${OrderFactory.MAX_ITEMS_PER_ORDER} items`
        );
      }

      data.items.forEach((item, index) => {
        const itemErrors = this.validateOrderItem(item, index);
        errors.push(...itemErrors);
      });
    }

    // 验证地址
    if (data.shippingAddress) {
      const addressErrors = this.validateAddress(
        data.shippingAddress,
        "shipping"
      );
      errors.push(...addressErrors);
    }

    if (data.billingAddress) {
      const addressErrors = this.validateAddress(
        data.billingAddress,
        "billing"
      );
      errors.push(...addressErrors);
    }

    // 验证支付方式
    if (data.paymentMethod) {
      const paymentErrors = this.validatePaymentMethod(data.paymentMethod);
      errors.push(...paymentErrors);
    }

    // 验证备注
    if (data.notes && data.notes.length > 500) {
      errors.push("Order notes must not exceed 500 characters");
    }

    // 验证预期交付日期
    if (data.expectedDeliveryDate) {
      const deliveryDate = new Date(data.expectedDeliveryDate);
      const today = new Date();
      if (deliveryDate < today) {
        errors.push("Expected delivery date cannot be in the past");
      }
    }

    return errors;
  }

  protected doCreate(data: CreateOrderData, options: FactoryOptions): Order {
    const orderId = data.id ? data.id : uuidv4();

    // 创建默认地址
    const defaultAddress = new Address({
      country: "中国",
      province: "北京市",
      city: "北京市",
      district: "海淀区",
      street: "中关村大街1号",
      postalCode: "100000",
    });

    const orderProps: OrderProps = {
      customerId: data.userId,
      orderItems: [],
      status: OrderStatus.PENDING,
      shippingAddress: defaultAddress,
      billingAddress: defaultAddress,
      totalAmount: Money.zero(),
      shippingCost: Money.zero(),
      taxAmount: Money.zero(),
      discountAmount: Money.zero(),
      orderNumber: `ORD-${orderId}`,
      notes: data.notes || "",
      trackingNumber: undefined,
      createdAt: new Date(),
      confirmedAt: undefined,
      shippedAt: undefined,
      deliveredAt: undefined,
      cancelledAt: undefined,
    };

    const order = new Order(orderProps, orderId);

    return order;
  }

  protected applyDefaults(data: CreateOrderData): CreateOrderData {
    return {
      ...data,
      priority: data.priority ?? "normal",
      notes: data.notes?.trim() || "",
      items: data.items.map((item) => ({
        ...item,
        productName: item.productName?.trim() || "Unknown Product",
        quantity: Math.max(1, item.quantity || 1),
      })),
    };
  }

  protected collectWarnings(
    data: CreateOrderData,
    options: FactoryOptions
  ): string[] {
    const warnings: string[] = [];

    // 检查订单总价
    const totalAmount = this.calculateTotalAmount(data.items);
    if (totalAmount === 0) {
      warnings.push("Order total amount is zero");
    } else if (totalAmount > 100000) {
      warnings.push("Order total amount is very high, verify if correct");
    }

    // 检查大量商品
    const totalQuantity = data.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    if (totalQuantity > 100) {
      warnings.push("Large quantity order, verify inventory availability");
    }

    // 检查地址一致性
    if (data.shippingAddress && data.billingAddress) {
      if (
        JSON.stringify(data.shippingAddress) ===
        JSON.stringify(data.billingAddress)
      ) {
        warnings.push("Shipping and billing addresses are identical");
      }
    }

    // 检查货到付款的限制
    if (data.paymentMethod?.type === "cash_on_delivery" && totalAmount > 5000) {
      warnings.push(
        "Cash on delivery for high-value orders might have restrictions"
      );
    }

    return warnings;
  }

  public reconstituteFromEvents(
    events: readonly unknown[]
  ): FactoryResult<Order> {
    const validationErrors = this.validateEventSequence(events);
    if (validationErrors.length > 0) {
      throw new FactoryValidationError(this.entityType, validationErrors);
    }

    let order: Order | null = null;
    const warnings: string[] = [];

    for (const event of events) {
      if (this.isOrderCreatedEvent(event)) {
        if (order !== null) {
          warnings.push("Multiple order created events found");
          continue;
        }

        const defaultAddress = new Address({
          country: "中国",
          province: "北京市",
          city: "北京市",
          district: "海淀区",
          street: "中关村大街1号",
          postalCode: "100000",
        });

        const orderProps: OrderProps = {
          customerId: event.customerId,
          orderItems: [],
          status: OrderStatus.PENDING,
          shippingAddress: defaultAddress,
          billingAddress: defaultAddress,
          totalAmount: event.totalAmount,
          shippingCost: Money.zero(),
          taxAmount: Money.zero(),
          discountAmount: Money.zero(),
          orderNumber: `ORD-${event.orderId}`,
          notes: "",
          trackingNumber: undefined,
          createdAt: new Date(),
          confirmedAt: undefined,
          shippedAt: undefined,
          deliveredAt: undefined,
          cancelledAt: undefined,
        };

        order = new Order(orderProps, event.orderId);
      }
    }

    if (order === null) {
      throw new FactoryValidationError(this.entityType, [
        "No order created event found",
      ]);
    }

    return {
      entity: order,
      warnings,
      metadata: {
        createdAt: new Date().toISOString(),
        factoryType: this.entityType,
        eventCount: events.length,
        reconstructed: true,
      },
    };
  }

  public createFromSnapshot(snapshot: unknown): FactoryResult<Order> {
    const validationErrors = this.validateSnapshotData(snapshot);
    if (validationErrors.length > 0) {
      throw new FactoryValidationError(this.entityType, validationErrors);
    }

    const orderSnapshot = snapshot as OrderSnapshot;

    const structureErrors = this.validateSnapshotStructure(orderSnapshot);
    if (structureErrors.length > 0) {
      throw new FactoryValidationError(this.entityType, structureErrors);
    }

    const defaultAddress = new Address({
      country: "中国",
      province: "北京市",
      city: "北京市",
      district: "海淀区",
      street: "中关村大街1号",
      postalCode: "100000",
    });

    const orderProps: OrderProps = {
      customerId: orderSnapshot.userId,
      orderItems: [],
      status: orderSnapshot.status,
      shippingAddress: defaultAddress,
      billingAddress: defaultAddress,
      totalAmount: Money.fromYuan(orderSnapshot.totalAmount.amount),
      shippingCost: Money.zero(),
      taxAmount: Money.zero(),
      discountAmount: Money.zero(),
      orderNumber: `ORD-${orderSnapshot.id}`,
      notes: "",
      trackingNumber: undefined,
      createdAt: new Date(orderSnapshot.createdAt),
      confirmedAt: undefined,
      shippedAt: undefined,
      deliveredAt: undefined,
      cancelledAt: undefined,
    };

    const order = new Order(orderProps, orderSnapshot.id);

    return {
      entity: order,
      warnings: [],
      metadata: {
        createdAt: new Date().toISOString(),
        factoryType: this.entityType,
        snapshotVersion: orderSnapshot.version,
        restoredFromSnapshot: true,
      },
    };
  }

  /**
   * 验证订单项
   */
  private validateOrderItem(
    item: CreateOrderItemData,
    index: number
  ): string[] {
    const errors: string[] = [];

    if (!item.productId) {
      errors.push(`Item ${index + 1}: Product ID is required`);
    }

    if (!item.productName || item.productName.trim().length === 0) {
      errors.push(`Item ${index + 1}: Product name is required`);
    }

    if (
      !item.unitPrice ||
      typeof item.unitPrice.amount !== "number" ||
      item.unitPrice.amount < 0
    ) {
      errors.push(`Item ${index + 1}: Valid unit price is required`);
    }

    if (
      item.unitPrice &&
      !OrderFactory.VALID_CURRENCIES.includes(item.unitPrice.currency)
    ) {
      errors.push(`Item ${index + 1}: Invalid currency`);
    }

    if (
      typeof item.quantity !== "number" ||
      item.quantity <= 0 ||
      !Number.isInteger(item.quantity)
    ) {
      errors.push(`Item ${index + 1}: Quantity must be a positive integer`);
    }

    if (item.discount) {
      if (
        typeof item.discount.amount !== "number" ||
        item.discount.amount < 0
      ) {
        errors.push(`Item ${index + 1}: Discount amount must be non-negative`);
      }
      if (
        item.unitPrice &&
        item.discount.amount > item.unitPrice.amount * item.quantity
      ) {
        errors.push(`Item ${index + 1}: Discount cannot exceed item total`);
      }
    }

    return errors;
  }

  /**
   * 验证地址
   */
  private validateAddress(address: any, type: string): string[] {
    const errors: string[] = [];

    if (!address.street || address.street.trim().length === 0) {
      errors.push(`${type} address: Street is required`);
    }

    if (!address.city || address.city.trim().length === 0) {
      errors.push(`${type} address: City is required`);
    }

    if (!address.postalCode || address.postalCode.trim().length === 0) {
      errors.push(`${type} address: Postal code is required`);
    }

    if (
      !address.country ||
      !OrderFactory.VALID_COUNTRIES.includes(address.country)
    ) {
      errors.push(`${type} address: Invalid country code`);
    }

    return errors;
  }

  /**
   * 验证支付方式
   */
  private validatePaymentMethod(paymentMethod: any): string[] {
    const errors: string[] = [];
    const validTypes = [
      "credit_card",
      "debit_card",
      "paypal",
      "bank_transfer",
      "cash_on_delivery",
    ];

    if (!paymentMethod.type || !validTypes.includes(paymentMethod.type)) {
      errors.push("Invalid payment method type");
    }

    return errors;
  }

  /**
   * 计算订单总金额
   */
  private calculateTotalAmount(items: readonly CreateOrderItemData[]): number {
    return items.reduce((total, item) => {
      const itemTotal = item.unitPrice.amount * item.quantity;
      const discount = item.discount?.amount || 0;
      return total + itemTotal - discount;
    }, 0);
  }

  /**
   * 验证快照结构
   */
  private validateSnapshotStructure(snapshot: OrderSnapshot): string[] {
    const errors: string[] = [];

    if (!snapshot.id) errors.push("Snapshot missing id");
    if (!snapshot.userId) errors.push("Snapshot missing userId");
    if (!snapshot.status) errors.push("Snapshot missing status");
    if (!Array.isArray(snapshot.items))
      errors.push("Snapshot missing or invalid items");
    if (!snapshot.totalAmount) errors.push("Snapshot missing totalAmount");
    if (typeof snapshot.version !== "number")
      errors.push("Snapshot missing or invalid version");

    return errors;
  }

  /**
   * 类型守卫方法
   */
  private isOrderCreatedEvent(event: unknown): event is OrderCreatedEvent {
    return (event as any)?.eventType === "OrderCreated";
  }

  // 简化其他方法，移除未定义的事件类型守卫
}

/**
 * 订单工厂的单例实例
 */
export const orderFactory = new OrderFactory();
