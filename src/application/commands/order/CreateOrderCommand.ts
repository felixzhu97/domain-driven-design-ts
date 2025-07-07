import { Command } from "../base/Command";
import { EntityId } from "../../../shared/types";

export interface OrderItemData {
  productId: EntityId;
  quantity: number;
  specialInstructions?: string;
}

export interface AddressData {
  country: string;
  province: string;
  city: string;
  district: string;
  street: string;
  postalCode: string;
  detail?: string;
}

/**
 * 创建订单命令
 */
export class CreateOrderCommand extends Command {
  public readonly customerId: EntityId;
  public readonly items: OrderItemData[];
  public readonly shippingAddress?: AddressData | undefined;
  public readonly note?: string | undefined;
  public readonly couponCode?: string | undefined;

  constructor(data: {
    customerId: EntityId;
    items: OrderItemData[];
    shippingAddress?: AddressData;
    note?: string;
    couponCode?: string;
  }) {
    super();
    this.customerId = data.customerId;
    this.items = data.items;
    this.shippingAddress = data.shippingAddress;
    this.note = data.note;
    this.couponCode = data.couponCode;
  }

  /**
   * 验证命令
   */
  validate(): string[] {
    const errors: string[] = [];

    if (!this.customerId) {
      errors.push("客户ID不能为空");
    }

    if (!this.items || this.items.length === 0) {
      errors.push("订单必须包含至少一个商品");
    }

    // 验证订单项
    this.items.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`第${index + 1}个商品的ID不能为空`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`第${index + 1}个商品的数量必须大于0`);
      }
    });

    // 验证配送地址（如果提供）
    if (this.shippingAddress) {
      const addr = this.shippingAddress;
      if (!addr.country || addr.country.trim().length === 0) {
        errors.push("配送地址的国家不能为空");
      }
      if (!addr.city || addr.city.trim().length === 0) {
        errors.push("配送地址的城市不能为空");
      }
      if (!addr.street || addr.street.trim().length === 0) {
        errors.push("配送地址的街道不能为空");
      }
    }

    return errors;
  }
}
