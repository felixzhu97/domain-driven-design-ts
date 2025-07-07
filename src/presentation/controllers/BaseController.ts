import { CommandResult } from "../../application/commands/base/Command";
import { QueryResult } from "../../application/queries/base/Query";

/**
 * HTTP响应接口
 */
export interface HttpResponse {
  statusCode: number;
  data?: any;
  message?: string;
  errors?: string[];
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

/**
 * 基础控制器类
 * 提供通用的HTTP响应处理
 */
export abstract class BaseController {
  /**
   * 创建成功响应
   */
  protected ok<T>(data?: T, message?: string): HttpResponse {
    const response: HttpResponse = {
      statusCode: 200,
    };
    if (data !== undefined) response.data = data;
    if (message) response.message = message;
    return response;
  }

  /**
   * 创建创建成功响应
   */
  protected created<T>(data?: T, message?: string): HttpResponse {
    const response: HttpResponse = {
      statusCode: 201,
    };
    if (data !== undefined) response.data = data;
    if (message) response.message = message;
    return response;
  }

  /**
   * 创建无内容响应
   */
  protected noContent(): HttpResponse {
    return {
      statusCode: 204,
    };
  }

  /**
   * 创建错误请求响应
   */
  protected badRequest(message: string, errors?: string[]): HttpResponse {
    const response: HttpResponse = {
      statusCode: 400,
      message,
    };
    if (errors && errors.length > 0) response.errors = errors;
    return response;
  }

  /**
   * 创建未授权响应
   */
  protected unauthorized(message: string = "未授权访问"): HttpResponse {
    return {
      statusCode: 401,
      message,
    };
  }

  /**
   * 创建禁止访问响应
   */
  protected forbidden(message: string = "禁止访问"): HttpResponse {
    return {
      statusCode: 403,
      message,
    };
  }

  /**
   * 创建未找到响应
   */
  protected notFound(message: string = "资源未找到"): HttpResponse {
    return {
      statusCode: 404,
      message,
    };
  }

  /**
   * 创建冲突响应
   */
  protected conflict(message: string): HttpResponse {
    return {
      statusCode: 409,
      message,
    };
  }

  /**
   * 创建服务器错误响应
   */
  protected internalServerError(
    message: string = "服务器内部错误"
  ): HttpResponse {
    return {
      statusCode: 500,
      message,
    };
  }

  /**
   * 从命令结果创建响应
   */
  protected fromCommandResult<T>(
    result: CommandResult<T>,
    successMessage?: string
  ): HttpResponse {
    if (result.success) {
      return this.ok(result.data, successMessage);
    } else {
      return this.badRequest(
        result.error || "命令执行失败",
        result.validationErrors
      );
    }
  }

  /**
   * 从查询结果创建响应
   */
  protected fromQueryResult<T>(result: QueryResult<T>): HttpResponse {
    if (result.success) {
      const response = this.ok(result.data);

      // 添加分页信息
      if (result.pageInfo && typeof result.totalCount === "number") {
        response.meta = {
          total: result.totalCount,
          page: result.pageInfo.currentPage,
          pageSize: result.pageInfo.pageSize,
          totalPages: result.pageInfo.totalPages,
        };
      }

      return response;
    } else {
      return this.badRequest(result.error || "查询执行失败");
    }
  }

  /**
   * 创建分页响应
   */
  protected paginated<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
    message?: string
  ): HttpResponse {
    const totalPages = Math.ceil(total / pageSize);

    const response: HttpResponse = {
      statusCode: 200,
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
      },
    };
    if (message) response.message = message;
    return response;
  }

  /**
   * 处理异常
   */
  protected handleError(error: any): HttpResponse {
    console.error("Controller Error:", error);

    if (error.message) {
      // 已知错误
      return this.badRequest(error.message);
    } else {
      // 未知错误
      return this.internalServerError();
    }
  }

  /**
   * 验证必填参数
   */
  protected validateRequired(
    params: Record<string, any>,
    requiredFields: string[]
  ): string[] {
    const errors: string[] = [];

    for (const field of requiredFields) {
      if (
        !params[field] ||
        (typeof params[field] === "string" && params[field].trim() === "")
      ) {
        errors.push(`${field} 是必填项`);
      }
    }

    return errors;
  }

  /**
   * 验证数字参数
   */
  protected validateNumber(
    value: any,
    fieldName: string,
    min?: number,
    max?: number
  ): string[] {
    const errors: string[] = [];

    if (isNaN(value) || !Number.isFinite(Number(value))) {
      errors.push(`${fieldName} 必须是有效数字`);
      return errors;
    }

    const numValue = Number(value);

    if (min !== undefined && numValue < min) {
      errors.push(`${fieldName} 不能小于 ${min}`);
    }

    if (max !== undefined && numValue > max) {
      errors.push(`${fieldName} 不能大于 ${max}`);
    }

    return errors;
  }

  /**
   * 验证邮箱格式
   */
  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
