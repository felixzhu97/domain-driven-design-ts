import { Order } from "../../../domain/entities";
import { IOrderRepository } from "../../../domain/repositories";
import { MemoryRepository } from "./MemoryRepository";
import { EntityId } from "../../../shared/types";

/**
 * 内存订单仓储实现
 */
export class MemoryOrderRepository
  extends MemoryRepository<Order>
  implements IOrderRepository
{
  public async findByCustomerId(customerId: EntityId): Promise<Order[]> {
    return this.findByCondition((order) => order.customerId === customerId);
  }

  public async findByStatus(status: string): Promise<Order[]> {
    return this.findByCondition((order) => order.status === status);
  }

  public async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return this.findFirstByCondition(
      (order) => order.orderNumber === orderNumber
    );
  }

  public async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Order[]> {
    return this.findByCondition((order) => {
      const orderDate = order.createdAt;
      return orderDate >= startDate && orderDate <= endDate;
    });
  }

  public async findRecentOrders(
    customerId: EntityId,
    limit: number = 10
  ): Promise<Order[]> {
    return this.findByCondition((order) => order.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  public async findPendingOrders(): Promise<Order[]> {
    return this.findByCondition((order) => order.status === "PENDING");
  }

  public async findConfirmedOrders(): Promise<Order[]> {
    return this.findByCondition((order) => order.status === "CONFIRMED");
  }

  public async findPaidOrders(): Promise<Order[]> {
    return this.findByCondition((order) => order.status === "PAID");
  }

  public async findShippedOrders(): Promise<Order[]> {
    return this.findByCondition((order) => order.status === "SHIPPED");
  }

  public async findDeliveredOrders(): Promise<Order[]> {
    return this.findByCondition((order) => order.status === "DELIVERED");
  }

  public async findCancelledOrders(): Promise<Order[]> {
    return this.findByCondition((order) => order.status === "CANCELLED");
  }

  public async search(criteria: any): Promise<Order[]> {
    return this.findByCondition((order) => {
      if (criteria.customerId && order.customerId !== criteria.customerId) {
        return false;
      }
      if (criteria.status && order.status !== criteria.status) {
        return false;
      }
      if (
        criteria.minAmount &&
        order.totalAmount.amount < criteria.minAmount.amount
      ) {
        return false;
      }
      if (
        criteria.maxAmount &&
        order.totalAmount.amount > criteria.maxAmount.amount
      ) {
        return false;
      }
      if (criteria.startDate && order.createdAt < criteria.startDate) {
        return false;
      }
      if (criteria.endDate && order.createdAt > criteria.endDate) {
        return false;
      }
      if (criteria.orderNumber && order.orderNumber !== criteria.orderNumber) {
        return false;
      }
      return true;
    });
  }

  public async findWithPagination(
    page: number,
    limit: number,
    criteria?: any,
    sort?: any
  ): Promise<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
  }> {
    let orders = await this.findAll();

    // 应用过滤器
    if (criteria) {
      orders = await this.search(criteria);
    }

    // 应用排序
    if (sort) {
      orders = this.sortOrders(orders, sort.field, sort.direction);
    }

    const result = this.paginate(orders, page, limit);

    return {
      orders: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  public async findRecentOrdersByCustomer(
    customerId: EntityId,
    limit: number
  ): Promise<Order[]> {
    return this.findByCondition((order) => order.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  public async findOrdersContainingProduct(
    productId: EntityId
  ): Promise<Order[]> {
    return this.findByCondition((order) =>
      order.orderItems.some((item) => item.productId === productId)
    );
  }

  public async getOrderStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    paidOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const allOrders = await this.findAll();

    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(
      (o) => o.status === "PENDING"
    ).length;
    const confirmedOrders = allOrders.filter(
      (o) => o.status === "CONFIRMED"
    ).length;
    const paidOrders = allOrders.filter((o) => o.status === "PAID").length;
    const shippedOrders = allOrders.filter(
      (o) => o.status === "SHIPPED"
    ).length;
    const deliveredOrders = allOrders.filter(
      (o) => o.status === "DELIVERED"
    ).length;
    const cancelledOrders = allOrders.filter(
      (o) => o.status === "CANCELLED"
    ).length;

    // 计算已完成订单的收入
    const completedOrders = allOrders.filter((o) =>
      ["PAID", "SHIPPED", "DELIVERED"].includes(o.status)
    );

    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + order.totalAmount.amount,
      0
    );
    const averageOrderValue =
      completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      paidOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: totalRevenue / 100, // 转换为元
      averageOrderValue: averageOrderValue / 100, // 转换为元
    };
  }

  public async getMonthlySalesStats(year: number): Promise<
    Array<{
      month: number;
      orderCount: number;
      totalRevenue: number;
      averageOrderValue: number;
    }>
  > {
    const allOrders = await this.findAll();
    const monthlyStats = new Map<
      number,
      {
        orders: Order[];
        totalRevenue: number;
      }
    >();

    // 按月份分组
    for (const order of allOrders) {
      if (
        order.createdAt.getFullYear() === year &&
        ["PAID", "SHIPPED", "DELIVERED"].includes(order.status)
      ) {
        const month = order.createdAt.getMonth() + 1;
        if (!monthlyStats.has(month)) {
          monthlyStats.set(month, { orders: [], totalRevenue: 0 });
        }
        const monthData = monthlyStats.get(month)!;
        monthData.orders.push(order);
        monthData.totalRevenue += order.totalAmount.amount;
      }
    }

    // 生成统计结果
    const stats = [];
    for (let month = 1; month <= 12; month++) {
      const monthData = monthlyStats.get(month) || {
        orders: [],
        totalRevenue: 0,
      };
      stats.push({
        month,
        orderCount: monthData.orders.length,
        totalRevenue: monthData.totalRevenue / 100,
        averageOrderValue:
          monthData.orders.length > 0
            ? monthData.totalRevenue / monthData.orders.length / 100
            : 0,
      });
    }

    return stats;
  }

  public async getDailySalesStats(
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      date: Date;
      orderCount: number;
      totalRevenue: number;
    }>
  > {
    const orders = await this.findByDateRange(startDate, endDate);
    const completedOrders = orders.filter((o) =>
      ["PAID", "SHIPPED", "DELIVERED"].includes(o.status)
    );

    const dailyStats = new Map<
      string,
      {
        orders: Order[];
        totalRevenue: number;
      }
    >();

    // 按日期分组
    for (const order of completedOrders) {
      const dateKey = order.createdAt.toISOString().split("T")[0];
      if (dateKey) {
        if (!dailyStats.has(dateKey)) {
          dailyStats.set(dateKey, { orders: [], totalRevenue: 0 });
        }
        const dayData = dailyStats.get(dateKey)!;
        dayData.orders.push(order);
        dayData.totalRevenue += order.totalAmount.amount;
      }
    }

    // 生成统计结果
    const stats = [];
    for (const [dateKey, dayData] of dailyStats) {
      stats.push({
        date: new Date(dateKey),
        orderCount: dayData.orders.length,
        totalRevenue: dayData.totalRevenue / 100,
      });
    }

    return stats.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  public async getCustomerOrderStats(customerId: EntityId): Promise<{
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
  }> {
    const customerOrders = await this.findByCustomerId(customerId);
    const completedOrders = customerOrders.filter((o) =>
      ["PAID", "SHIPPED", "DELIVERED"].includes(o.status)
    );

    const totalOrders = completedOrders.length;
    const totalSpent = completedOrders.reduce(
      (sum, order) => sum + order.totalAmount.amount,
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const lastOrder = customerOrders.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];

    if (lastOrder) {
      return {
        totalOrders,
        totalSpent: totalSpent / 100,
        averageOrderValue: averageOrderValue / 100,
        lastOrderDate: lastOrder.createdAt,
      };
    }

    return {
      totalOrders,
      totalSpent: totalSpent / 100,
      averageOrderValue: averageOrderValue / 100,
    };
  }

  public async findExpiredPendingOrders(
    timeoutMinutes: number
  ): Promise<Order[]> {
    const timeoutDate = new Date();
    timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes);

    return this.findByCondition(
      (order) => order.status === "CONFIRMED" && order.createdAt < timeoutDate
    );
  }

  public async findOrdersReadyToShip(): Promise<Order[]> {
    return this.findByCondition((order) => order.status === "PAID");
  }

  /**
   * 对订单进行排序
   */
  private sortOrders(
    orders: Order[],
    field: string,
    direction: "asc" | "desc"
  ): Order[] {
    return orders.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (field) {
        case "orderNumber":
          aValue = a.orderNumber;
          bValue = b.orderNumber;
          break;
        case "totalAmount":
          aValue = a.totalAmount.amount;
          bValue = b.totalAmount.amount;
          break;
        case "createdAt":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "confirmedAt":
          aValue = a.confirmedAt;
          bValue = b.confirmedAt;
          break;
        case "shippedAt":
          aValue = a.shippedAt;
          bValue = b.shippedAt;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * 查找待发货订单
   */
  public async findPendingShipmentOrders(): Promise<Order[]> {
    return this.findByCondition((order) => order.status === "PAID");
  }

  /**
   * 查找可取消的订单
   */
  public async findCancellableOrders(): Promise<Order[]> {
    return this.findByCondition((order) => order.canBeCancelled);
  }

  /**
   * 查找超时未支付的订单
   */
  public async findOverduePaymentOrders(
    timeoutMinutes: number = 30
  ): Promise<Order[]> {
    const timeoutDate = new Date();
    timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes);

    return this.findByCondition(
      (order) => order.status === "CONFIRMED" && order.createdAt < timeoutDate
    );
  }

  /**
   * 根据商品ID查找相关订单
   */
  public async findByProductId(productId: EntityId): Promise<Order[]> {
    return this.findByCondition((order) =>
      order.orderItems.some((item) => item.productId === productId)
    );
  }

  /**
   * 查找今日订单
   */
  public async findTodayOrders(): Promise<Order[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.findByDateRange(today, tomorrow);
  }

  /**
   * 查找本月订单
   */
  public async findThisMonthOrders(): Promise<Order[]> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.findByDateRange(monthStart, monthEnd);
  }
}
