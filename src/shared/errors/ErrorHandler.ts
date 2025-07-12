/**
 * 错误处理策略和错误恢复机制
 * 提供统一的错误处理、映射和恢复功能
 */

import {
  DomainError,
  ErrorSeverity,
  ErrorCategory,
  ValidationError,
} from "./DomainError";
import { ApplicationError } from "./ApplicationError";

/**
 * 错误处理结果
 */
export interface ErrorHandlingResult<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: Error;
  readonly recoveryAction?: RecoveryAction;
  readonly shouldRetry?: boolean;
  readonly retryDelay?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * 恢复操作类型
 */
export enum RecoveryAction {
  NONE = "none",
  RETRY = "retry",
  FALLBACK = "fallback",
  ESCALATE = "escalate",
  IGNORE = "ignore",
  COMPENSATE = "compensate",
}

/**
 * 错误处理策略接口
 */
export interface ErrorHandlingStrategy {
  canHandle(error: Error): boolean;
  handle<T>(
    error: Error,
    context?: Record<string, unknown>
  ): ErrorHandlingResult<T>;
  getRecoveryAction(error: Error): RecoveryAction;
  shouldRetry(error: Error, attemptCount: number): boolean;
  getRetryDelay(error: Error, attemptCount: number): number;
}

/**
 * 错误映射器接口
 */
export interface ErrorMapper {
  mapToHttpStatus(error: Error): number;
  mapToUserMessage(error: Error): string;
  mapToApiResponse(error: Error): Record<string, unknown>;
  mapToLogLevel(error: Error): "debug" | "info" | "warn" | "error";
}

/**
 * 重试配置
 */
export interface RetryConfig {
  readonly maxAttempts: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
  readonly jitter: boolean;
}

/**
 * 默认错误处理策略
 */
export class DefaultErrorHandlingStrategy implements ErrorHandlingStrategy {
  constructor(
    private readonly retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
    }
  ) {}

  public canHandle(error: Error): boolean {
    return true; // 默认策略处理所有错误
  }

  public handle<T>(
    error: Error,
    context?: Record<string, unknown>
  ): ErrorHandlingResult<T> {
    const isDomainError = error instanceof DomainError;
    const isApplicationError = error instanceof ApplicationError;

    return {
      success: false,
      error,
      recoveryAction: this.getRecoveryAction(error),
      shouldRetry: this.shouldRetry(error, 0),
      retryDelay: this.getRetryDelay(error, 0),
      metadata: {
        isDomainError,
        isApplicationError,
        context,
        timestamp: new Date().toISOString(),
      },
    };
  }

  public getRecoveryAction(error: Error): RecoveryAction {
    if (error instanceof DomainError) {
      switch (error.category) {
        case ErrorCategory.VALIDATION:
        case ErrorCategory.BUSINESS_RULE:
          return RecoveryAction.NONE;
        case ErrorCategory.NOT_FOUND:
          return RecoveryAction.FALLBACK;
        case ErrorCategory.PERMISSION:
          return RecoveryAction.ESCALATE;
        case ErrorCategory.CONCURRENCY:
          return RecoveryAction.RETRY;
        case ErrorCategory.EXTERNAL_SERVICE:
        case ErrorCategory.INFRASTRUCTURE:
          return RecoveryAction.RETRY;
        default:
          return RecoveryAction.ESCALATE;
      }
    }

    if (error instanceof ApplicationError) {
      return error.severity === ErrorSeverity.CRITICAL
        ? RecoveryAction.ESCALATE
        : RecoveryAction.RETRY;
    }

    return RecoveryAction.ESCALATE;
  }

  public shouldRetry(error: Error, attemptCount: number): boolean {
    if (attemptCount >= this.retryConfig.maxAttempts) {
      return false;
    }

    if (error instanceof DomainError) {
      return error.isRetryable();
    }

    if (error instanceof ApplicationError) {
      return error.severity !== ErrorSeverity.CRITICAL;
    }

    // 未知错误默认不重试
    return false;
  }

  public getRetryDelay(error: Error, attemptCount: number): number {
    let delay =
      this.retryConfig.baseDelay *
      Math.pow(this.retryConfig.backoffMultiplier, attemptCount);
    delay = Math.min(delay, this.retryConfig.maxDelay);

    if (this.retryConfig.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5); // 添加50%的随机抖动
    }

    return delay;
  }
}

/**
 * 领域错误处理策略
 */
export class DomainErrorHandlingStrategy implements ErrorHandlingStrategy {
  public canHandle(error: Error): boolean {
    return error instanceof DomainError;
  }

  public handle<T>(
    error: Error,
    context?: Record<string, unknown>
  ): ErrorHandlingResult<T> {
    const domainError = error as DomainError;

    return {
      success: false,
      error: domainError,
      recoveryAction: this.getRecoveryAction(domainError),
      shouldRetry: this.shouldRetry(domainError, 0),
      retryDelay: this.getRetryDelay(domainError, 0),
      metadata: {
        category: domainError.category,
        severity: domainError.severity,
        errorCode: domainError.errorCode,
        context: domainError.context,
        timestamp: domainError.timestamp.toISOString(),
      },
    };
  }

  public getRecoveryAction(error: Error): RecoveryAction {
    const domainError = error as DomainError;

    switch (domainError.severity) {
      case ErrorSeverity.LOW:
        return RecoveryAction.IGNORE;
      case ErrorSeverity.MEDIUM:
        return domainError.isRetryable()
          ? RecoveryAction.RETRY
          : RecoveryAction.NONE;
      case ErrorSeverity.HIGH:
        return RecoveryAction.COMPENSATE;
      case ErrorSeverity.CRITICAL:
        return RecoveryAction.ESCALATE;
      default:
        return RecoveryAction.ESCALATE;
    }
  }

  public shouldRetry(error: Error, attemptCount: number): boolean {
    const domainError = error as DomainError;
    return attemptCount < 3 && domainError.isRetryable();
  }

  public getRetryDelay(error: Error, attemptCount: number): number {
    return 1000 * Math.pow(2, attemptCount);
  }
}

/**
 * 默认错误映射器
 */
export class DefaultErrorMapper implements ErrorMapper {
  public mapToHttpStatus(error: Error): number {
    if (error instanceof DomainError) {
      switch (error.category) {
        case ErrorCategory.VALIDATION:
          return 400; // Bad Request
        case ErrorCategory.BUSINESS_RULE:
          return 422; // Unprocessable Entity
        case ErrorCategory.NOT_FOUND:
          return 404; // Not Found
        case ErrorCategory.PERMISSION:
          return 403; // Forbidden
        case ErrorCategory.CONCURRENCY:
          return 409; // Conflict
        case ErrorCategory.EXTERNAL_SERVICE:
        case ErrorCategory.INFRASTRUCTURE:
          return 503; // Service Unavailable
        default:
          return 500; // Internal Server Error
      }
    }

    if (error instanceof ApplicationError) {
      switch (error.severity) {
        case ErrorSeverity.LOW:
          return 400;
        case ErrorSeverity.MEDIUM:
          return 422;
        case ErrorSeverity.HIGH:
          return 500;
        case ErrorSeverity.CRITICAL:
          return 503;
        default:
          return 500;
      }
    }

    return 500; // Internal Server Error
  }

  public mapToUserMessage(error: Error): string {
    if (error instanceof DomainError) {
      return error.getUserFriendlyMessage();
    }

    if (error instanceof ApplicationError) {
      // 对于应用错误，返回通用消息避免暴露内部实现
      switch (error.severity) {
        case ErrorSeverity.LOW:
        case ErrorSeverity.MEDIUM:
          return "操作失败，请检查输入数据";
        case ErrorSeverity.HIGH:
        case ErrorSeverity.CRITICAL:
          return "系统暂时无法处理您的请求，请稍后重试";
        default:
          return "系统发生错误";
      }
    }

    return "系统发生未知错误";
  }

  public mapToApiResponse(error: Error): Record<string, unknown> {
    const baseResponse = {
      success: false,
      message: this.mapToUserMessage(error),
      timestamp: new Date().toISOString(),
    };

    if (error instanceof DomainError) {
      return {
        ...baseResponse,
        errorCode: error.errorCode,
        category: error.category,
        severity: error.severity,
        ...(error instanceof ValidationError && error.hasFieldErrors()
          ? {
              fieldErrors: error.fieldErrors,
            }
          : {}),
      };
    }

    if (error instanceof ApplicationError) {
      return {
        ...baseResponse,
        errorCode: error.errorCode,
        severity: error.severity,
      };
    }

    return {
      ...baseResponse,
      errorCode: "UNKNOWN_ERROR",
    };
  }

  public mapToLogLevel(error: Error): "debug" | "info" | "warn" | "error" {
    if (error instanceof DomainError || error instanceof ApplicationError) {
      switch (error.severity) {
        case ErrorSeverity.LOW:
          return "info";
        case ErrorSeverity.MEDIUM:
          return "warn";
        case ErrorSeverity.HIGH:
          return "error";
        case ErrorSeverity.CRITICAL:
          return "error";
        default:
          return "error";
      }
    }

    return "error";
  }
}

/**
 * 错误处理器
 */
export class ErrorHandler {
  private readonly strategies: ErrorHandlingStrategy[] = [];
  private readonly mapper: ErrorMapper;

  constructor(
    strategies: ErrorHandlingStrategy[] = [],
    mapper: ErrorMapper = new DefaultErrorMapper()
  ) {
    this.strategies = [
      ...strategies,
      new DomainErrorHandlingStrategy(),
      new DefaultErrorHandlingStrategy(),
    ];
    this.mapper = mapper;
  }

  /**
   * 处理错误
   */
  public handle<T>(
    error: Error,
    context?: Record<string, unknown>
  ): ErrorHandlingResult<T> {
    const strategy = this.strategies.find((s) => s.canHandle(error));
    if (!strategy) {
      throw new Error(
        `No error handling strategy found for error: ${error.constructor.name}`
      );
    }

    return strategy.handle<T>(error, context);
  }

  /**
   * 映射错误到HTTP响应
   */
  public mapToHttpResponse(error: Error): {
    status: number;
    body: Record<string, unknown>;
    logLevel: string;
  } {
    return {
      status: this.mapper.mapToHttpStatus(error),
      body: this.mapper.mapToApiResponse(error),
      logLevel: this.mapper.mapToLogLevel(error),
    };
  }

  /**
   * 执行带重试的操作
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<ErrorHandlingResult<T>> {
    let lastError: Error | undefined;
    let attemptCount = 0;

    while (true) {
      try {
        const result = await operation();
        return {
          success: true,
          data: result,
          metadata: {
            attemptCount,
            context,
          },
        };
      } catch (error) {
        lastError = error as Error;
        attemptCount++;

        const handlingResult = this.handle(lastError, context);

        if (
          !handlingResult.shouldRetry ||
          !this.shouldRetry(lastError, attemptCount)
        ) {
          return {
            success: false,
            error: lastError,
            recoveryAction:
              handlingResult.recoveryAction || RecoveryAction.NONE,
            metadata: {
              attemptCount,
              context,
              finalAttempt: true,
            },
          };
        }

        // 等待重试延迟
        if (handlingResult.retryDelay && handlingResult.retryDelay > 0) {
          await this.delay(handlingResult.retryDelay);
        }
      }
    }
  }

  /**
   * 检查是否应该重试
   */
  private shouldRetry(error: Error, attemptCount: number): boolean {
    const strategy = this.strategies.find((s) => s.canHandle(error));
    return strategy ? strategy.shouldRetry(error, attemptCount) : false;
  }

  /**
   * 延迟工具方法
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 全局错误处理器实例
 */
export const globalErrorHandler = new ErrorHandler();
