/**
 * 产品聚合工厂
 * 处理产品聚合的创建、重建和验证逻辑
 */

import { Product, ProductProps, ProductStatus } from "../entities/Product";
import { Money } from "../value-objects/Money";
import { ProductCategory } from "../value-objects/ProductCategory";
import { EntityId } from "../../shared/types";
import {
  ProductCreatedEvent,
  ProductPriceChangedEvent,
  ProductDeactivatedEvent,
} from "../events/ProductEvents";
import {
  AbstractAggregateFactory,
  FactoryOptions,
  FactoryResult,
  FactoryValidationError,
} from "./DomainFactory";
import { v4 as uuidv4 } from "uuid";

/**
 * 产品创建数据接口
 */
export interface CreateProductData {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly price: {
    readonly amount: number;
    readonly currency: string;
  };
  readonly category: string;
  readonly tags?: readonly string[];
  readonly specifications?: Record<string, unknown>;
  readonly inventory?: {
    readonly quantity: number;
    readonly minThreshold?: number;
    readonly maxThreshold?: number;
  };
  readonly supplier?: {
    readonly id: string;
    readonly name: string;
    readonly contact?: string;
  };
}

/**
 * 产品快照接口
 */
export interface ProductSnapshot {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly price: {
    readonly amount: number;
    readonly currency: string;
  };
  readonly category: string;
  readonly tags: readonly string[];
  readonly specifications: Record<string, unknown>;
  readonly inventory: {
    readonly quantity: number;
    readonly minThreshold: number;
    readonly maxThreshold: number;
  };
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly version: number;
}

/**
 * 产品工厂
 */
export class ProductFactory extends AbstractAggregateFactory<
  Product,
  CreateProductData
> {
  private static readonly VALID_CURRENCIES = ["CNY", "USD", "EUR", "JPY"];
  private static readonly VALID_CATEGORIES = [
    "electronics",
    "clothing",
    "books",
    "home",
    "sports",
    "toys",
    "food",
    "health",
  ];

  constructor() {
    super("Product");
  }

  public createDefault(options: FactoryOptions = {}): FactoryResult<Product> {
    const defaultData: CreateProductData = {
      name: "Default Product",
      description: "A default product for testing purposes",
      price: {
        amount: 99.99,
        currency: "CNY",
      },
      category: "electronics",
      tags: ["default", "sample"],
      specifications: {
        weight: "1kg",
        dimensions: "10x10x5cm",
      },
      inventory: {
        quantity: 100,
        minThreshold: 10,
        maxThreshold: 1000,
      },
    };

    return this.createFromData(defaultData, options);
  }

  public validateCreateData(data: CreateProductData): string[] {
    const errors: string[] = [];

    // 验证产品名称
    if (!data.name || data.name.trim().length === 0) {
      errors.push("Product name is required");
    } else if (data.name.trim().length < 2) {
      errors.push("Product name must be at least 2 characters");
    } else if (data.name.trim().length > 100) {
      errors.push("Product name must not exceed 100 characters");
    }

    // 验证价格
    if (!data.price) {
      errors.push("Product price is required");
    } else {
      if (typeof data.price.amount !== "number" || data.price.amount < 0) {
        errors.push("Product price amount must be a non-negative number");
      }

      if (
        !data.price.currency ||
        !ProductFactory.VALID_CURRENCIES.includes(data.price.currency)
      ) {
        errors.push(
          `Invalid currency. Supported currencies: ${ProductFactory.VALID_CURRENCIES.join(
            ", "
          )}`
        );
      }
    }

    // 验证分类
    if (!data.category || data.category.trim().length === 0) {
      errors.push("Product category is required");
    } else if (!ProductFactory.VALID_CATEGORIES.includes(data.category)) {
      errors.push(
        `Invalid category. Supported categories: ${ProductFactory.VALID_CATEGORIES.join(
          ", "
        )}`
      );
    }

    // 验证描述长度
    if (data.description && data.description.length > 1000) {
      errors.push("Product description must not exceed 1000 characters");
    }

    // 验证标签
    if (data.tags) {
      if (data.tags.length > 10) {
        errors.push("Product cannot have more than 10 tags");
      }

      for (const tag of data.tags) {
        if (tag.trim().length === 0) {
          errors.push("Product tags cannot be empty");
          break;
        }
        if (tag.length > 30) {
          errors.push("Product tag length must not exceed 30 characters");
          break;
        }
      }
    }

    // 验证库存
    if (data.inventory) {
      if (
        typeof data.inventory.quantity !== "number" ||
        data.inventory.quantity < 0
      ) {
        errors.push("Inventory quantity must be a non-negative number");
      }

      if (
        data.inventory.minThreshold &&
        (data.inventory.minThreshold < 0 ||
          data.inventory.minThreshold > data.inventory.quantity)
      ) {
        errors.push("Invalid minimum threshold");
      }

      if (
        data.inventory.maxThreshold &&
        data.inventory.maxThreshold < data.inventory.quantity
      ) {
        errors.push("Maximum threshold cannot be less than current quantity");
      }
    }

    return errors;
  }

  protected doCreate(
    data: CreateProductData,
    options: FactoryOptions
  ): Product {
    const productId = data.id ? data.id : uuidv4();
    const price = Money.fromYuan(data.price.amount, data.price.currency as any);
    const category = new ProductCategory(data.category);

    const productProps: ProductProps = {
      name: data.name.trim(),
      description: data.description?.trim() || "",
      price,
      category,
      stock: data.inventory?.quantity || 0,
      status: ProductStatus.ACTIVE,
      sku: `SKU-${productId}`,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const product = new Product(productProps, productId);

    return product;
  }

  protected applyDefaults(data: CreateProductData): CreateProductData {
    return {
      ...data,
      name: data.name?.trim() || "Unnamed Product",
      description: data.description?.trim() || "",
      tags: data.tags ?? [],
      specifications: data.specifications ?? {},
      inventory: {
        quantity: data.inventory?.quantity ?? 0,
        minThreshold: data.inventory?.minThreshold ?? 0,
        maxThreshold: data.inventory?.maxThreshold ?? 1000,
      },
    };
  }

  protected collectWarnings(
    data: CreateProductData,
    options: FactoryOptions
  ): string[] {
    const warnings: string[] = [];

    // 检查价格相关警告
    if (data.price && data.price.amount === 0) {
      warnings.push("Product price is zero, verify if intentional");
    }

    if (data.price && data.price.amount > 10000) {
      warnings.push("Product price is very high, double-check amount");
    }

    // 检查库存警告
    if (data.inventory && data.inventory.quantity === 0) {
      warnings.push("Product is out of stock");
    }

    if (
      data.inventory &&
      data.inventory.quantity < (data.inventory.minThreshold ?? 0)
    ) {
      warnings.push("Product quantity is below minimum threshold");
    }

    // 检查名称相关警告
    if (data.name && data.name.toLowerCase().includes("test")) {
      warnings.push('Product name contains "test", might be a test product');
    }

    // 检查标签警告
    if (data.tags && data.tags.length === 0) {
      warnings.push(
        "Product has no tags, consider adding relevant tags for better discoverability"
      );
    }

    return warnings;
  }

  public reconstituteFromEvents(
    events: readonly unknown[]
  ): FactoryResult<Product> {
    const validationErrors = this.validateEventSequence(events);
    if (validationErrors.length > 0) {
      throw new FactoryValidationError(this.entityType, validationErrors);
    }

    let product: Product | null = null;
    const warnings: string[] = [];

    for (const event of events) {
      if (this.isProductCreatedEvent(event)) {
        if (product !== null) {
          warnings.push("Multiple product created events found");
          continue;
        }

        const price = event.price; // 事件中已经是Money对象
        const category = new ProductCategory(event.categoryId);

        const productProps: ProductProps = {
          name: event.name,
          description: "",
          price,
          category,
          stock: 0,
          status: ProductStatus.ACTIVE,
          sku: `SKU-${event.productId}`,
          images: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        product = new Product(productProps, event.productId);
      } else if (this.isProductPriceUpdatedEvent(event)) {
        if (product === null) {
          throw new FactoryValidationError(this.entityType, [
            "Product price updated before creation",
          ]);
        }

        // 应用价格更新
        product.changePrice(event.newPrice);
      } else if (this.isProductDiscontinuedEvent(event)) {
        if (product === null) {
          warnings.push("Product discontinued event for non-existent product");
        } else {
          // 标记产品为停产
          product.deactivate(event.reason);
        }
      }
    }

    if (product === null) {
      throw new FactoryValidationError(this.entityType, [
        "No product created event found",
      ]);
    }

    return {
      entity: product,
      warnings,
      metadata: {
        createdAt: new Date().toISOString(),
        factoryType: this.entityType,
        eventCount: events.length,
        reconstructed: true,
      },
    };
  }

  public createFromSnapshot(snapshot: unknown): FactoryResult<Product> {
    const validationErrors = this.validateSnapshotData(snapshot);
    if (validationErrors.length > 0) {
      throw new FactoryValidationError(this.entityType, validationErrors);
    }

    const productSnapshot = snapshot as ProductSnapshot;

    const structureErrors = this.validateSnapshotStructure(productSnapshot);
    if (structureErrors.length > 0) {
      throw new FactoryValidationError(this.entityType, structureErrors);
    }

    const price = Money.fromYuan(
      productSnapshot.price.amount,
      productSnapshot.price.currency as any
    );
    const category = new ProductCategory(productSnapshot.category);

    const productProps: ProductProps = {
      name: productSnapshot.name,
      description: productSnapshot.description,
      price,
      category,
      stock: productSnapshot.inventory.quantity,
      status: productSnapshot.isActive
        ? ProductStatus.ACTIVE
        : ProductStatus.INACTIVE,
      sku: `SKU-${productSnapshot.id}`,
      images: [],
      createdAt: new Date(productSnapshot.createdAt),
      updatedAt: new Date(),
    };

    const product = new Product(productProps, productSnapshot.id);

    return {
      entity: product,
      warnings: [],
      metadata: {
        createdAt: new Date().toISOString(),
        factoryType: this.entityType,
        snapshotVersion: productSnapshot.version,
        restoredFromSnapshot: true,
      },
    };
  }

  /**
   * 验证快照结构
   */
  private validateSnapshotStructure(snapshot: ProductSnapshot): string[] {
    const errors: string[] = [];

    if (!snapshot.id) errors.push("Snapshot missing id");
    if (!snapshot.name) errors.push("Snapshot missing name");
    if (!snapshot.price || typeof snapshot.price.amount !== "number")
      errors.push("Snapshot missing or invalid price");
    if (!snapshot.category) errors.push("Snapshot missing category");
    if (typeof snapshot.isActive !== "boolean")
      errors.push("Snapshot missing or invalid isActive");
    if (typeof snapshot.version !== "number")
      errors.push("Snapshot missing or invalid version");

    return errors;
  }

  /**
   * 类型守卫方法
   */
  private isProductCreatedEvent(event: unknown): event is ProductCreatedEvent {
    return (event as any)?.eventType === "ProductCreated";
  }

  private isProductPriceUpdatedEvent(
    event: unknown
  ): event is ProductPriceChangedEvent {
    return (event as any)?.eventType === "ProductPriceChanged";
  }

  private isProductDiscontinuedEvent(
    event: unknown
  ): event is ProductDeactivatedEvent {
    return (event as any)?.eventType === "ProductDeactivated";
  }
}

/**
 * 产品工厂的单例实例
 */
export const productFactory = new ProductFactory();
