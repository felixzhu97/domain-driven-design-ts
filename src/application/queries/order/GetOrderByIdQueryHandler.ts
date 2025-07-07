import { QueryHandler } from "../base/QueryHandler";
import {
  createQuerySuccessResult,
  createQueryFailureResult,
  QueryResult,
} from "../base/Query";
import { GetOrderByIdQuery } from "./GetOrderByIdQuery";
import { Order } from "../../../domain/entities/Order";
import { IOrderRepository } from "../../../domain/repositories";

/**
 * 根据ID获取订单查询处理器
 */
export class GetOrderByIdQueryHandler extends QueryHandler<
  GetOrderByIdQuery,
  Order
> {
  constructor(private readonly orderRepository: IOrderRepository) {
    super();
  }

  protected async validate(
    query: GetOrderByIdQuery
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors = query.validate();
    return { isValid: errors.length === 0, errors };
  }

  protected async execute(query: GetOrderByIdQuery): Promise<Order> {
    const order = await this.orderRepository.findById(query.orderId);
    if (!order) {
      throw new Error("订单不存在");
    }
    return order;
  }
}
