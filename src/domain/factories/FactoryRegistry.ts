/**
 * 工厂注册器
 * 提供统一的工厂管理和定位服务，支持工厂的注册、查找和生命周期管理
 */

import { AggregateRoot } from "../entities/AggregateRoot";
import {
  IDomainFactory,
  IAggregateFactory,
  FactoryError,
} from "./DomainFactory";
import { UserFactory } from "./UserFactory";
import { ProductFactory } from "./ProductFactory";
import { OrderFactory } from "./OrderFactory";

/**
 * 工厂配置接口
 */
export interface FactoryConfig {
  readonly singleton?: boolean;
  readonly lazy?: boolean;
  readonly dependencies?: string[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * 工厂注册信息
 */
interface FactoryRegistration<T = unknown, TData = unknown> {
  readonly factory: IDomainFactory<T, TData> | (() => IDomainFactory<T, TData>);
  readonly config: FactoryConfig;
  readonly registeredAt: Date;
  instance?: IDomainFactory<T, TData>;
}

/**
 * 工厂统计信息
 */
export interface FactoryStatistics {
  readonly totalFactories: number;
  readonly activeFactories: number;
  readonly lazyFactories: number;
  readonly singletonFactories: number;
  readonly factoryTypes: readonly string[];
  readonly registrationHistory: readonly {
    readonly entityType: string;
    readonly registeredAt: string;
    readonly config: FactoryConfig;
  }[];
}

/**
 * 工厂注册器
 */
export class FactoryRegistry {
  private readonly factories = new Map<string, FactoryRegistration>();
  private static instance?: FactoryRegistry;

  private constructor() {
    this.registerDefaultFactories();
  }

  /**
   * 获取注册器单例实例
   */
  public static getInstance(): FactoryRegistry {
    if (!FactoryRegistry.instance) {
      FactoryRegistry.instance = new FactoryRegistry();
    }
    return FactoryRegistry.instance;
  }

  /**
   * 注册工厂
   */
  public register<T, TData = unknown>(
    entityType: string,
    factory: IDomainFactory<T, TData> | (() => IDomainFactory<T, TData>),
    config: FactoryConfig = {}
  ): void {
    if (this.factories.has(entityType)) {
      throw new FactoryError(
        `Factory for entity type '${entityType}' is already registered`,
        entityType
      );
    }

    const registration: FactoryRegistration<T, TData> = {
      factory,
      config: {
        singleton: true,
        lazy: false,
        dependencies: [],
        ...config,
      },
      registeredAt: new Date(),
    };

    this.factories.set(entityType, registration);

    // 如果不是懒加载，立即创建实例
    if (!registration.config.lazy) {
      this.getInstance(entityType);
    }
  }

  /**
   * 获取工厂实例
   */
  public getFactory<T, TData = unknown>(
    entityType: string
  ): IDomainFactory<T, TData> {
    return this.getInstance<T, TData>(entityType);
  }

  /**
   * 获取聚合工厂实例
   */
  public getAggregateFactory<T extends AggregateRoot, TData = unknown>(
    entityType: string
  ): IAggregateFactory<T, TData> {
    const factory = this.getInstance<T, TData>(entityType);

    if (!this.isAggregateFactory(factory)) {
      throw new FactoryError(
        `Factory for entity type '${entityType}' is not an aggregate factory`,
        entityType
      );
    }

    return factory;
  }

  /**
   * 检查工厂是否已注册
   */
  public hasFactory(entityType: string): boolean {
    return this.factories.has(entityType);
  }

  /**
   * 注销工厂
   */
  public unregister(entityType: string): void {
    if (!this.factories.has(entityType)) {
      throw new FactoryError(
        `Factory for entity type '${entityType}' is not registered`,
        entityType
      );
    }

    this.factories.delete(entityType);
  }

  /**
   * 获取所有已注册的实体类型
   */
  public getRegisteredEntityTypes(): readonly string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * 获取工厂统计信息
   */
  public getStatistics(): FactoryStatistics {
    const registrations = Array.from(this.factories.values());

    return {
      totalFactories: registrations.length,
      activeFactories: registrations.filter((r) => r.instance !== undefined)
        .length,
      lazyFactories: registrations.filter((r) => r.config.lazy).length,
      singletonFactories: registrations.filter((r) => r.config.singleton)
        .length,
      factoryTypes: Array.from(this.factories.keys()),
      registrationHistory: registrations.map((r) => ({
        entityType: this.getEntityTypeByRegistration(r),
        registeredAt: r.registeredAt.toISOString(),
        config: r.config,
      })),
    };
  }

  /**
   * 清除所有工厂（主要用于测试）
   */
  public clear(): void {
    this.factories.clear();
  }

  /**
   * 重置注册器（主要用于测试）
   */
  public reset(): void {
    this.clear();
    this.registerDefaultFactories();
  }

  /**
   * 验证工厂依赖关系
   */
  public validateDependencies(): string[] {
    const errors: string[] = [];

    for (const [entityType, registration] of this.factories) {
      if (registration.config.dependencies) {
        for (const dependency of registration.config.dependencies) {
          if (!this.hasFactory(dependency)) {
            errors.push(
              `Factory '${entityType}' depends on '${dependency}' which is not registered`
            );
          }
        }
      }
    }

    return errors;
  }

  /**
   * 获取工厂配置
   */
  public getFactoryConfig(entityType: string): FactoryConfig | undefined {
    const registration = this.factories.get(entityType);
    return registration?.config;
  }

  /**
   * 预热所有懒加载工厂
   */
  public warmUp(): void {
    for (const [entityType, registration] of this.factories) {
      if (registration.config.lazy && !registration.instance) {
        this.getInstance(entityType);
      }
    }
  }

  /**
   * 获取工厂实例的内部方法
   */
  private getInstance<T, TData = unknown>(
    entityType: string
  ): IDomainFactory<T, TData> {
    const registration = this.factories.get(entityType);

    if (!registration) {
      throw new FactoryError(
        `Factory for entity type '${entityType}' is not registered`,
        entityType
      );
    }

    // 如果是单例模式且已有实例，直接返回
    if (registration.config.singleton && registration.instance) {
      return registration.instance as IDomainFactory<T, TData>;
    }

    // 创建新实例
    let factoryInstance: IDomainFactory<T, TData>;

    if (typeof registration.factory === "function") {
      factoryInstance = registration.factory() as IDomainFactory<T, TData>;
    } else {
      factoryInstance = registration.factory as IDomainFactory<T, TData>;
    }

    // 验证工厂实例
    if (
      !factoryInstance ||
      typeof factoryInstance.createFromData !== "function"
    ) {
      throw new FactoryError(
        `Invalid factory instance for entity type '${entityType}'`,
        entityType
      );
    }

    // 如果是单例模式，缓存实例
    if (registration.config.singleton) {
      (registration as any).instance = factoryInstance;
    }

    return factoryInstance;
  }

  /**
   * 检查是否为聚合工厂
   */
  private isAggregateFactory<T, TData = unknown>(
    factory: IDomainFactory<T, TData>
  ): factory is IAggregateFactory<T & AggregateRoot, TData> {
    return (
      typeof (factory as any).reconstituteFromEvents === "function" &&
      typeof (factory as any).createFromSnapshot === "function"
    );
  }

  /**
   * 根据注册信息获取实体类型
   */
  private getEntityTypeByRegistration(
    registration: FactoryRegistration
  ): string {
    for (const [entityType, reg] of this.factories) {
      if (reg === registration) {
        return entityType;
      }
    }
    return "Unknown";
  }

  /**
   * 注册默认工厂
   */
  private registerDefaultFactories(): void {
    // 注册用户工厂
    this.register("User", () => new UserFactory(), {
      singleton: true,
      lazy: false,
    });

    // 注册产品工厂
    this.register("Product", () => new ProductFactory(), {
      singleton: true,
      lazy: false,
    });

    // 注册订单工厂
    this.register("Order", () => new OrderFactory(), {
      singleton: true,
      lazy: false,
      dependencies: ["User", "Product"],
    });
  }
}

/**
 * 工厂定位器 - 提供更简洁的工厂访问接口
 */
export class FactoryLocator {
  private static registry = FactoryRegistry.getInstance();

  /**
   * 获取用户工厂
   */
  public static getUserFactory(): UserFactory {
    return FactoryLocator.registry.getAggregateFactory("User") as UserFactory;
  }

  /**
   * 获取产品工厂
   */
  public static getProductFactory(): ProductFactory {
    return FactoryLocator.registry.getAggregateFactory(
      "Product"
    ) as ProductFactory;
  }

  /**
   * 获取订单工厂
   */
  public static getOrderFactory(): OrderFactory {
    return FactoryLocator.registry.getAggregateFactory("Order") as OrderFactory;
  }

  /**
   * 获取通用工厂
   */
  public static getFactory<T, TData = unknown>(
    entityType: string
  ): IDomainFactory<T, TData> {
    return FactoryLocator.registry.getFactory<T, TData>(entityType);
  }

  /**
   * 获取聚合工厂
   */
  public static getAggregateFactory<T extends AggregateRoot, TData = unknown>(
    entityType: string
  ): IAggregateFactory<T, TData> {
    return FactoryLocator.registry.getAggregateFactory<T, TData>(entityType);
  }
}

/**
 * 导出默认注册器实例
 */
export const factoryRegistry = FactoryRegistry.getInstance();
