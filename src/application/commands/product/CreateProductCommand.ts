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
}
