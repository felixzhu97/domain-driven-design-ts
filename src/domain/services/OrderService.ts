import { Order, OrderItem, Product, User } from "../entities";
import { Money, Address } from "../value-objects";
import { EntityId } from "../../shared/types";

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

    // 创建订单项
    const orderItems: OrderItem[] = [];
    for (const itemData of data.items) {
      const product = products.find((p) => p.id === itemData.productId);
      if (!product) {
        throw new Error(`商品不存在: ${itemData.productId}`);
      }

      if (!product.canBePurchased(itemData.quantity)) {
        throw new Error(`商品 ${product.name} 库存不足或状态不可购买`);
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

    return order;
  }

  /**
   * 验证订单可以确认
   */
  public static canConfirmOrder(order: Order, products: Product[]): boolean {
    if (order.status !== "PENDING") {
      return false;
    }

    // 检查所有商品是否仍然可购买
    for (const orderItem of order.orderItems) {
      const product = products.find((p) => p.id === orderItem.productId);
      if (!product || !product.canBePurchased(orderItem.quantity)) {
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
    if (!order.canBeCancelled) {
      throw new Error("订单当前状态不允许取消");
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
    let daysToAdd: number;

    switch (shippingMethod) {
      case "overnight":
        daysToAdd = 1;
        break;
      case "express":
        daysToAdd = 3;
        break;
      case "standard":
      default:
        daysToAdd = 7;
        break;
    }

    const deliveryDate = new Date(now);
    deliveryDate.setDate(now.getDate() + daysToAdd);

    return deliveryDate;
  }
}
