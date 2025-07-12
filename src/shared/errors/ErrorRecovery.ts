/**
 * 错误恢复机制和补偿策略
 * 提供自动恢复、补偿操作和故障转移功能
 */

import { DomainError, ErrorSeverity, ErrorCategory } from "./DomainError";
import { ApplicationError } from "./ApplicationError";

/**
 * 恢复操作结果
 */
export interface RecoveryResult<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: Error;
  readonly strategyUsed: string;
  readonly executionTime: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * 恢复策略接口
 */
export interface RecoveryStrategy<T = unknown> {
  readonly name: string;
  canRecover(error: Error, context?: Record<string, unknown>): boolean;
  recover(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult<T>>;
}

/**
 * 补偿操作接口
 */
export interface CompensationAction<T = unknown> {
  readonly name: string;
  readonly description: string;
  execute(context: Record<string, unknown>): Promise<T>;
  rollback?(context: Record<string, unknown>): Promise<void>;
}

/**
 * 回退值恢复策略
 */
export class FallbackValueStrategy<T> implements RecoveryStrategy<T> {
  public readonly name = "FallbackValue";

  constructor(
    private readonly fallbackValue: T,
    private readonly condition?: (error: Error) => boolean
  ) {}

  public canRecover(error: Error, context?: Record<string, unknown>): boolean {
    if (this.condition) {
      return this.condition(error);
    }

    // 默认对非严重错误提供回退值
    if (error instanceof DomainError) {
      return (
        error.severity === ErrorSeverity.LOW ||
        error.severity === ErrorSeverity.MEDIUM
      );
    }

    return false;
  }

  public async recover(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now();

    try {
      return {
        success: true,
        data: this.fallbackValue,
        strategyUsed: this.name,
        executionTime: Date.now() - startTime,
        metadata: {
          originalError: error.message,
          context,
        },
      };
    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError as Error,
        strategyUsed: this.name,
        executionTime: Date.now() - startTime,
        metadata: {
          originalError: error.message,
          context,
        },
      };
    }
  }
}

/**
 * 缓存恢复策略
 */
export class CacheRecoveryStrategy<T> implements RecoveryStrategy<T> {
  public readonly name = "Cache";

  constructor(
    private readonly cache: Map<
      string,
      { value: T; timestamp: number; ttl: number }
    >,
    private readonly keyGenerator: (context: Record<string, unknown>) => string,
    private readonly defaultTtl: number = 300000 // 5分钟
  ) {}

  public canRecover(error: Error, context?: Record<string, unknown>): boolean {
    if (!context) return false;

    const key = this.keyGenerator(context);
    const cached = this.cache.get(key);

    if (!cached) return false;

    // 检查缓存是否过期
    return Date.now() - cached.timestamp < cached.ttl;
  }

  public async recover(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now();

    if (!context) {
      return {
        success: false,
        error: new Error("Context required for cache recovery"),
        strategyUsed: this.name,
        executionTime: Date.now() - startTime,
      };
    }

    const key = this.keyGenerator(context);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return {
        success: true,
        data: cached.value,
        strategyUsed: this.name,
        executionTime: Date.now() - startTime,
        metadata: {
          cacheKey: key,
          cacheAge: Date.now() - cached.timestamp,
          originalError: error.message,
        },
      };
    }

    return {
      success: false,
      error: new Error("No valid cache entry found"),
      strategyUsed: this.name,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 添加缓存条目
   */
  public setCacheEntry(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    });
  }

  /**
   * 清除过期缓存
   */
  public cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= cached.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * 降级服务恢复策略
 */
export class DegradedServiceStrategy<T> implements RecoveryStrategy<T> {
  public readonly name = "DegradedService";

  constructor(
    private readonly degradedOperation: (
      context?: Record<string, unknown>
    ) => Promise<T>,
    private readonly serviceCondition?: (error: Error) => boolean
  ) {}

  public canRecover(error: Error, context?: Record<string, unknown>): boolean {
    if (this.serviceCondition) {
      return this.serviceCondition(error);
    }

    // 默认对外部服务错误提供降级服务
    if (error instanceof DomainError) {
      return error.category === ErrorCategory.EXTERNAL_SERVICE;
    }

    return false;
  }

  public async recover(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now();

    try {
      const result = await this.degradedOperation(context);
      return {
        success: true,
        data: result,
        strategyUsed: this.name,
        executionTime: Date.now() - startTime,
        metadata: {
          originalError: error.message,
          serviceMode: "degraded",
          context,
        },
      };
    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError as Error,
        strategyUsed: this.name,
        executionTime: Date.now() - startTime,
        metadata: {
          originalError: error.message,
          context,
        },
      };
    }
  }
}

/**
 * 补偿操作策略
 */
export class CompensationStrategy<T> implements RecoveryStrategy<T> {
  public readonly name = "Compensation";

  constructor(
    private readonly compensationActions: CompensationAction<T>[],
    private readonly condition?: (error: Error) => boolean
  ) {}

  public canRecover(error: Error, context?: Record<string, unknown>): boolean {
    if (this.condition) {
      return this.condition(error);
    }

    // 默认对并发冲突错误执行补偿
    if (error instanceof DomainError) {
      return error.category === ErrorCategory.CONCURRENCY;
    }

    return false;
  }

  public async recover(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now();
    const executedActions: string[] = [];

    try {
      let lastResult: T | undefined;

      for (const action of this.compensationActions) {
        try {
          lastResult = await action.execute(context || {});
          executedActions.push(action.name);
        } catch (actionError) {
          // 如果某个补偿操作失败，尝试回滚已执行的操作
          await this.rollbackActions(executedActions, context || {});

          return {
            success: false,
            error: actionError as Error,
            strategyUsed: this.name,
            executionTime: Date.now() - startTime,
            metadata: {
              originalError: error.message,
              failedAction: action.name,
              executedActions,
              context,
            },
          };
        }
      }

      return {
        success: true,
        data: lastResult as T,
        strategyUsed: this.name,
        executionTime: Date.now() - startTime,
        metadata: {
          originalError: error.message,
          executedActions,
          context,
        },
      };
    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError as Error,
        strategyUsed: this.name,
        executionTime: Date.now() - startTime,
        metadata: {
          originalError: error.message,
          executedActions,
          context,
        },
      };
    }
  }

  /**
   * 回滚已执行的补偿操作
   */
  private async rollbackActions(
    executedActionNames: string[],
    context: Record<string, unknown>
  ): Promise<void> {
    // 按相反顺序回滚
    for (let i = executedActionNames.length - 1; i >= 0; i--) {
      const actionName = executedActionNames[i];
      const action = this.compensationActions.find(
        (a) => a.name === actionName
      );

      if (action?.rollback) {
        try {
          await action.rollback(context);
        } catch (rollbackError) {
          // 记录回滚错误但继续处理其他回滚操作
          console.error(
            `Failed to rollback action ${actionName}:`,
            rollbackError
          );
        }
      }
    }
  }
}

/**
 * 错误恢复管理器
 */
export class ErrorRecoveryManager {
  private readonly strategies: RecoveryStrategy[] = [];

  constructor(strategies: RecoveryStrategy[] = []) {
    this.strategies = strategies;
  }

  /**
   * 添加恢复策略
   */
  public addStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * 移除恢复策略
   */
  public removeStrategy(strategyName: string): void {
    const index = this.strategies.findIndex((s) => s.name === strategyName);
    if (index >= 0) {
      this.strategies.splice(index, 1);
    }
  }

  /**
   * 尝试恢复错误
   */
  public async recover<T>(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult<T> | undefined> {
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error, context)) {
        try {
          const result = await strategy.recover(error, context);
          if (result.success) {
            return result as RecoveryResult<T>;
          }
        } catch (strategyError) {
          // 记录策略执行错误但继续尝试其他策略
          console.error(
            `Recovery strategy ${strategy.name} failed:`,
            strategyError
          );
        }
      }
    }

    return undefined;
  }

  /**
   * 获取可用的恢复策略
   */
  public getAvailableStrategies(
    error: Error,
    context?: Record<string, unknown>
  ): string[] {
    return this.strategies
      .filter((s) => s.canRecover(error, context))
      .map((s) => s.name);
  }

  /**
   * 获取所有策略名称
   */
  public getAllStrategyNames(): string[] {
    return this.strategies.map((s) => s.name);
  }
}

/**
 * 预定义的补偿操作
 */
export class PredefinedCompensationActions {
  /**
   * 数据回滚补偿操作
   */
  public static createDataRollbackAction<T>(
    rollbackOperation: (context: Record<string, unknown>) => Promise<T>
  ): CompensationAction<T> {
    return {
      name: "DataRollback",
      description: "Rollback data changes",
      execute: rollbackOperation,
      rollback: async () => {
        // 数据回滚操作通常不需要再次回滚
      },
    };
  }

  /**
   * 消息发送补偿操作
   */
  public static createMessageCompensationAction<T>(
    sendCompensationMessage: (context: Record<string, unknown>) => Promise<T>
  ): CompensationAction<T> {
    return {
      name: "MessageCompensation",
      description: "Send compensation message",
      execute: sendCompensationMessage,
    };
  }

  /**
   * 资源清理补偿操作
   */
  public static createResourceCleanupAction<T>(
    cleanupOperation: (context: Record<string, unknown>) => Promise<T>
  ): CompensationAction<T> {
    return {
      name: "ResourceCleanup",
      description: "Clean up allocated resources",
      execute: cleanupOperation,
    };
  }
}
