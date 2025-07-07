import {
  QueryResult,
  createQuerySuccessResult,
  createQueryFailureResult,
} from "./Query";

/**
 * 查询处理器接口
 */
export interface IQueryHandler<TQuery extends IQuery, TResult = any> {
  handle(query: TQuery): Promise<QueryResult<TResult>>;
}

/**
 * 查询处理器基类
 */
export abstract class QueryHandler<TQuery, TResult = any> {
  /**
   * 处理查询
   */
  public async handle(query: TQuery): Promise<QueryResult<TResult>> {
    try {
      // 验证查询
      const validationResult = await this.validate(query);
      if (!validationResult.isValid) {
        return createQueryFailureResult(validationResult.errors.join(", "));
      }

      // 执行查询
      const result = await this.execute(query);
      return createQuerySuccessResult(result, "查询执行成功");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "查询执行失败";
      return createQueryFailureResult(errorMessage);
    }
  }

  /**
   * 验证查询
   */
  protected async validate(
    query: TQuery
  ): Promise<{ isValid: boolean; errors: string[] }> {
    // 默认实现 - 子类可以重写
    return { isValid: true, errors: [] };
  }

  /**
   * 执行查询的具体实现
   */
  protected abstract execute(query: TQuery): Promise<TResult>;

  /**
   * 获取处理器名称
   */
  public getHandlerName(): string {
    return this.constructor.name;
  }
}
