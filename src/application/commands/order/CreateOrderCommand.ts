import { Command } from "../base/Command";
import { EntityId } from "../../../shared/types";

/**
 * 创建订单命令
 */
export class CreateOrderCommand extends Command {
  public readonly customerId: EntityId;
  public readonly orderItems: Array<{
    productId: EntityId;
    quantity: number;
    unitPrice?: number; // 可选，如果不提供则从商品获取
  }>;
  public readonly shippingAddress?: {
    country: string;
    province: string;
    city: string;
    district: string;
    street: string;
    postalCode: string;
    detail?: string;
  };
  public readonly note?: string;

  constructor(data: {
    customerId: EntityId;
    orderItems: Array<{
      productId: EntityId;
      quantity: number;
      unitPrice?: number;
    }>;
    shippingAddress?: {
      country: string;
      province: string;
      city: string;
      district: string;
      street: string;
      postalCode: string;
      detail?: string;
    };
    note?: string;
  }) {
    super();
    this.customerId = data.customerId;
    this.orderItems = data.orderItems;
    this.shippingAddress = data.shippingAddress;
    this.note = data.note;
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.customerId || this.customerId.trim() === "") {
      errors.push("客户ID是必填项");
    }

    if (!this.orderItems || this.orderItems.length === 0) {
      errors.push("订单项不能为空");
    } else {
      this.orderItems.forEach((item, index) => {
        if (!item.productId || item.productId.trim() === "") {
          errors.push(`订单项 ${index + 1} 的商品ID是必填项`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`订单项 ${index + 1} 的数量必须大于0`);
        }
        if (item.unitPrice !== undefined && item.unitPrice < 0) {
          errors.push(`订单项 ${index + 1} 的单价不能为负数`);
        }
      });
    }

    return errors;
  }
}
