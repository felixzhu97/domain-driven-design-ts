import { IQuery, QueryResult, PageInfo } from "./Query";

/**
 * 查询处理器接口
 */
export interface IQueryHandler<TQuery extends IQuery, TResult = any> {
  handle(query: TQuery): Promise<QueryResult<TResult>>;
}

/**
 * 查询处理器基类
 */
export abstract class QueryHandler<TQuery extends IQuery, TResult = any>
  implements IQueryHandler<TQuery, TResult>
{
  public abstract handle(query: TQuery): Promise<QueryResult<TResult>>;

  /**
   * 验证查询
   */
  protected abstract validateQuery(query: TQuery): string[];

  /**
   * 执行查询
   */
  protected abstract executeQuery(query: TQuery): Promise<TResult>;

  /**
   * 处理查询的通用流程
   */
  protected async processQuery(query: TQuery): Promise<QueryResult<TResult>> {
    try {
      // 1. 验证查询
      const validationErrors = this.validateQuery(query);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: "查询验证失败: " + validationErrors.join(", "),
        };
      }

      // 2. 执行查询
      const result = await this.executeQuery(query);

      // 3. 返回成功结果
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // 4. 处理异常
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 创建成功结果
   */
  protected success<T>(
    data: T,
    message?: string,
    pageInfo?: PageInfo,
    totalCount?: number
  ): QueryResult<T> {
    return {
      success: true,
      data,
      message,
      pageInfo,
      totalCount,
    };
  }

  /**
   * 创建失败结果
   */
  protected failure(error: string): QueryResult {
    return {
      success: false,
      error,
    };
  }
}
