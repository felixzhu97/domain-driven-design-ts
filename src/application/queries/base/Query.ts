import { EntityId } from "../../../shared/types";

/**
 * 查询接口
 */
export interface IQuery {
  readonly queryId: EntityId;
  readonly timestamp: Date;
}

/**
 * 查询基类
 */
export abstract class Query implements IQuery {
  public readonly queryId: EntityId;
  public readonly timestamp: Date;

  protected constructor() {
    this.queryId = this.generateId();
    this.timestamp = new Date();
  }

  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * 验证查询
   */
  abstract validate(): string[];
}

/**
 * 查询结果
 */
export interface QueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  totalCount?: number;
  pageInfo?: PageInfo;
}

/**
 * 分页信息
 */
export interface PageInfo {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * 排序参数
 */
export interface SortParams {
  field: string;
  direction: "asc" | "desc";
}

/**
 * 查询结果工具类
 */
export class QueryResultHelper {
  static success<T>(
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

  static failure(error: string): QueryResult {
    return {
      success: false,
      error,
    };
  }
}

/**
 * 创建成功查询结果
 */
export function createQuerySuccessResult<T>(
  data: T,
  message?: string,
  totalCount?: number,
  pageInfo?: PageInfo
): QueryResult<T> {
  const result: QueryResult<T> = {
    success: true,
    data,
    message,
  };

  if (totalCount !== undefined) {
    result.totalCount = totalCount;
  }

  if (pageInfo) {
    result.pageInfo = pageInfo;
  }

  return result;
}

/**
 * 创建失败查询结果
 */
export function createQueryFailureResult(error: string): QueryResult {
  return {
    success: false,
    error,
  };
}

/**
 * 创建分页信息
 */
export function createPageInfo(
  currentPage: number,
  pageSize: number,
  totalCount: number
): PageInfo {
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    currentPage,
    pageSize,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}
