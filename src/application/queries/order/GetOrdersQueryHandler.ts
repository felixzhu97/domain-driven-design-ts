import { QueryHandler, QueryResult, PageInfo } from "../base/Query";
import { GetOrdersQuery } from "./GetOrdersQuery";
import { IOrderRepository } from "../../../domain/repositories";
import { Order } from "../../../domain/entities";

/**
 * 获取订单列表查询处理器
 */
export class GetOrdersQueryHandler
  implements QueryHandler<GetOrdersQuery, Order[]>
{
  constructor(private readonly orderRepository: IOrderRepository) {}

  async handle(query: GetOrdersQuery): Promise<QueryResult<Order[]>> {
    try {
      // 验证查询
      const validationErrors = query.validate();
      if (validationErrors.length > 0) {
        return QueryResult.failure("查询验证失败", validationErrors.join(", "));
      }

      // 设置默认分页参数
      const page = query.pagination?.page || 1;
      const pageSize = query.pagination?.pageSize || 10;

      // 执行查询
      const result = await this.orderRepository.findWithPagination(
        page,
        pageSize,
        query.filters,
        query.sort
      );

      // 创建分页信息
      const pageInfo: PageInfo = {
        currentPage: result.page,
        pageSize: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      };

      return QueryResult.success(
        result.orders,
        undefined,
        pageInfo,
        result.total
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "查询订单列表时发生未知错误";
      return QueryResult.failure(errorMessage);
    }
  }
}
