/**
 * 领域错误处理 - 基础错误类和类型定义
 * 提供结构化的错误信息和错误分类机制
 */

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ErrorCategory {
  BUSINESS_RULE = "business_rule",
  VALIDATION = "validation",
  NOT_FOUND = "not_found",
  PERMISSION = "permission",
  CONCURRENCY = "concurrency",
  EXTERNAL_SERVICE = "external_service",
  INFRASTRUCTURE = "infrastructure",
}

/**
 * 错误详情接口
 */
export interface ErrorDetails {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp?: Date;
  readonly traceId?: string;
  readonly userId?: string;
  readonly correlationId?: string;
  // 支持动态添加其他属性
  readonly [key: string]: unknown;
}

/**
 * 错误上下文接口
 */
export interface ErrorContext {
  readonly aggregateId?: string;
  readonly aggregateType?: string;
  readonly operation?: string;
  readonly version?: number;
  readonly metadata?: Record<string, unknown>;
  // 支持动态添加其他属性
  readonly [key: string]: unknown;
}

/**
 * 领域错误基类
 */
export abstract class DomainError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly errorCode: string;
  public readonly details: ErrorDetails;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly innerError: Error | undefined;

  protected constructor(
    message: string,
    errorCode: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext,
    innerError?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.category = category;
    this.severity = severity;
    this.timestamp = new Date();
    this.innerError = innerError;

    this.details = {
      code: errorCode,
      message,
      timestamp: this.timestamp,
      ...details,
    };

    this.context = context || {};

    // 确保错误堆栈信息正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 获取完整的错误信息
   */
  public getFullErrorInfo(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      context: this.context,
      stack: this.stack,
      innerError: this.innerError
        ? {
            name: this.innerError.name,
            message: this.innerError.message,
            stack: this.innerError.stack,
          }
        : undefined,
    };
  }

  /**
   * 获取用户友好的错误信息
   */
  public getUserFriendlyMessage(): string {
    return this.details.message || this.message;
  }

  /**
   * 检查是否为重试错误
   */
  public isRetryable(): boolean {
    return [
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorCategory.INFRASTRUCTURE,
      ErrorCategory.CONCURRENCY,
    ].includes(this.category);
  }

  /**
   * 检查是否为客户端错误
   */
  public isClientError(): boolean {
    return [
      ErrorCategory.VALIDATION,
      ErrorCategory.BUSINESS_RULE,
      ErrorCategory.PERMISSION,
      ErrorCategory.NOT_FOUND,
    ].includes(this.category);
  }

  /**
   * 转换为JSON格式
   */
  public toJSON(): Record<string, unknown> {
    return this.getFullErrorInfo();
  }
}

/**
 * 业务规则错误
 */
export class BusinessRuleError extends DomainError {
  constructor(
    message: string,
    errorCode: string = "BUSINESS_RULE_VIOLATION",
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      message,
      errorCode,
      ErrorCategory.BUSINESS_RULE,
      ErrorSeverity.MEDIUM,
      details,
      context
    );
  }
}

/**
 * 验证错误
 */
export class ValidationError extends DomainError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string,
    fieldErrors: Record<string, string[]> = {},
    errorCode: string = "VALIDATION_FAILED",
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      message,
      errorCode,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      {
        ...details,
        fieldErrors,
      },
      context
    );
    this.fieldErrors = fieldErrors;
  }

  /**
   * 添加字段错误
   */
  public addFieldError(field: string, error: string): ValidationError {
    const newFieldErrors = { ...this.fieldErrors };
    if (!newFieldErrors[field]) {
      newFieldErrors[field] = [];
    }
    newFieldErrors[field].push(error);

    return new ValidationError(
      this.message,
      newFieldErrors,
      this.errorCode,
      this.details,
      this.context
    );
  }

  /**
   * 获取第一个字段错误
   */
  public getFirstFieldError(): string | undefined {
    const firstField = Object.keys(this.fieldErrors)[0];
    return firstField ? this.fieldErrors[firstField]?.[0] : undefined;
  }

  /**
   * 检查是否有字段错误
   */
  public hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }
}

/**
 * 聚合未找到错误
 */
export class AggregateNotFoundError extends DomainError {
  constructor(
    aggregateType: string,
    aggregateId: string,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    const message = `${aggregateType} with id '${aggregateId}' was not found`;
    super(
      message,
      "AGGREGATE_NOT_FOUND",
      ErrorCategory.NOT_FOUND,
      ErrorSeverity.MEDIUM,
      {
        ...details,
        aggregateType,
        aggregateId,
      },
      {
        ...context,
        aggregateType,
        aggregateId,
      }
    );
  }
}

/**
 * 并发冲突错误
 */
export class ConcurrencyConflictError extends DomainError {
  constructor(
    aggregateType: string,
    aggregateId: string,
    expectedVersion: number,
    actualVersion: number,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    const message = `Concurrency conflict for ${aggregateType} '${aggregateId}'. Expected version: ${expectedVersion}, actual version: ${actualVersion}`;
    super(
      message,
      "CONCURRENCY_CONFLICT",
      ErrorCategory.CONCURRENCY,
      ErrorSeverity.HIGH,
      {
        ...details,
        aggregateType,
        aggregateId,
        expectedVersion,
        actualVersion,
      },
      {
        ...context,
        aggregateType,
        aggregateId,
        version: actualVersion,
      }
    );
  }
}

/**
 * 权限错误
 */
export class PermissionError extends DomainError {
  constructor(
    operation: string,
    resource: string,
    userId?: string,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    const message = `Access denied for operation '${operation}' on resource '${resource}'`;
    super(
      message,
      "ACCESS_DENIED",
      ErrorCategory.PERMISSION,
      ErrorSeverity.MEDIUM,
      {
        ...details,
        operation,
        resource,
        ...(userId ? { userId } : {}),
      },
      {
        ...context,
        operation,
      }
    );
  }
}

/**
 * 外部服务错误
 */
export class ExternalServiceError extends DomainError {
  constructor(
    serviceName: string,
    operation: string,
    message: string,
    innerError?: Error,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      `External service '${serviceName}' error during '${operation}': ${message}`,
      "EXTERNAL_SERVICE_ERROR",
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.HIGH,
      {
        ...details,
        serviceName,
        operation,
      },
      context,
      innerError
    );
  }
}

/**
 * 基础设施错误
 */
export class InfrastructureError extends DomainError {
  constructor(
    component: string,
    operation: string,
    message: string,
    innerError?: Error,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      `Infrastructure error in '${component}' during '${operation}': ${message}`,
      "INFRASTRUCTURE_ERROR",
      ErrorCategory.INFRASTRUCTURE,
      ErrorSeverity.CRITICAL,
      {
        ...details,
        component,
        operation,
      },
      context,
      innerError
    );
  }
}
