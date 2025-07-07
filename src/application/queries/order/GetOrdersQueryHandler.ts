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
    // 构建搜索条件
    const searchCriteria = {
      customerId: query.filters?.customerId,
      status: query.filters?.status,
      startDate: query.filters?.startDate,
      endDate: query.filters?.endDate,
      minAmount: query.filters?.minAmount
        ? new Money(query.filters.minAmount, "CNY")
        : undefined,
      maxAmount: query.filters?.maxAmount
        ? new Money(query.filters.maxAmount, "CNY")
        : undefined,
    };

    // 执行查询 - 使用findAll方法，因为findByCriteria可能不存在
    const allOrders = await this.orderRepository.findAll();

    // 手动过滤
    let filteredOrders = allOrders;

    if (searchCriteria.customerId) {
      filteredOrders = filteredOrders.filter(
        (order) => order.customerId.value === searchCriteria.customerId
      );
    }

    if (searchCriteria.status) {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === searchCriteria.status
      );
    }

    if (searchCriteria.startDate) {
      filteredOrders = filteredOrders.filter(
        (order) => order.createdAt >= searchCriteria.startDate!
      );
    }

    if (searchCriteria.endDate) {
      filteredOrders = filteredOrders.filter(
        (order) => order.createdAt <= searchCriteria.endDate!
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
