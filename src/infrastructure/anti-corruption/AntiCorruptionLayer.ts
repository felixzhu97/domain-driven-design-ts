/**
 * 防腐层(Anti-Corruption Layer)
 *
 * 为外部系统集成提供隔离层，防止外部系统的模型和变化
 * 对内部领域模型造成腐蚀影响。
 */

import { EntityId } from "../../shared/types";

/**
 * 防腐层配置
 */
export interface AntiCorruptionLayerConfig {
  /** 外部系统名称 */
  readonly externalSystemName: string;
  /** 基础URL */
  readonly baseUrl: string;
  /** 认证信息 */
  readonly authentication: {
    readonly type: "API_KEY" | "OAUTH2" | "BASIC" | "BEARER";
    readonly credentials: Record<string, string>;
  };
  /** 超时配置 */
  readonly timeout: {
    readonly connect: number; // 连接超时(毫秒)
    readonly read: number; // 读取超时(毫秒)
    readonly write: number; // 写入超时(毫秒)
  };
  /** 重试策略 */
  readonly retryPolicy: {
    readonly maxAttempts: number;
    readonly baseDelay: number; // 基础延迟(毫秒)
    readonly maxDelay: number; // 最大延迟(毫秒)
    readonly backoffMultiplier: number; // 指数退避乘数
    readonly retryableErrors: string[]; // 可重试的错误类型
  };
  /** 缓存配置 */
  readonly cache?: {
    readonly enabled: boolean;
    readonly ttl: number; // 缓存时间(秒)
    readonly maxSize: number; // 最大缓存数量
  };
  /** 监控配置 */
  readonly monitoring: {
    readonly enabled: boolean;
    readonly metricsCollectionInterval: number; // 指标收集间隔(秒)
    readonly alertThresholds: {
      readonly errorRate: number; // 错误率阈值
      readonly latency: number; // 延迟阈值(毫秒)
    };
  };
}

/**
 * 外部系统调用结果
 */
export interface ExternalSystemResponse<T> {
  /** 是否成功 */
  readonly success: boolean;
  /** 响应数据 */
  readonly data?: T;
  /** 错误信息 */
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
  /** 响应元数据 */
  readonly metadata: {
    readonly requestId: string;
    readonly timestamp: Date;
    readonly latency: number; // 响应时间(毫秒)
    readonly retryCount: number; // 重试次数
    readonly fromCache: boolean; // 是否来自缓存
  };
}

/**
 * 数据转换器接口
 */
export interface DataTransformer<TInternal, TExternal> {
  /** 将内部模型转换为外部模型 */
  toExternal(internal: TInternal): TExternal;

  /** 将外部模型转换为内部模型 */
  fromExternal(external: TExternal): TInternal;

  /** 验证外部数据格式 */
  validateExternal(external: unknown): external is TExternal;

  /** 验证内部数据格式 */
  validateInternal(internal: unknown): internal is TInternal;
}

/**
 * 防腐层适配器抽象基类
 */
export abstract class AntiCorruptionLayerAdapter<TInternal, TExternal> {
  protected readonly config: AntiCorruptionLayerConfig;
  protected readonly transformer: DataTransformer<TInternal, TExternal>;
  private readonly cache: Map<string, { data: TExternal; timestamp: Date }>;
  private readonly metrics: {
    requestCount: number;
    errorCount: number;
    totalLatency: number;
    cacheHits: number;
    cacheMisses: number;
  };

  constructor(
    config: AntiCorruptionLayerConfig,
    transformer: DataTransformer<TInternal, TExternal>
  ) {
    this.config = config;
    this.transformer = transformer;
    this.cache = new Map();
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      totalLatency: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * 执行外部系统调用
   */
  protected async executeExternalCall<TResult>(
    operation: string,
    callFn: () => Promise<TResult>,
    cacheKey?: string
  ): Promise<ExternalSystemResponse<TResult>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    let retryCount = 0;

    // 检查缓存
    if (cacheKey && this.config.cache?.enabled) {
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return {
          success: true,
          data: cached as TResult,
          metadata: {
            requestId,
            timestamp: new Date(),
            latency: Date.now() - startTime,
            retryCount: 0,
            fromCache: true,
          },
        };
      }
      this.metrics.cacheMisses++;
    }

    // 执行外部调用（带重试）
    while (retryCount <= this.config.retryPolicy.maxAttempts) {
      try {
        const result = await this.executeWithTimeout(callFn);

        // 更新指标
        this.updateMetrics(Date.now() - startTime, false);

        // 缓存结果
        if (cacheKey && this.config.cache?.enabled) {
          this.setCachedData(cacheKey, result);
        }

        return {
          success: true,
          data: result,
          metadata: {
            requestId,
            timestamp: new Date(),
            latency: Date.now() - startTime,
            retryCount,
            fromCache: false,
          },
        };
      } catch (error) {
        retryCount++;

        // 检查是否应该重试
        if (
          retryCount > this.config.retryPolicy.maxAttempts ||
          !this.isRetryableError(error)
        ) {
          this.updateMetrics(Date.now() - startTime, true);

          return {
            success: false,
            error: {
              code: this.getErrorCode(error),
              message: this.getErrorMessage(error),
              details: this.getErrorDetails(error),
            },
            metadata: {
              requestId,
              timestamp: new Date(),
              latency: Date.now() - startTime,
              retryCount: retryCount - 1,
              fromCache: false,
            },
          };
        }

        // 等待重试
        await this.delay(this.calculateRetryDelay(retryCount));
      }
    }

    // 这里不应该到达，但为了类型安全
    throw new Error("Unexpected error in retry logic");
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout<TResult>(
    callFn: () => Promise<TResult>
  ): Promise<TResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`Operation timeout after ${this.config.timeout.read}ms`)
        );
      }, this.config.timeout.read);
    });

    return Promise.race([callFn(), timeoutPromise]);
  }

  /**
   * 获取缓存数据
   */
  private getCachedData(key: string): TExternal | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = new Date();
    const ttlMs = (this.config.cache?.ttl ?? 300) * 1000; // 默认5分钟

    if (now.getTime() - cached.timestamp.getTime() > ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 设置缓存数据
   */
  private setCachedData(key: string, data: unknown): void {
    const cache = this.config.cache;
    if (!cache?.enabled) return;

    // 检查缓存大小限制
    if (this.cache.size >= cache.maxSize) {
      // 删除最旧的缓存项
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data: data as TExternal,
      timestamp: new Date(),
    });
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.config.retryPolicy.baseDelay;
    const maxDelay = this.config.retryPolicy.maxDelay;
    const multiplier = this.config.retryPolicy.backoffMultiplier;

    const delay = Math.min(
      baseDelay * Math.pow(multiplier, retryCount),
      maxDelay
    );

    // 添加随机抖动（±25%）
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.max(0, delay + jitter);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: unknown): boolean {
    const errorCode = this.getErrorCode(error);
    return this.config.retryPolicy.retryableErrors.includes(errorCode);
  }

  /**
   * 更新指标
   */
  private updateMetrics(latency: number, isError: boolean): void {
    this.metrics.requestCount++;
    this.metrics.totalLatency += latency;

    if (isError) {
      this.metrics.errorCount++;
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `${this.config.externalSystemName}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * 获取性能指标
   */
  public getMetrics(): {
    requestCount: number;
    errorRate: number;
    averageLatency: number;
    cacheHitRate: number;
    lastResetTime: Date;
  } {
    const totalCacheRequests =
      this.metrics.cacheHits + this.metrics.cacheMisses;

    return {
      requestCount: this.metrics.requestCount,
      errorRate:
        this.metrics.requestCount > 0
          ? this.metrics.errorCount / this.metrics.requestCount
          : 0,
      averageLatency:
        this.metrics.requestCount > 0
          ? this.metrics.totalLatency / this.metrics.requestCount
          : 0,
      cacheHitRate:
        totalCacheRequests > 0
          ? this.metrics.cacheHits / totalCacheRequests
          : 0,
      lastResetTime: new Date(),
    };
  }

  /**
   * 重置指标
   */
  public resetMetrics(): void {
    this.metrics.requestCount = 0;
    this.metrics.errorCount = 0;
    this.metrics.totalLatency = 0;
    this.metrics.cacheHits = 0;
    this.metrics.cacheMisses = 0;
  }

  /**
   * 清空缓存
   */
  public clearCache(): void {
    this.cache.clear();
  }

  // 抽象方法，由子类实现
  protected abstract getErrorCode(error: unknown): string;
  protected abstract getErrorMessage(error: unknown): string;
  protected abstract getErrorDetails(error: unknown): Record<string, unknown>;
}

/**
 * 防腐层管理器
 */
export class AntiCorruptionLayerManager {
  private static instance: AntiCorruptionLayerManager;
  private readonly adapters: Map<
    string,
    AntiCorruptionLayerAdapter<unknown, unknown>
  >;

  private constructor() {
    this.adapters = new Map();
  }

  public static getInstance(): AntiCorruptionLayerManager {
    if (!AntiCorruptionLayerManager.instance) {
      AntiCorruptionLayerManager.instance = new AntiCorruptionLayerManager();
    }
    return AntiCorruptionLayerManager.instance;
  }

  /**
   * 注册适配器
   */
  public registerAdapter<TInternal, TExternal>(
    name: string,
    adapter: AntiCorruptionLayerAdapter<TInternal, TExternal>
  ): void {
    this.adapters.set(
      name,
      adapter as AntiCorruptionLayerAdapter<unknown, unknown>
    );
  }

  /**
   * 获取适配器
   */
  public getAdapter<TInternal, TExternal>(
    name: string
  ): AntiCorruptionLayerAdapter<TInternal, TExternal> | undefined {
    return this.adapters.get(name) as AntiCorruptionLayerAdapter<
      TInternal,
      TExternal
    >;
  }

  /**
   * 获取所有适配器的指标
   */
  public getAllMetrics(): Record<
    string,
    ReturnType<AntiCorruptionLayerAdapter<unknown, unknown>["getMetrics"]>
  > {
    const metrics: Record<
      string,
      ReturnType<AntiCorruptionLayerAdapter<unknown, unknown>["getMetrics"]>
    > = {};

    for (const [name, adapter] of this.adapters) {
      metrics[name] = adapter.getMetrics();
    }

    return metrics;
  }

  /**
   * 健康检查
   */
  public async healthCheck(): Promise<
    Record<string, { healthy: boolean; error?: string }>
  > {
    const results: Record<string, { healthy: boolean; error?: string }> = {};

    for (const [name, adapter] of this.adapters) {
      try {
        const metrics = adapter.getMetrics();
        // 简单的健康检查逻辑
        const healthy =
          metrics.errorRate < 0.1 && metrics.averageLatency < 5000;
        results[name] = { healthy };
      } catch (error) {
        results[name] = {
          healthy: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    return results;
  }
}
