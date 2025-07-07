import { CommandHandler, CommandResult } from "../base/Command";
import { CreateOrderCommand } from "./CreateOrderCommand";
import {
  IOrderRepository,
  IProductRepository,
  IUserRepository,
} from "../../../domain/repositories";
import { Order, OrderItem } from "../../../domain/entities";
import { Money, Address } from "../../../domain/value-objects";
import { OrderService } from "../../../domain/services";

/**
 * 创建订单命令处理器
 */
export class CreateOrderCommandHandler
  implements CommandHandler<CreateOrderCommand, Order>
{
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly productRepository: IProductRepository,
    private readonly userRepository: IUserRepository,
    private readonly orderService: OrderService
  ) {}

  async handle(command: CreateOrderCommand): Promise<CommandResult<Order>> {
    try {
      // 验证命令
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return CommandResult.failure("命令验证失败", validationErrors);
      }

      // 检查客户是否存在
      const customer = await this.userRepository.findById(command.customerId);
      if (!customer) {
        return CommandResult.failure("客户不存在");
      }

      // 验证订单项和获取商品信息
      const orderItems: OrderItem[] = [];
      let totalAmount = Money.zero();

      for (const item of command.orderItems) {
        const product = await this.productRepository.findById(item.productId);
        if (!product) {
          return CommandResult.failure(`商品 ${item.productId} 不存在`);
        }

        if (!product.isAvailable || !product.isInStock) {
          return CommandResult.failure(`商品 ${product.name} 不可用或无库存`);
        }

        if (product.stock < item.quantity) {
          return CommandResult.failure(
            `商品 ${product.name} 库存不足，当前库存：${product.stock}`
          );
        }

        // 使用商品当前价格或命令中指定的价格
        const unitPrice = item.unitPrice
          ? Money.fromYuan(item.unitPrice)
          : product.price;

        const orderItem = OrderItem.create({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
        });

        orderItems.push(orderItem);
        totalAmount = totalAmount.add(unitPrice.multiply(item.quantity));
      }

      // 创建配送地址
      let shippingAddress: Address | undefined;
      if (command.shippingAddress) {
        const addressData: any = {
          country: command.shippingAddress.country,
          province: command.shippingAddress.province,
          city: command.shippingAddress.city,
          district: command.shippingAddress.district,
          street: command.shippingAddress.street,
          postalCode: command.shippingAddress.postalCode,
        };
        if (command.shippingAddress.detail) {
          addressData.detail = command.shippingAddress.detail;
        }
        shippingAddress = Address.create(addressData);
      } else {
        // 使用客户默认地址
        if (customer.addresses.length > 0) {
          shippingAddress = customer.addresses[0];
        } else {
          return CommandResult.failure("需要提供配送地址或客户必须有默认地址");
        }
      }

      // 使用领域服务创建订单
      const order = await this.orderService.createOrder({
        customerId: command.customerId,
        orderItems,
        shippingAddress,
        note: command.note,
      });

      // 扣减库存
      for (const item of command.orderItems) {
        const product = await this.productRepository.findById(item.productId);
        if (product) {
          product.decreaseStock(item.quantity);
          await this.productRepository.save(product);
        }
      }

      // 保存订单
      await this.orderRepository.save(order);

      return CommandResult.success(order, "订单创建成功");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "创建订单时发生未知错误";
      return CommandResult.failure(errorMessage);
    }
  }
}
