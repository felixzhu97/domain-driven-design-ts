import { AggregateRoot } from "./AggregateRoot";
import { Money, ProductCategory } from "../value-objects";
import { DomainEvent, EntityId } from "../../shared/types";
import {
  ProductCreatedEvent,
  ProductPriceChangedEvent,
  ProductStockUpdatedEvent,
  ProductDeactivatedEvent,
} from "../events/ProductEvents";

export enum ProductStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  OUT_OF_STOCK = "OUT_OF_STOCK",
}

export interface ProductProps {
  name: string;
  description: string;
  price: Money;
  category: ProductCategory;
  stock: number;
  status: ProductStatus;
  sku: string; // 商品唯一标识
  images: string[];
  weight?: number; // 重量（克）
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class Product extends AggregateRoot {
  private _name: string;
  private _description: string;
  private _price: Money;
  private _category: ProductCategory;
  private _stock: number;
  private _status: ProductStatus;
  private _sku: string;
  private _images: string[];
  private _weight: number | undefined;
  private _dimensions:
    | {
        length: number;
        width: number;
        height: number;
      }
    | undefined;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ProductProps, id?: EntityId) {
    super(id);
    this._name = props.name;
    this._description = props.description;
    this._price = props.price;
    this._category = props.category;
    this._stock = props.stock;
    this._status = props.status;
    this._sku = props.sku;
    this._images = [...props.images];
    this._weight = props.weight;
    this._dimensions = props.dimensions;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;

    // 如果是新创建的商品，发布事件
    if (!id) {
      this.addEvent(
        new ProductCreatedEvent(
          this.id,
          this._name,
          this._price,
          this._category.name
        )
      );
    }
  }

  // Getters
  public get name(): string {
    return this._name;
  }

  public get description(): string {
    return this._description;
  }

  public get price(): Money {
    return this._price;
  }

  public get category(): ProductCategory {
    return this._category;
  }

  public get stock(): number {
    return this._stock;
  }

  public get status(): ProductStatus {
    return this._status;
  }

  public get sku(): string {
    return this._sku;
  }

  public get images(): string[] {
    return [...this._images];
  }

  public get weight(): number | undefined {
    return this._weight;
  }

  public get dimensions():
    | { length: number; width: number; height: number }
    | undefined {
    return this._dimensions;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get isActive(): boolean {
    return this._status === ProductStatus.ACTIVE;
  }

  public get isInStock(): boolean {
    return this._stock > 0;
  }

  public get isAvailable(): boolean {
    return this.isActive && this.isInStock;
  }

  // 业务方法
  public changeName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error("商品名称不能为空");
    }

    if (newName.length > 200) {
      throw new Error("商品名称长度不能超过200个字符");
    }

    this._name = newName.trim();
    this.updateTimestamp();
  }

  public changeDescription(newDescription: string): void {
    if (!newDescription || newDescription.trim().length === 0) {
      throw new Error("商品描述不能为空");
    }

    if (newDescription.length > 2000) {
      throw new Error("商品描述长度不能超过2000个字符");
    }

    this._description = newDescription.trim();
    this.updateTimestamp();
  }

  public changePrice(newPrice: Money): void {
    if (this._price.equals(newPrice)) {
      return; // 价格没有变化
    }

    if (newPrice.isZero()) {
      throw new Error("商品价格不能为零");
    }

    const oldPrice = this._price;
    this._price = newPrice;
    this.updateTimestamp();

    this.addEvent(new ProductPriceChangedEvent(this.id, oldPrice, newPrice));
  }

  public changeCategory(newCategory: ProductCategory): void {
    this._category = newCategory;
    this.updateTimestamp();
  }

  public increaseStock(quantity: number, reason: string): void {
    if (quantity <= 0) {
      throw new Error("增加的库存数量必须大于0");
    }

    const oldStock = this._stock;
    this._stock += quantity;
    this.updateTimestamp();

    // 如果之前缺货，现在有货了，更新状态
    if (
      oldStock === 0 &&
      this._stock > 0 &&
      this._status === ProductStatus.OUT_OF_STOCK
    ) {
      this._status = ProductStatus.ACTIVE;
    }

    this.addEvent(
      new ProductStockUpdatedEvent(this.id, oldStock, this._stock, reason)
    );
  }

  public decreaseStock(quantity: number, reason: string): void {
    if (quantity <= 0) {
      throw new Error("减少的库存数量必须大于0");
    }

    if (quantity > this._stock) {
      throw new Error("减少的库存数量不能超过当前库存");
    }

    const oldStock = this._stock;
    this._stock -= quantity;
    this.updateTimestamp();

    // 如果库存为0，更新状态为缺货
    if (this._stock === 0) {
      this._status = ProductStatus.OUT_OF_STOCK;
    }

    this.addEvent(
      new ProductStockUpdatedEvent(this.id, oldStock, this._stock, reason)
    );
  }

  public setStock(newStock: number, reason: string): void {
    if (newStock < 0) {
      throw new Error("库存数量不能为负数");
    }

    const oldStock = this._stock;
    this._stock = newStock;
    this.updateTimestamp();

    // 更新状态
    if (newStock === 0) {
      this._status = ProductStatus.OUT_OF_STOCK;
    } else if (this._status === ProductStatus.OUT_OF_STOCK) {
      this._status = ProductStatus.ACTIVE;
    }

    this.addEvent(
      new ProductStockUpdatedEvent(this.id, oldStock, this._stock, reason)
    );
  }

  public addImage(imageUrl: string): void {
    if (!imageUrl || imageUrl.trim().length === 0) {
      throw new Error("图片URL不能为空");
    }

    if (this._images.includes(imageUrl)) {
      throw new Error("图片已存在");
    }

    this._images.push(imageUrl);
    this.updateTimestamp();
  }

  public removeImage(imageUrl: string): void {
    const index = this._images.indexOf(imageUrl);
    if (index === -1) {
      throw new Error("图片不存在");
    }

    this._images.splice(index, 1);
    this.updateTimestamp();
  }

  public setWeight(weight: number): void {
    if (weight <= 0) {
      throw new Error("商品重量必须大于0");
    }

    this._weight = weight;
    this.updateTimestamp();
  }

  public setDimensions(length: number, width: number, height: number): void {
    if (length <= 0 || width <= 0 || height <= 0) {
      throw new Error("商品尺寸必须大于0");
    }

    this._dimensions = { length, width, height };
    this.updateTimestamp();
  }

  public activate(): void {
    if (this._status === ProductStatus.ACTIVE) {
      return; // 已经是活跃状态
    }

    this._status = ProductStatus.ACTIVE;
    this.updateTimestamp();
  }

  public deactivate(reason?: string): void {
    if (this._status === ProductStatus.INACTIVE) {
      return; // 已经是非活跃状态
    }

    this._status = ProductStatus.INACTIVE;
    this.updateTimestamp();

    this.addEvent(new ProductDeactivatedEvent(this.id, reason));
  }

  public canBePurchased(quantity: number): boolean {
    return this.isActive && this.isInStock && this._stock >= quantity;
  }

  private updateTimestamp(): void {
    this._updatedAt = new Date();
  }

  protected applyEvent(event: DomainEvent, isNew: boolean): void {
    switch (event.eventType) {
      case "ProductCreated":
        // 创建事件已在构造函数中处理
        break;
      case "ProductPriceChanged":
        // 价格变更事件已在changePrice方法中处理
        break;
      case "ProductStockUpdated":
        // 库存变更事件已在相关方法中处理
        break;
      case "ProductDeactivated":
        // 停用事件已在deactivate方法中处理
        break;
      default:
        // 忽略未知事件
        break;
    }
  }

  // 静态工厂方法
  public static create(
    name: string,
    description: string,
    price: Money,
    category: ProductCategory,
    sku: string,
    initialStock: number = 0
  ): Product {
    if (!name || name.trim().length === 0) {
      throw new Error("商品名称不能为空");
    }

    if (!description || description.trim().length === 0) {
      throw new Error("商品描述不能为空");
    }

    if (!sku || sku.trim().length === 0) {
      throw new Error("商品SKU不能为空");
    }

    if (price.isZero()) {
      throw new Error("商品价格不能为零");
    }

    if (initialStock < 0) {
      throw new Error("初始库存不能为负数");
    }

    const now = new Date();
    const status =
      initialStock > 0 ? ProductStatus.ACTIVE : ProductStatus.OUT_OF_STOCK;

    return new Product({
      name: name.trim(),
      description: description.trim(),
      price,
      category,
      stock: initialStock,
      status,
      sku: sku.trim(),
      images: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  public static fromSnapshot(props: ProductProps, id: EntityId): Product {
    return new Product(props, id);
  }
}
