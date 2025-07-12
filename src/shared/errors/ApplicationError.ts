/**
 * 应用层错误处理
 * 处理应用服务、命令处理器、查询处理器等的错误
 */

import {
  DomainError,
  ErrorSeverity,
  ErrorCategory,
  ErrorDetails,
  ErrorContext,
} from "./DomainError";

/**
 * 应用错误基类
 */
export abstract class ApplicationError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly errorCode: string;
  public readonly details: ErrorDetails;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly innerError: Error | undefined;

  protected constructor(
    message: string,
    errorCode: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext,
    innerError?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
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
   * 转换为JSON格式
   */
  public toJSON(): Record<string, unknown> {
    return this.getFullErrorInfo();
  }
}

/**
 * 命令处理错误
 */
export class CommandHandlingError extends ApplicationError {
  constructor(
    commandType: string,
    message: string,
    innerError?: Error,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      `Command handling failed for '${commandType}': ${message}`,
      "COMMAND_HANDLING_FAILED",
      ErrorSeverity.HIGH,
      {
        ...details,
        commandType,
      },
      context,
      innerError
    );
  }
}

/**
 * 查询处理错误
 */
export class QueryHandlingError extends ApplicationError {
  constructor(
    queryType: string,
    message: string,
    innerError?: Error,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      `Query handling failed for '${queryType}': ${message}`,
      "QUERY_HANDLING_FAILED",
      ErrorSeverity.MEDIUM,
      {
        ...details,
        queryType,
      },
      context,
      innerError
    );
  }
}

/**
 * 应用服务错误
 */
export class ApplicationServiceError extends ApplicationError {
  constructor(
    serviceName: string,
    operation: string,
    message: string,
    innerError?: Error,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      `Application service '${serviceName}' error during '${operation}': ${message}`,
      "APPLICATION_SERVICE_ERROR",
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
 * 配置错误
 */
export class ConfigurationError extends ApplicationError {
  constructor(
    configKey: string,
    message: string,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      `Configuration error for '${configKey}': ${message}`,
      "CONFIGURATION_ERROR",
      ErrorSeverity.CRITICAL,
      {
        ...details,
        configKey,
      },
      context
    );
  }
}

/**
 * 序列化错误
 */
export class SerializationError extends ApplicationError {
  constructor(
    dataType: string,
    operation: "serialize" | "deserialize",
    message: string,
    innerError?: Error,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      `${operation} failed for '${dataType}': ${message}`,
      "SERIALIZATION_ERROR",
      ErrorSeverity.MEDIUM,
      {
        ...details,
        dataType,
        operation,
      },
      context,
      innerError
    );
  }
}

/**
 * 映射错误
 */
export class MappingError extends ApplicationError {
  constructor(
    sourceType: string,
    targetType: string,
    message: string,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      `Mapping from '${sourceType}' to '${targetType}' failed: ${message}`,
      "MAPPING_ERROR",
      ErrorSeverity.MEDIUM,
      {
        ...details,
        sourceType,
        targetType,
      },
      context
    );
  }
}

/**
 * 授权错误
 */
export class AuthorizationError extends ApplicationError {
  constructor(
    userId: string,
    resource: string,
    action: string,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      `User '${userId}' is not authorized to perform '${action}' on '${resource}'`,
      "AUTHORIZATION_FAILED",
      ErrorSeverity.MEDIUM,
      {
        ...details,
        userId,
        resource,
        action,
      },
      context
    );
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends ApplicationError {
  constructor(
    reason: string,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      `Authentication failed: ${reason}`,
      "AUTHENTICATION_FAILED",
      ErrorSeverity.MEDIUM,
      {
        ...details,
        reason,
      },
      context
    );
  }
}

/**
 * 重复操作错误
 */
export class DuplicateOperationError extends ApplicationError {
  constructor(
    operation: string,
    identifier: string,
    details?: Partial<ErrorDetails>,
    context?: ErrorContext
  ) {
    super(
      `Duplicate operation '${operation}' detected for identifier '${identifier}'`,
      "DUPLICATE_OPERATION",
      ErrorSeverity.LOW,
      {
        ...details,
        operation,
        identifier,
      },
      context
    );
  }
}
