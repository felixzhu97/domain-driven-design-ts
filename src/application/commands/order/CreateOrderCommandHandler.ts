import { CommandHandler } from "../base/CommandHandler";
import {
  createSuccessResult,
  createFailureResult,
  CommandResult,
} from "../base/Command";
import { CreateOrderCommand } from "./CreateOrderCommand";
import { Order } from "../../../domain/entities/Order";
import { OrderItem } from "../../../domain/entities/OrderItem";
import { Address } from "../../../domain/value-objects";
import {
  IUserRepository,
  IProductRepository,
  IOrderRepository,
} from "../../../domain/repositories";

/**
 * 创建订单命令处理器
 */
export class CreateOrderCommandHandler extends CommandHandler<
  CreateOrderCommand,
  Order
> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly productRepository: IProductRepository,
    private readonly orderRepository: IOrderRepository
  ) {
    super();
  }

  protected async validate(
    command: CreateOrderCommand
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors = command.validate();
    return { isValid: errors.length === 0, errors };
  }

  protected async execute(command: CreateOrderCommand): Promise<Order> {
    // 验证命令
    const validationErrors = command.validate();
    if (validationErrors.length > 0) {
      throw new Error(`命令验证失败: ${validationErrors.join(", ")}`);
    }

    // 验证客户是否存在
    const customer = await this.userRepository.findById(command.customerId);
    if (!customer) {
      throw new Error("客户不存在");
    }

    // 验证商品并创建订单项
    const orderItems: OrderItem[] = [];
    for (const item of command.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        throw new Error(`商品 ${item.productId.toString()} 不存在`);
      }

      if (!product.isAvailable) {
        throw new Error(`商品 ${product.name} 不可用或无库存`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `商品 ${product.name} 库存不足，当前库存：${product.stock}，需要：${item.quantity}`
        );
      }

      // 创建订单项
      const orderItem = OrderItem.create(
        item.productId,
        product.name,
        item.quantity,
        product.price
      );

      orderItems.push(orderItem);
    }

    // 确定配送地址
    let shippingAddress: Address;
    if (command.shippingAddress) {
      shippingAddress = new Address({
        country: command.shippingAddress.country,
        province: command.shippingAddress.province,
        city: command.shippingAddress.city,
        district: command.shippingAddress.district,
        street: command.shippingAddress.street,
        postalCode: command.shippingAddress.postalCode,
        detail: command.shippingAddress.detail,
      });
    } else {
      // 使用客户的默认地址
      if (!customer.addresses || customer.addresses.length === 0) {
        throw new Error("需要提供配送地址或客户必须有默认地址");
      }
      shippingAddress = customer.addresses[0];
    }

    // 计算总金额
    let totalAmount = orderItems.reduce(
      (sum, item) => sum.add(item.totalPrice),
      orderItems[0].totalPrice.multiply(0)
    );

    // 创建订单
    const order = Order.create(
      command.customerId,
      orderItems,
      totalAmount,
      shippingAddress
    );

    // 减少商品库存
    for (const item of command.items) {
      const product = await this.productRepository.findById(item.productId);
      if (product) {
        product.decreaseStock(item.quantity, "订单扣减库存");
        await this.productRepository.save(product);
      }
    }

    // 保存订单
    await this.orderRepository.save(order);

    return order;
  }
}
