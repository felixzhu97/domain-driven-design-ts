import { CommandHandler, ICommandHandler } from "../base/CommandHandler";
import { CommandResult } from "../base/Command";
import { CreateProductCommand } from "./CreateProductCommand";
import { Product } from "../../../domain/entities";
import { IProductRepository } from "../../../domain/repositories";

/**
 * 创建商品命令处理器
 */
export class CreateProductCommandHandler
  extends CommandHandler<CreateProductCommand, Product>
  implements ICommandHandler<CreateProductCommand, Product>
{
  constructor(private productRepository: IProductRepository) {
    super();
  }

  public async handle(
    command: CreateProductCommand
  ): Promise<CommandResult<Product>> {
    return this.processCommand(command);
  }

  protected validateCommand(command: CreateProductCommand): string[] {
    const errors: string[] = [];

    if (!command.name?.trim()) {
      errors.push("商品名称不能为空");
    } else if (command.name.trim().length < 2) {
      errors.push("商品名称至少需要2个字符");
    } else if (command.name.trim().length > 100) {
      errors.push("商品名称不能超过100个字符");
    }

    if (!command.description?.trim()) {
      errors.push("商品描述不能为空");
    } else if (command.description.trim().length > 1000) {
      errors.push("商品描述不能超过1000个字符");
    }

    if (!command.price) {
      errors.push("商品价格不能为空");
    } else if (command.price.amount <= 0) {
      errors.push("商品价格必须大于0");
    }

    if (!command.sku?.trim()) {
      errors.push("商品SKU不能为空");
    } else if (!/^[A-Z0-9-_]+$/i.test(command.sku)) {
      errors.push("SKU只能包含字母、数字、连字符和下划线");
    }

    if (command.initialStock < 0) {
      errors.push("初始库存不能为负数");
    }

    if (command.weight !== undefined && command.weight <= 0) {
      errors.push("商品重量必须大于0");
    }

    return errors;
  }

  protected async executeCommand(
    command: CreateProductCommand
  ): Promise<Product> {
    // 1. 检查SKU是否已存在
    const existingProduct = await this.productRepository.findBySku(command.sku);
    if (existingProduct) {
      throw new Error(`SKU ${command.sku} 已存在`);
    }

    // 2. 创建商品实体
    const product = Product.create(
      command.name.trim(),
      command.description.trim(),
      command.price,
      command.category,
      command.sku.toUpperCase(),
      command.initialStock
    );

    // 3. 设置商品重量（如果提供）
    if (command.weight !== undefined) {
      product.setWeight(command.weight);
    }

    // 4. 保存商品
    await this.productRepository.save(product);

    return product;
  }
}
