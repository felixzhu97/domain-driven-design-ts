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
  data?: T | undefined;
  error?: string | undefined;
  message?: string | undefined;
  pageInfo?: PageInfo | undefined;
  totalCount?: number | undefined;
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
  /**
   * 创建成功结果
   */
  public static success<T>(
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
  public static failure(error: string): QueryResult<any> {
    return {
      success: false,
      error,
    };
  }
}

/**
 * 创建成功的查询结果
 */
export function createQuerySuccessResult<T>(
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
 * 创建简单成功的查询结果
 */
export function createSimpleQuerySuccessResult<T>(
  data: T,
  message?: string
): QueryResult<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * 创建失败的查询结果
 */
export function createQueryFailureResult(error: string): QueryResult<any> {
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
