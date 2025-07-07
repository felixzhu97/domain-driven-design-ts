import { QueryHandler } from "../base/QueryHandler";
import {
  createQuerySuccessResult,
  createQueryFailureResult,
  QueryResult,
  PageInfo,
} from "../base/Query";
import { GetOrdersQuery } from "./GetOrdersQuery";
import { Order } from "../../../domain/entities/Order";
import { IOrderRepository } from "../../../domain/repositories";
import { Money } from "../../../domain/value-objects";

/**
 * 获取订单列表查询处理器
 */
export class GetOrdersQueryHandler extends QueryHandler<
  GetOrdersQuery,
  Order[]
> {
  constructor(private readonly orderRepository: IOrderRepository) {
    super();
  }

  protected async validate(
    query: GetOrdersQuery
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors = query.validate();
    return { isValid: errors.length === 0, errors };
  }

  protected async execute(query: GetOrdersQuery): Promise<Order[]> {
    // 获取所有订单
    const allOrders = await this.orderRepository.findAll();

    // 应用过滤器
    let filteredOrders = allOrders;

    // 按客户ID过滤
    if (query.filters?.customerId) {
      filteredOrders = filteredOrders.filter(
        (order) => order.customerId === query.filters!.customerId
      );
    }

    // 按状态过滤
    if (query.filters?.status) {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === query.filters!.status
      );
    }

    // 按金额范围过滤
    if (query.filters?.minAmount !== undefined) {
      filteredOrders = filteredOrders.filter(
        (order) => order.totalAmount.amount >= query.filters!.minAmount!
      );
    }

    if (query.filters?.maxAmount !== undefined) {
      filteredOrders = filteredOrders.filter(
        (order) => order.totalAmount.amount <= query.filters!.maxAmount!
      );
    }

    // 按日期范围过滤
    if (query.filters?.startDate) {
      filteredOrders = filteredOrders.filter(
        (order) => order.createdAt >= query.filters!.startDate!
      );
    }

    if (query.filters?.endDate) {
      filteredOrders = filteredOrders.filter(
        (order) => order.createdAt <= query.filters!.endDate!
      );
    }

    // 应用分页
    if (query.pagination) {
      const startIndex =
        (query.pagination.page - 1) * query.pagination.pageSize;
      const endIndex = startIndex + query.pagination.pageSize;
      filteredOrders = filteredOrders.slice(startIndex, endIndex);
    }

    return filteredOrders;
  }
}
