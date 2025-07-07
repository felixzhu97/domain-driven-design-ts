import { QueryHandler } from "../base/QueryHandler";
import { GetUserByIdQuery } from "./GetUserByIdQuery";
import { User } from "../../../domain/entities/User";
import { IUserRepository } from "../../../domain/repositories";

/**
 * 根据ID获取用户查询处理器
 */
export class GetUserByIdQueryHandler extends QueryHandler<
  GetUserByIdQuery,
  User
> {
  constructor(private readonly userRepository: IUserRepository) {
    super();
  }

  protected async validate(
    query: GetUserByIdQuery
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors = query.validate();
    return { isValid: errors.length === 0, errors };
  }

  protected async execute(query: GetUserByIdQuery): Promise<User> {
    const user = await this.userRepository.findById(query.userId);
    if (!user) {
      throw new Error("用户不存在");
    }
    return user;
  }
}
