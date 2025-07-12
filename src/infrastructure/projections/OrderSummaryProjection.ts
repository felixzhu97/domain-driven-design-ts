import {
  IEventProjection,
  StoredEvent,
  ProjectionStatus,
} from "../../shared/types/EventStore";

/**
 * 订单摘要读模型
 */
export interface OrderSummaryReadModel {
  orderId: string;
  customerId: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 订单统计读模型
 */
export interface OrderStatisticsReadModel {
  totalOrders: number;
  totalAmount: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  ordersByMonth: Record<string, number>;
  lastUpdated: Date;
}

/**
 * 订单摘要投影
 */
export class OrderSummaryProjection implements IEventProjection {
  public readonly projectionName = "OrderSummary";
  public readonly supportedEvents = [
    "OrderCreated",
    "OrderItemAdded",
    "OrderConfirmed",
    "OrderPaid",
    "OrderShipped",
    "OrderDelivered",
    "OrderCancelled",
  ];

  private orderSummaries: Map<string, OrderSummaryReadModel> = new Map();
  private statistics: OrderStatisticsReadModel = {
    totalOrders: 0,
    totalAmount: 0,
    averageOrderValue: 0,
    ordersByStatus: {},
    ordersByMonth: {},
    lastUpdated: new Date(),
  };

  private status: ProjectionStatus = {
    projectionName: this.projectionName,
    lastProcessedEventId: "",
    lastProcessedVersion: 0,
    isRunning: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  /**
   * 处理事件
   */
  async project(event: StoredEvent): Promise<void> {
    try {
      console.log(`📊 处理事件: ${event.eventType} (${event.streamId})`);

      switch (event.eventType) {
        case "OrderCreated":
          await this.handleOrderCreated(event);
          break;
        case "OrderItemAdded":
          await this.handleOrderItemAdded(event);
          break;
        case "OrderConfirmed":
          await this.handleOrderStatusChanged(event, "CONFIRMED");
          break;
        case "OrderPaid":
          await this.handleOrderStatusChanged(event, "PAID");
          break;
        case "OrderShipped":
          await this.handleOrderStatusChanged(event, "SHIPPED");
          break;
        case "OrderDelivered":
          await this.handleOrderStatusChanged(event, "DELIVERED");
          break;
        case "OrderCancelled":
          await this.handleOrderStatusChanged(event, "CANCELLED");
          break;
        default:
          console.warn(`未知事件类型: ${event.eventType}`);
      }

      // 更新统计信息
      this.updateStatistics();

      // 更新投影状态
      this.status.lastProcessedEventId = event.eventId;
      this.status.lastProcessedVersion = event.streamVersion;
      this.status.updatedAt = new Date();
    } catch (error) {
      console.error(`处理事件失败: ${event.eventType}`, error);
      throw error;
    }
  }

  /**
   * 处理订单创建事件
   */
  private async handleOrderCreated(event: StoredEvent): Promise<void> {
    const eventData = event.eventData;

    const orderSummary: OrderSummaryReadModel = {
      orderId: event.streamId,
      customerId: eventData.customerId || "",
      orderNumber: eventData.orderNumber || "",
      status: "PENDING",
      totalAmount: eventData.totalAmount || 0,
      currency: eventData.currency || "CNY",
      itemCount: 0,
      createdAt: event.occurredOn,
      updatedAt: event.occurredOn,
    };

    this.orderSummaries.set(event.streamId, orderSummary);
    console.log(`✅ 创建订单摘要: ${event.streamId}`);
  }

  /**
   * 处理订单项添加事件
   */
  private async handleOrderItemAdded(event: StoredEvent): Promise<void> {
    const orderSummary = this.orderSummaries.get(event.streamId);
    if (!orderSummary) {
      console.warn(`订单摘要不存在: ${event.streamId}`);
      return;
    }

    const eventData = event.eventData;
    orderSummary.itemCount += eventData.quantity || 1;
    orderSummary.totalAmount += eventData.totalPrice || 0;
    orderSummary.updatedAt = event.occurredOn;

    console.log(`✅ 更新订单项: ${event.streamId}`);
  }

  /**
   * 处理订单状态变更事件
   */
  private async handleOrderStatusChanged(
    event: StoredEvent,
    newStatus: string
  ): Promise<void> {
    const orderSummary = this.orderSummaries.get(event.streamId);
    if (!orderSummary) {
      console.warn(`订单摘要不存在: ${event.streamId}`);
      return;
    }

    orderSummary.status = newStatus;
    orderSummary.updatedAt = event.occurredOn;

    console.log(`✅ 更新订单状态: ${event.streamId} -> ${newStatus}`);
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(): void {
    const orders = Array.from(this.orderSummaries.values());

    this.statistics.totalOrders = orders.length;
    this.statistics.totalAmount = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    this.statistics.averageOrderValue =
      this.statistics.totalOrders > 0
        ? this.statistics.totalAmount / this.statistics.totalOrders
        : 0;

    // 按状态统计
    this.statistics.ordersByStatus = {};
    for (const order of orders) {
      this.statistics.ordersByStatus[order.status] =
        (this.statistics.ordersByStatus[order.status] || 0) + 1;
    }

    // 按月份统计
    this.statistics.ordersByMonth = {};
    for (const order of orders) {
      const monthKey = order.createdAt.toISOString().substring(0, 7); // YYYY-MM
      this.statistics.ordersByMonth[monthKey] =
        (this.statistics.ordersByMonth[monthKey] || 0) + 1;
    }

    this.statistics.lastUpdated = new Date();
  }

  /**
   * 重置投影
   */
  async reset(): Promise<void> {
    this.orderSummaries.clear();
    this.statistics = {
      totalOrders: 0,
      totalAmount: 0,
      averageOrderValue: 0,
      ordersByStatus: {},
      ordersByMonth: {},
      lastUpdated: new Date(),
    };

    this.status = {
      projectionName: this.projectionName,
      lastProcessedEventId: "",
      lastProcessedVersion: 0,
      isRunning: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`🔄 重置投影: ${this.projectionName}`);
  }

  /**
   * 获取投影状态
   */
  async getStatus(): Promise<ProjectionStatus> {
    return { ...this.status };
  }

  /**
   * 查询方法 - 获取订单摘要
   */
  async getOrderSummary(
    orderId: string
  ): Promise<OrderSummaryReadModel | null> {
    return this.orderSummaries.get(orderId) || null;
  }

  /**
   * 查询方法 - 获取所有订单摘要
   */
  async getAllOrderSummaries(): Promise<OrderSummaryReadModel[]> {
    return Array.from(this.orderSummaries.values());
  }

  /**
   * 查询方法 - 按状态过滤订单
   */
  async getOrdersByStatus(status: string): Promise<OrderSummaryReadModel[]> {
    return Array.from(this.orderSummaries.values()).filter(
      (order) => order.status === status
    );
  }

  /**
   * 查询方法 - 按客户ID获取订单
   */
  async getOrdersByCustomer(
    customerId: string
  ): Promise<OrderSummaryReadModel[]> {
    return Array.from(this.orderSummaries.values()).filter(
      (order) => order.customerId === customerId
    );
  }

  /**
   * 查询方法 - 获取统计信息
   */
  async getStatistics(): Promise<OrderStatisticsReadModel> {
    return { ...this.statistics };
  }

  /**
   * 查询方法 - 分页查询订单
   */
  async getOrdersPaginated(
    page: number,
    pageSize: number,
    statusFilter?: string
  ): Promise<{
    orders: OrderSummaryReadModel[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    let orders = Array.from(this.orderSummaries.values());

    // 状态过滤
    if (statusFilter) {
      orders = orders.filter((order) => order.status === statusFilter);
    }

    // 排序（最新的在前）
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // 分页
    const total = orders.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedOrders = orders.slice(startIndex, endIndex);

    return {
      orders: pagedOrders,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 查询方法 - 搜索订单
   */
  async searchOrders(query: {
    orderNumber?: string;
    customerId?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<OrderSummaryReadModel[]> {
    let orders = Array.from(this.orderSummaries.values());

    if (query.orderNumber) {
      orders = orders.filter((order) =>
        order.orderNumber
          .toLowerCase()
          .includes(query.orderNumber!.toLowerCase())
      );
    }

    if (query.customerId) {
      orders = orders.filter((order) => order.customerId === query.customerId);
    }

    if (query.status) {
      orders = orders.filter((order) => order.status === query.status);
    }

    if (query.minAmount !== undefined) {
      orders = orders.filter((order) => order.totalAmount >= query.minAmount!);
    }

    if (query.maxAmount !== undefined) {
      orders = orders.filter((order) => order.totalAmount <= query.maxAmount!);
    }

    if (query.fromDate) {
      orders = orders.filter((order) => order.createdAt >= query.fromDate!);
    }

    if (query.toDate) {
      orders = orders.filter((order) => order.createdAt <= query.toDate!);
    }

    return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
