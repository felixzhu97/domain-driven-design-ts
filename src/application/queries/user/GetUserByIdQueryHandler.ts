import { QueryHandler, IQueryHandler } from "../base/QueryHandler";
import {
  QueryResult,
  createQuerySuccessResult,
  createQueryFailureResult,
} from "../base/Query";
import { GetUserByIdQuery } from "./GetUserByIdQuery";
import { User } from "../../../domain/entities";
import { IUserRepository } from "../../../domain/repositories";

/**
 * 根据ID获取用户查询处理器
 */
export class GetUserByIdQueryHandler
  extends QueryHandler<GetUserByIdQuery, User>
  implements IQueryHandler<GetUserByIdQuery, User>
{
  constructor(private userRepository: IUserRepository) {
    super();
  }

  public async handle(query: GetUserByIdQuery): Promise<QueryResult<User>> {
    return this.processQuery(query);
  }

  protected validateQuery(query: GetUserByIdQuery): string[] {
    const errors: string[] = [];

    if (!query.userId || query.userId.trim() === "") {
      errors.push("用户ID不能为空");
    }

    return errors;
  }

  protected async executeQuery(query: GetUserByIdQuery): Promise<User> {
    const user = await this.userRepository.findById(query.userId);

    if (!user) {
      throw new Error(`找不到用户: ${query.userId}`);
    }

    return user;
  }
}
