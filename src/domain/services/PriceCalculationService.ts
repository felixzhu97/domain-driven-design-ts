import { Money, Address } from "../value-objects";
import { OrderItem } from "../entities";

export interface TaxRate {
  region: string;
  rate: number; // 百分比，例如 0.08 表示 8%
}

export interface ShippingRule {
  weightRange: {
    min: number; // 克
    max: number; // 克
  };
  distanceRange: {
    min: number; // 公里
    max: number; // 公里
  };
  basePrice: Money;
  perKgPrice: Money;
}

export interface DiscountRule {
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number; // 百分比或固定金额
  minimumAmount?: Money;
  maxDiscount?: Money;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number;
  usedCount: number;
}

export class PriceCalculationService {
  /**
   * 计算运费
   */
  public static calculateShippingCost(
    shippingAddress: Address,
    orderItems: OrderItem[],
    shippingRules: ShippingRule[],
    warehouseAddress: Address,
    productWeights: Map<string, number>
  ): Money {
    // 计算总重量
    const totalWeight = orderItems.reduce((weight, item) => {
      const productWeight = productWeights.get(item.productId) || 0;
      return weight + productWeight * item.quantity;
    }, 0);

    // 计算距离（简化版本，实际应该调用地理服务）
    const distance = this.calculateDistance(shippingAddress, warehouseAddress);

    // 找到匹配的运费规则
    const applicableRule = shippingRules.find((rule) => {
      return (
        totalWeight >= rule.weightRange.min &&
        totalWeight <= rule.weightRange.max &&
        distance >= rule.distanceRange.min &&
        distance <= rule.distanceRange.max
      );
    });

    if (!applicableRule) {
      // 如果没有匹配的规则，使用默认计算
      return Money.fromYuan(Math.max(10, totalWeight * 0.01 + distance * 0.5));
    }

    // 使用规则计算运费
    const weightInKg = totalWeight / 1000;
    const additionalCost = applicableRule.perKgPrice.multiply(weightInKg);

    return applicableRule.basePrice.add(additionalCost);
  }

  /**
   * 计算税费
   */
  public static calculateTaxAmount(
    subtotal: Money,
    billingAddress: Address,
    taxRates: TaxRate[]
  ): Money {
    // 根据地址确定税率
    const taxRate = this.getTaxRateForAddress(billingAddress, taxRates);

    if (taxRate === 0) {
      return Money.zero(subtotal.currency);
    }

    const taxAmount = subtotal.multiply(taxRate);
    return taxAmount;
  }

  /**
   * 计算折扣金额
   */
  public static calculateDiscountAmount(
    subtotal: Money,
    discountCode: string,
    discountRules: DiscountRule[]
  ): Money {
    const rule = discountRules.find((r) => r.code === discountCode);

    if (!rule) {
      return Money.zero(subtotal.currency);
    }

    // 检查折扣是否有效
    if (!this.isDiscountValid(rule, subtotal)) {
      return Money.zero(subtotal.currency);
    }

    let discountAmount: Money;

    switch (rule.type) {
      case "PERCENTAGE":
        discountAmount = subtotal.multiply(rule.value / 100);
        break;

      case "FIXED_AMOUNT":
        discountAmount = Money.fromYuan(rule.value, subtotal.currency);
        break;

      case "FREE_SHIPPING":
        // 免运费折扣需要在运费计算时处理
        return Money.zero(subtotal.currency);

      default:
        return Money.zero(subtotal.currency);
    }

    // 应用最大折扣限制
    if (rule.maxDiscount && discountAmount.isGreaterThan(rule.maxDiscount)) {
      discountAmount = rule.maxDiscount;
    }

    // 确保折扣不超过小计金额
    if (discountAmount.isGreaterThan(subtotal)) {
      discountAmount = subtotal;
    }

    return discountAmount;
  }

  /**
   * 计算订单总价
   */
  public static calculateOrderTotal(
    orderItems: OrderItem[],
    shippingAddress: Address,
    billingAddress: Address,
    discountCode?: string,
    shippingRules: ShippingRule[] = [],
    taxRates: TaxRate[] = [],
    discountRules: DiscountRule[] = [],
    productWeights: Map<string, number> = new Map(),
    warehouseAddress?: Address
  ): {
    subtotal: Money;
    shippingCost: Money;
    taxAmount: Money;
    discountAmount: Money;
    total: Money;
  } {
    // 计算小计
    const subtotal = orderItems.reduce(
      (total, item) => total.add(item.totalPrice),
      Money.zero()
    );

    // 计算运费
    let shippingCost = Money.zero(subtotal.currency);
    if (warehouseAddress) {
      shippingCost = this.calculateShippingCost(
        shippingAddress,
        orderItems,
        shippingRules,
        warehouseAddress,
        productWeights
      );
    }

    // 计算税费
    const taxAmount = this.calculateTaxAmount(
      subtotal,
      billingAddress,
      taxRates
    );

    // 计算折扣
    let discountAmount = Money.zero(subtotal.currency);
    if (discountCode) {
      discountAmount = this.calculateDiscountAmount(
        subtotal,
        discountCode,
        discountRules
      );

      // 检查是否为免运费折扣
      const discountRule = discountRules.find((r) => r.code === discountCode);
      if (discountRule && discountRule.type === "FREE_SHIPPING") {
        shippingCost = Money.zero(subtotal.currency);
      }
    }

    // 计算总价
    const total = subtotal
      .add(shippingCost)
      .add(taxAmount)
      .subtract(discountAmount);

    return {
      subtotal,
      shippingCost,
      taxAmount,
      discountAmount,
      total,
    };
  }

  /**
   * 批量价格计算（用于购物车）
   */
  public static calculateBulkPricing(
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: Money;
      bulkDiscounts?: Array<{
        minQuantity: number;
        discountPercentage: number;
      }>;
    }>
  ): Array<{
    productId: string;
    quantity: number;
    originalUnitPrice: Money;
    discountedUnitPrice: Money;
    totalPrice: Money;
    savedAmount: Money;
  }> {
    return items.map((item) => {
      let discountedUnitPrice = item.unitPrice;
      let savedAmount = Money.zero(item.unitPrice.currency);

      // 查找适用的批量折扣
      if (item.bulkDiscounts) {
        const applicableDiscount = item.bulkDiscounts
          .filter((discount) => item.quantity >= discount.minQuantity)
          .sort((a, b) => b.discountPercentage - a.discountPercentage)[0];

        if (applicableDiscount) {
          const discountAmount = item.unitPrice.multiply(
            applicableDiscount.discountPercentage / 100
          );
          discountedUnitPrice = item.unitPrice.subtract(discountAmount);
          savedAmount = discountAmount.multiply(item.quantity);
        }
      }

      const totalPrice = discountedUnitPrice.multiply(item.quantity);

      return {
        productId: item.productId,
        quantity: item.quantity,
        originalUnitPrice: item.unitPrice,
        discountedUnitPrice,
        totalPrice,
        savedAmount,
      };
    });
  }

  /**
   * 检查折扣是否有效
   */
  private static isDiscountValid(rule: DiscountRule, subtotal: Money): boolean {
    const now = new Date();

    // 检查时间范围
    if (now < rule.validFrom || now > rule.validTo) {
      return false;
    }

    // 检查使用次数限制
    if (rule.usageLimit && rule.usedCount >= rule.usageLimit) {
      return false;
    }

    // 检查最小金额要求
    if (rule.minimumAmount && subtotal.isLessThan(rule.minimumAmount)) {
      return false;
    }

    return true;
  }

  /**
   * 根据地址获取税率
   */
  private static getTaxRateForAddress(
    address: Address,
    taxRates: TaxRate[]
  ): number {
    // 简化版本，实际应该根据具体的地址匹配规则
    const matchingRate = taxRates.find(
      (rate) =>
        rate.region === address.province ||
        rate.region === address.city ||
        rate.region === address.country
    );

    return matchingRate ? matchingRate.rate : 0;
  }

  /**
   * 计算两个地址之间的距离（简化版本）
   */
  private static calculateDistance(
    address1: Address,
    address2: Address
  ): number {
    // 这是一个简化的实现，实际应该使用地理计算服务
    if (address1.city === address2.city) {
      return 10; // 同城10公里
    } else if (address1.province === address2.province) {
      return 200; // 同省200公里
    } else {
      return 800; // 跨省800公里
    }
  }

  /**
   * 计算会员价格
   */
  public static calculateMemberPrice(
    originalPrice: Money,
    membershipLevel: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM"
  ): Money {
    const discountRates = {
      BRONZE: 0.05, // 5% 折扣
      SILVER: 0.08, // 8% 折扣
      GOLD: 0.12, // 12% 折扣
      PLATINUM: 0.15, // 15% 折扣
    };

    const discountRate = discountRates[membershipLevel];
    const discountAmount = originalPrice.multiply(discountRate);

    return originalPrice.subtract(discountAmount);
  }
}
