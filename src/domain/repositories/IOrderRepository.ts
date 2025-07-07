import { Order, OrderStatus } from "../entities";
import { Money } from "../value-objects";
import { EntityId } from "../../shared/types";
import { IRepository } from "./IRepository";

export interface OrderSearchCriteria {
  customerId?: EntityId;
  status?: OrderStatus;
  minAmount?: Money;
  maxAmount?: Money;
  startDate?: Date;
  endDate?: Date;
  orderNumber?: string;
}

export interface OrderSortOptions {
  field:
    | "orderNumber"
    | "totalAmount"
    | "createdAt"
    | "confirmedAt"
    | "shippedAt";
  direction: "asc" | "desc";
}

export interface IOrderRepository extends IRepository<Order> {
  /**
   * 根据订单号查找订单
   */
  findByOrderNumber(orderNumber: string): Promise<Order | null>;

  /**
   * 根据客户ID查找订单
   */
  findByCustomerId(customerId: EntityId): Promise<Order[]>;

  /**
   * 根据状态查找订单
   */
  findByStatus(status: OrderStatus): Promise<Order[]>;

  /**
   * 查找指定日期范围内的订单
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;

  /**
   * 查找待确认订单
   */
  findPendingOrders(): Promise<Order[]>;

  /**
   * 查找已确认但未支付订单
   */
  findConfirmedOrders(): Promise<Order[]>;

  /**
   * 查找已支付但未发货订单
   */
  findPaidOrders(): Promise<Order[]>;

  /**
   * 查找已发货订单
   */
  findShippedOrders(): Promise<Order[]>;

  /**
   * 查找已完成订单
   */
  findDeliveredOrders(): Promise<Order[]>;

  /**
   * 查找已取消订单
   */
  findCancelledOrders(): Promise<Order[]>;

  /**
   * 高级搜索
   */
  search(criteria: OrderSearchCriteria): Promise<Order[]>;

  /**
   * 分页查找订单
   */
  findWithPagination(
    page: number,
    limit: number,
    criteria?: OrderSearchCriteria,
    sort?: OrderSortOptions
  ): Promise<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * 获取客户的最近订单
   */
  findRecentOrdersByCustomer(
    customerId: EntityId,
    limit: number
  ): Promise<Order[]>;

  /**
   * 查找包含特定商品的订单
   */
  findOrdersContainingProduct(productId: EntityId): Promise<Order[]>;

  /**
   * 获取订单统计信息
   */
  getOrderStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    paidOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }>;

  /**
   * 获取月度销售统计
   */
  getMonthlySalesStats(year: number): Promise<
    Array<{
      month: number;
      orderCount: number;
      totalRevenue: number;
      averageOrderValue: number;
    }>
  >;

  /**
   * 获取每日销售统计
   */
  getDailySalesStats(
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      date: Date;
      orderCount: number;
      totalRevenue: number;
    }>
  >;

  /**
   * 获取客户订单统计
   */
  getCustomerOrderStats(customerId: EntityId): Promise<{
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
  }>;

  /**
   * 查找超时未支付订单
   */
  findExpiredPendingOrders(timeoutMinutes: number): Promise<Order[]>;

  /**
   * 查找需要发货的订单
   */
  findOrdersReadyToShip(): Promise<Order[]>;
}
