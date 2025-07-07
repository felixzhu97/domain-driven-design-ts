import { QueryHandler, QueryResult } from "../base/Query";
import { GetOrderByIdQuery } from "./GetOrderByIdQuery";
import { IOrderRepository } from "../../../domain/repositories";
import { Order } from "../../../domain/entities";

/**
 * 根据ID获取订单查询处理器
 */
export class GetOrderByIdQueryHandler
  implements QueryHandler<GetOrderByIdQuery, Order>
{
  constructor(private readonly orderRepository: IOrderRepository) {}

  async handle(query: GetOrderByIdQuery): Promise<QueryResult<Order>> {
    try {
      // 验证查询
      const validationErrors = query.validate();
      if (validationErrors.length > 0) {
        return QueryResult.failure("查询验证失败", validationErrors.join(", "));
      }

      // 执行查询
      const order = await this.orderRepository.findById(query.orderId);

      if (!order) {
        return QueryResult.failure("订单不存在");
      }

      return QueryResult.success(order);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "查询订单时发生未知错误";
      return QueryResult.failure(errorMessage);
    }
  }
}
