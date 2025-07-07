import { Command } from "../base/Command";
import { Money, ProductCategory } from "../../../domain/value-objects";

/**
 * 创建商品命令
 */
export class CreateProductCommand extends Command {
  public readonly name: string;
  public readonly description: string;
  public readonly price: Money;
  public readonly category: ProductCategory;
  public readonly sku: string;
  public readonly initialStock: number;
  public readonly weight?: number;

  constructor(data: {
    name: string;
    description: string;
    price: Money;
    category: ProductCategory;
    sku: string;
    initialStock: number;
    weight?: number;
  }) {
    super();
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.category = data.category;
    this.sku = data.sku;
    this.initialStock = data.initialStock;
    if (data.weight !== undefined) {
      this.weight = data.weight;
    }
  }

  /**
   * 验证命令
   */
  validate(): string[] {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push("商品名称不能为空");
    }

    if (!this.description || this.description.trim().length === 0) {
      errors.push("商品描述不能为空");
    }

    if (!this.sku || this.sku.trim().length === 0) {
      errors.push("商品SKU不能为空");
    }

    if (!this.category) {
      errors.push("商品分类不能为空");
    }

    if (!this.price) {
      errors.push("商品价格不能为空");
    } else if (this.price.amount <= 0) {
      errors.push("商品价格必须大于0");
    }

    if (this.initialStock < 0) {
      errors.push("库存数量不能为负数");
    }

    if (this.weight !== undefined && this.weight <= 0) {
      errors.push("商品重量必须大于0");
    }

    return errors;
  }
}
