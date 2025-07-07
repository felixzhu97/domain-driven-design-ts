import { Query } from "../base/Query";
import { EntityId } from "../../../shared/types";

/**
 * 根据ID获取订单查询
 */
export class GetOrderByIdQuery extends Query {
  public readonly orderId: EntityId;

  constructor(orderId: EntityId) {
    super();
    this.orderId = orderId;
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.orderId || this.orderId.trim() === "") {
      errors.push("订单ID是必填项");
    }

    return errors;
  }
}
