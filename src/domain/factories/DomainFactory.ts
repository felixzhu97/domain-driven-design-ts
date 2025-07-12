/**
 * 领域工厂模式 - 基础工厂接口和抽象类
 * 用于封装复杂聚合根的创建逻辑，确保对象创建的一致性和不变性
 */

import { AggregateRoot } from "../entities/AggregateRoot";

/**
 * 工厂创建选项
 */
export interface FactoryOptions {
  /** 是否验证创建的对象 */
  readonly validate?: boolean;
  /** 创建上下文信息 */
  readonly context?: Record<string, unknown>;
  /** 是否应用默认值 */
  readonly applyDefaults?: boolean;
}

/**
 * 工厂创建结果
 */
export interface FactoryResult<T> {
  /** 创建的实体 */
  readonly entity: T;
  /** 创建过程中的警告信息 */
  readonly warnings: string[];
  /** 创建元数据 */
  readonly metadata: Record<string, unknown>;
}

/**
 * 领域工厂接口
 */
export interface IDomainFactory<T, TData = unknown> {
  /**
   * 从数据创建实体
   */
  createFromData(data: TData, options?: FactoryOptions): FactoryResult<T>;

  /**
   * 创建默认实体
   */
  createDefault(options?: FactoryOptions): FactoryResult<T>;

  /**
   * 验证创建数据
   */
  validateCreateData(data: TData): string[];

  /**
   * 获取工厂支持的实体类型
   */
  getSupportedEntityType(): string;
}

/**
 * 聚合工厂接口
 */
export interface IAggregateFactory<T extends AggregateRoot, TData = unknown>
  extends IDomainFactory<T, TData> {
  /**
   * 重建聚合（用于事件溯源）
   */
  reconstituteFromEvents(events: readonly unknown[]): FactoryResult<T>;

  /**
   * 从快照创建聚合
   */
  createFromSnapshot(snapshot: unknown): FactoryResult<T>;
}

/**
 * 工厂错误
 */
export class FactoryError extends Error {
  constructor(
    message: string,
    public readonly factoryType: string,
    public readonly validationErrors: string[] = []
  ) {
    super(message);
    this.name = "FactoryError";
  }
}

/**
 * 验证错误
 */
export class FactoryValidationError extends FactoryError {
  constructor(factoryType: string, validationErrors: string[]) {
    super(
      `Factory validation failed for ${factoryType}: ${validationErrors.join(
        ", "
      )}`,
      factoryType,
      validationErrors
    );
    this.name = "FactoryValidationError";
  }
}

/**
 * 抽象领域工厂基类
 */
export abstract class AbstractDomainFactory<T, TData = unknown>
  implements IDomainFactory<T, TData>
{
  protected constructor(protected readonly entityType: string) {}

  public createFromData(
    data: TData,
    options: FactoryOptions = {}
  ): FactoryResult<T> {
    const effectiveOptions = {
      validate: true,
      applyDefaults: true,
      ...options,
    };

    // 验证数据
    if (effectiveOptions.validate) {
      const validationErrors = this.validateCreateData(data);
      if (validationErrors.length > 0) {
        throw new FactoryValidationError(this.entityType, validationErrors);
      }
    }

    // 应用默认值
    const processedData = effectiveOptions.applyDefaults
      ? this.applyDefaults(data)
      : data;

    // 创建实体
    const entity = this.doCreate(processedData, effectiveOptions);

    // 收集警告
    const warnings = this.collectWarnings(processedData, effectiveOptions);

    // 创建元数据
    const metadata = this.createMetadata(processedData, effectiveOptions);

    return {
      entity,
      warnings,
      metadata,
    };
  }

  public abstract createDefault(options?: FactoryOptions): FactoryResult<T>;

  public abstract validateCreateData(data: TData): string[];

  public getSupportedEntityType(): string {
    return this.entityType;
  }

  /**
   * 执行实际的创建逻辑
   */
  protected abstract doCreate(data: TData, options: FactoryOptions): T;

  /**
   * 应用默认值
   */
  protected abstract applyDefaults(data: TData): TData;

  /**
   * 收集创建警告
   */
  protected collectWarnings(data: TData, options: FactoryOptions): string[] {
    return [];
  }

  /**
   * 创建元数据
   */
  protected createMetadata(
    data: TData,
    options: FactoryOptions
  ): Record<string, unknown> {
    return {
      createdAt: new Date().toISOString(),
      factoryType: this.entityType,
      options,
    };
  }
}

/**
 * 抽象聚合工厂基类
 */
export abstract class AbstractAggregateFactory<
    T extends AggregateRoot,
    TData = unknown
  >
  extends AbstractDomainFactory<T, TData>
  implements IAggregateFactory<T, TData>
{
  public abstract reconstituteFromEvents(
    events: readonly unknown[]
  ): FactoryResult<T>;

  public abstract createFromSnapshot(snapshot: unknown): FactoryResult<T>;

  /**
   * 验证事件序列
   */
  protected validateEventSequence(events: readonly unknown[]): string[] {
    const errors: string[] = [];

    if (events.length === 0) {
      errors.push("Event sequence cannot be empty");
    }

    // 可以添加更多事件序列验证逻辑
    return errors;
  }

  /**
   * 验证快照数据
   */
  protected validateSnapshotData(snapshot: unknown): string[] {
    const errors: string[] = [];

    if (!snapshot) {
      errors.push("Snapshot data cannot be null or undefined");
    }

    // 可以添加更多快照验证逻辑
    return errors;
  }
}
