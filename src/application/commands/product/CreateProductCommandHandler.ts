import { CommandHandler } from "../base/CommandHandler";
import { CreateProductCommand } from "./CreateProductCommand";
import { Product } from "../../../domain/entities/Product";
import { IProductRepository } from "../../../domain/repositories";

/**
 * 创建商品命令处理器
 */
export class CreateProductCommandHandler extends CommandHandler<
  CreateProductCommand,
  Product
> {
  constructor(private readonly productRepository: IProductRepository) {
    super();
  }

  protected async validate(
    command: CreateProductCommand
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors = command.validate();

    // 额外的业务验证 - 检查SKU是否已存在
    if (errors.length === 0) {
      const existingProduct = await this.productRepository.findBySku(
        command.sku
      );
      if (existingProduct) {
        errors.push("该SKU已存在");
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  protected async execute(command: CreateProductCommand): Promise<Product> {
    // 创建产品
    const product = Product.create(
      command.name,
      command.description,
      command.price,
      command.category,
      command.sku,
      command.initialStock
    );

    // 设置可选属性
    if (command.weight) {
      product.setWeight(command.weight);
    }

    // 保存产品
    await this.productRepository.save(product);

    return product;
  }
}
