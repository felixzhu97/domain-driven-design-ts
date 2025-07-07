import { CommandHandler } from "../base/CommandHandler";
import {
  createSuccessResult,
  createFailureResult,
  CommandResult,
} from "../base/Command";
import { CreateOrderCommand } from "./CreateOrderCommand";
import { Order } from "../../../domain/entities/Order";
import { OrderItem } from "../../../domain/entities/OrderItem";
import { Address, Money } from "../../../domain/value-objects";
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
    private readonly orderRepository: IOrderRepository,
    private readonly userRepository: IUserRepository,
    private readonly productRepository: IProductRepository
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
    // 验证客户是否存在
    const customer = await this.userRepository.findById(command.customerId);
    if (!customer) {
      throw new Error("客户不存在");
    }

    // 验证并创建订单项
    const orderItems: OrderItem[] = [];
    let totalAmount = 0;

    for (const item of command.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        throw new Error(`商品 ${item.productId} 不存在`);
      }

      if (!product.isInStock || product.stock < item.quantity) {
        throw new Error(`商品 ${product.name} 库存不足`);
      }

      const orderItem = OrderItem.create(
        item.productId,
        product.name,
        item.quantity,
        product.price
      );

      orderItems.push(orderItem);
      totalAmount += product.price.amount * item.quantity;
    }

    // 创建配送地址
    let shippingAddress: Address;
    if (command.shippingAddress) {
      const addressProps = {
        street: command.shippingAddress.street,
        city: command.shippingAddress.city,
        province: command.shippingAddress.province,
        district: command.shippingAddress.district,
        country: command.shippingAddress.country,
        postalCode: command.shippingAddress.postalCode,
        ...(command.shippingAddress.detail !== undefined && {
          detail: command.shippingAddress.detail,
        }),
      };

      shippingAddress = new Address(addressProps);
    } else {
      throw new Error("配送地址不能为空");
    }

    // 生成订单号
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // 创建订单
    const order = Order.create(
      command.customerId,
      shippingAddress,
      shippingAddress, // 使用相同地址作为账单地址
      orderNumber
    );

    // 添加订单项
    for (const orderItem of orderItems) {
      order.addItem(orderItem);
    }

    // 扣减库存
    for (const item of command.items) {
      const product = await this.productRepository.findById(item.productId);
      if (product) {
        product.decreaseStock(item.quantity, `订单 ${orderNumber} 消费`);
        await this.productRepository.save(product);
      }
    }

    // 保存订单
    await this.orderRepository.save(order);

    return order;
  }
}
