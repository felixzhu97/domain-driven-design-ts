import { Order, OrderItem, Product, User } from "../entities";
import { Money, Address } from "../value-objects";
import { EntityId } from "../../shared/types";
import { SpecificationService } from "./SpecificationService";
import {
  OrderDiscountEligibilitySpecification,
  FreeShippingEligibilitySpecification,
  OrderCancellationSpecification,
  ProductPurchasabilitySpecification,
} from "../specifications";

export interface OrderCreationData {
  customerId: EntityId;
  items: Array<{
    productId: EntityId;
    quantity: number;
  }>;
  shippingAddress: Address;
  billingAddress?: Address;
  discountCode?: string;
}

export class OrderService {
  private static specificationService = new SpecificationService();

  /**
   * 创建新订单
   */
  public static createOrder(
    data: OrderCreationData,
    products: Product[],
    customer: User,
    calculateShipping: (address: Address, items: OrderItem[]) => Money,
    calculateTax: (subtotal: Money, address: Address) => Money,
    calculateDiscount: (subtotal: Money, discountCode?: string) => Money
  ): Order {
    // 验证客户状态
    if (!customer.isActive) {
      throw new Error("客户账户已停用，无法创建订单");
    }

    // 创建订单项并验证商品可购买性
    const orderItems: OrderItem[] = [];
    for (const itemData of data.items) {
      const product = products.find((p) => p.id === itemData.productId);
      if (!product) {
        throw new Error(`商品不存在: ${itemData.productId}`);
      }

      // 使用规约验证商品可购买性
      if (
        !this.specificationService.validateProductPurchasability(
          product,
          itemData.quantity
        )
      ) {
        throw new Error(`商品 ${product.name} 不满足购买条件`);
      }

      // 检查库存警告
      const stockCheck =
        this.specificationService.checkLowStockWarning(product);
      if (stockCheck.isCritical) {
        throw new Error(`商品 ${product.name} 库存严重不足，无法完成订单`);
      }

      const orderItem = OrderItem.create(
        product.id,
        product.name,
        itemData.quantity,
        product.price
      );
      orderItems.push(orderItem);
    }

    if (orderItems.length === 0) {
      throw new Error("订单必须包含至少一个商品");
    }

    // 计算费用
    const subtotal = orderItems.reduce(
      (total, item) => total.add(item.totalPrice),
      Money.zero()
    );

    const billingAddress = data.billingAddress || data.shippingAddress;
    const shippingCost = calculateShipping(data.shippingAddress, orderItems);
    const taxAmount = calculateTax(subtotal, billingAddress);
    const discountAmount = calculateDiscount(subtotal, data.discountCode);

    // 生成订单号
    const orderNumber = this.generateOrderNumber();

    // 创建订单
    const order = Order.create(
      data.customerId,
      data.shippingAddress,
      billingAddress,
      orderNumber,
      shippingCost,
      taxAmount,
      discountAmount
    );

    // 添加订单项
    orderItems.forEach((item) => order.addItem(item));

    // 应用免费配送规约
    if (
      this.specificationService.validateFreeShippingEligibility(
        order,
        new Money(500, shippingCost.currency),
        ["北京", "上海", "广州", "深圳"]
      )
    ) {
      // 这里可以设置免费配送标识或调整配送费用
      console.log("订单符合免费配送条件");
    }

    return order;
  }

  /**
   * 验证订单可以确认
   */
  public static canConfirmOrder(order: Order, products: Product[]): boolean {
    if (order.status !== "PENDING") {
      return false;
    }

    // 使用规约验证所有商品的可购买性
    for (const orderItem of order.orderItems) {
      const product = products.find((p) => p.id === orderItem.productId);
      if (!product) {
        return false;
      }

      if (
        !this.specificationService.validateProductPurchasability(
          product,
          orderItem.quantity
        )
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * 确认订单并减库存
   */
  public static confirmOrder(order: Order, products: Product[]): void {
    if (!this.canConfirmOrder(order, products)) {
      throw new Error("订单无法确认，请检查商品状态和库存");
    }

    // 使用复合验证
    const validationResult = this.specificationService.validateCompleteOrder(
      order,
      // 这里需要传入客户信息，在实际应用中应该从仓储中获取
      {} as User,
      products
    );

    if (!validationResult.canProceed) {
      throw new Error(`订单确认失败: ${validationResult.errors.join(", ")}`);
    }

    // 减少商品库存
    for (const orderItem of order.orderItems) {
      const product = products.find((p) => p.id === orderItem.productId);
      if (product) {
        product.decreaseStock(
          orderItem.quantity,
          `订单确认: ${order.orderNumber}`
        );
      }
    }

    // 确认订单
    order.confirm();
  }

  /**
   * 取消订单并恢复库存
   */
  public static cancelOrder(
    order: Order,
    products: Product[],
    reason: string
  ): void {
    // 使用规约验证订单是否可以取消
    if (!this.specificationService.validateOrderCancellation(order)) {
      throw new Error("订单当前状态不允许取消或已超过取消时限");
    }

    // 如果订单已确认或已支付，需要恢复库存
    if (["CONFIRMED", "PAID"].includes(order.status)) {
      for (const orderItem of order.orderItems) {
        const product = products.find((p) => p.id === orderItem.productId);
        if (product) {
          product.increaseStock(
            orderItem.quantity,
            `订单取消: ${order.orderNumber}`
          );
        }
      }
    }

    // 取消订单
    order.cancel(reason);
  }

  /**
   * 计算订单折扣
   */
  public static calculateOrderDiscount(
    order: Order,
    customer: User,
    customerHistory: { totalOrders: number; totalAmount: Money }
  ): Money {
    // 使用VIP折扣规约
    if (
      this.specificationService.validateVipDiscountEligibility(
        order,
        customer,
        customerHistory,
        10, // 最少10个订单
        new Money(10000, order.totalAmount.currency) // 最少消费10000
      )
    ) {
      // VIP客户享受10%折扣
      return order.subtotalAmount.multiply(0.1);
    }

    // 使用普通折扣规约
    if (
      this.specificationService.validateOrderDiscountEligibility(
        order,
        customer,
        new Money(500, order.totalAmount.currency), // 最少500元
        3 // 最少3个订单
      )
    ) {
      // 普通客户享受5%折扣
      return order.subtotalAmount.multiply(0.05);
    }

    return Money.zero(order.totalAmount.currency);
  }

  /**
   * 检查订单是否可以享受急速配送
   */
  public static canUseExpressDelivery(order: Order): boolean {
    const eligibleCities = ["北京", "上海", "广州", "深圳", "杭州"];
    const maxWeight = 10000; // 10kg
    const additionalFee = new Money(50, order.totalAmount.currency);

    return this.specificationService.validateExpressDeliveryEligibility(
      order,
      eligibleCities,
      maxWeight,
      additionalFee
    );
  }

  /**
   * 计算订单总重量
   */
  public static calculateTotalWeight(
    order: Order,
    products: Product[]
  ): number {
    let totalWeight = 0;

    for (const orderItem of order.orderItems) {
      const product = products.find((p) => p.id === orderItem.productId);
      if (product && product.weight) {
        totalWeight += product.weight * orderItem.quantity;
      }
    }

    return totalWeight;
  }

  /**
   * 生成订单号
   */
  private static generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const timestamp = now.getTime().toString().slice(-6);

    return `ORD${year}${month}${day}${timestamp}`;
  }

  /**
   * 验证订单可以发货
   */
  public static canShipOrder(order: Order): boolean {
    return order.canBeShipped && order.orderItems.length > 0;
  }

  /**
   * 计算订单预计送达时间
   */
  public static calculateEstimatedDeliveryDate(
    order: Order,
    shippingMethod: "standard" | "express" | "overnight"
  ): Date {
    const now = new Date();
    let daysToAdd = 0;

    switch (shippingMethod) {
      case "standard":
        daysToAdd = 3;
        break;
      case "express":
        daysToAdd = this.canUseExpressDelivery(order) ? 1 : 2;
        break;
      case "overnight":
        daysToAdd = 1;
        break;
    }

    const deliveryDate = new Date(now);
    deliveryDate.setDate(now.getDate() + daysToAdd);
    return deliveryDate;
  }

  /**
   * 获取订单推荐的配送方式
   */
  public static getRecommendedShippingMethod(
    order: Order,
    customer: User
  ): "standard" | "express" | "overnight" {
    // 根据订单价值和客户等级推荐配送方式
    const orderValue = order.totalAmount;
    const highValueThreshold = new Money(1000, orderValue.currency);

    if (orderValue.isGreaterThan(highValueThreshold)) {
      return "express";
    }

    if (this.canUseExpressDelivery(order)) {
      return "express";
    }

    return "standard";
  }
}
