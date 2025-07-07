import {
  IOrderRepository,
  IProductRepository,
  IUserRepository,
} from "../../domain/repositories";
import { Order, OrderStatus } from "../../domain/entities/Order";
import { OrderItem } from "../../domain/entities/OrderItem";
import { Money } from "../../domain/value-objects";
import { Address } from "../../domain/value-objects";
import { EntityId } from "../../shared/types";

/**
 * 订单应用服务 - 封装订单相关的业务流程
 */
export class OrderApplicationService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly productRepository: IProductRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * 创建订单
   */
  async createOrder(data: {
    customerId: EntityId;
    items: Array<{
      productId: EntityId;
      quantity: number;
    }>;
    shippingAddress: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  }): Promise<Order> {
    // 验证客户是否存在
    const customer = await this.userRepository.findById(data.customerId);
    if (!customer) {
      throw new Error("客户不存在");
    }

    if (!customer.isActive) {
      throw new Error("客户账户未激活");
    }

    // 验证并获取商品信息
    const orderItems: OrderItem[] = [];
    let totalAmount = new Money(0, "CNY");

    for (const item of data.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        throw new Error(`商品 ${item.productId.toString()} 不存在`);
      }

      if (!product.isAvailable) {
        throw new Error(`商品 ${product.name} 不可用`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `商品 ${product.name} 库存不足，当前库存：${product.stock}`
        );
      }

      // 创建订单项
      const orderItem = OrderItem.create(
        item.productId,
        product.name,
        item.quantity,
        product.price
      );

      orderItems.push(orderItem);

      // 计算总金额
      const itemTotal = product.price.multiply(item.quantity);
      totalAmount = totalAmount.add(itemTotal);
    }

    // 创建配送地址
    const shippingAddress = new Address({
      country: data.shippingAddress.country,
      province: data.shippingAddress.state,
      city: data.shippingAddress.city,
      district: "",
      street: data.shippingAddress.street,
      postalCode: data.shippingAddress.zipCode,
    });

    // 创建订单
    const order = Order.create(
      data.customerId,
      orderItems,
      totalAmount,
      shippingAddress
    );

    // 扣减库存
    for (const item of data.items) {
      const product = await this.productRepository.findById(item.productId);
      if (product) {
        product.decreaseStock(item.quantity, "订单扣减库存");
        await this.productRepository.save(product);
      }
    }

    // 保存订单
    await this.orderRepository.save(order);

    return order;
  }

  /**
   * 确认订单
   */
  async confirmOrder(orderId: EntityId): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error("订单不存在");
    }

    order.confirm();
    await this.orderRepository.save(order);

    return order;
  }

  /**
   * 发货
   */
  async shipOrder(orderId: EntityId, trackingNumber?: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error("订单不存在");
    }

    order.ship(trackingNumber || "");
    await this.orderRepository.save(order);

    return order;
  }

  /**
   * 确认收货
   */
  async deliverOrder(orderId: EntityId): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error("订单不存在");
    }

    order.markAsDelivered();
    await this.orderRepository.save(order);

    return order;
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId: EntityId, reason?: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error("订单不存在");
    }

    // 恢复库存
    for (const item of order.orderItems) {
      const product = await this.productRepository.findById(item.productId);
      if (product) {
        product.increaseStock(item.quantity, "订单取消恢复库存");
        await this.productRepository.save(product);
      }
    }

    order.cancel(reason || "");
    await this.orderRepository.save(order);

    return order;
  }

  /**
   * 获取用户订单
   */
  async getUserOrders(
    customerId: EntityId,
    filters?: {
      status?: OrderStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Order[]> {
    return await this.orderRepository.findByCustomerId(customerId);
  }

  /**
   * 计算订单统计
   */
  async getOrderStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
    customerId?: EntityId;
  }): Promise<{
    totalOrders: number;
    totalAmount: Money;
    averageOrderValue: Money;
    statusBreakdown: Record<OrderStatus, number>;
  }> {
    const orders = await this.orderRepository.findAll();

    const totalOrders = orders.length;
    let totalAmount = new Money(0, "CNY");
    const statusBreakdown: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.CONFIRMED]: 0,
      [OrderStatus.PAID]: 0,
      [OrderStatus.SHIPPED]: 0,
      [OrderStatus.DELIVERED]: 0,
      [OrderStatus.CANCELLED]: 0,
      [OrderStatus.REFUNDED]: 0,
    };

    for (const order of orders) {
      totalAmount = totalAmount.add(order.totalAmount);
      statusBreakdown[order.status]++;
    }

    const averageOrderValue =
      totalOrders > 0
        ? totalAmount.multiply(1 / totalOrders)
        : new Money(0, "CNY");

    return {
      totalOrders,
      totalAmount,
      averageOrderValue,
      statusBreakdown,
    };
  }
}
