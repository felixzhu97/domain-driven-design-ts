import { Query } from "../base/Query";
import { EntityId } from "../../../shared/types";

/**
 * 根据ID获取用户查询
 */
export class GetUserByIdQuery extends Query {
  public readonly userId: EntityId;

  constructor(userId: EntityId) {
    super();
    this.userId = userId;
  }
}
