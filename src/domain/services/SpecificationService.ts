import { SpecificationValidator } from "../../shared/specifications/Specification";
import { Order } from "../entities/Order";
import { User } from "../entities/User";
import { Product } from "../entities/Product";
import { Money } from "../value-objects/Money";

// 导入所有规约
import {
  OrderDiscountEligibilitySpecification,
  FreeShippingEligibilitySpecification,
  OrderCancellationSpecification,
  VipDiscountEligibilitySpecification,
  ExpressDeliveryEligibilitySpecification,
  CouponUsageEligibilitySpecification,
  EnterpriseOrderSpecification,
} from "../specifications/OrderSpecifications";

import {
  VipLevelSpecification,
  SpecialOfferEligibilitySpecification,
  ActivityParticipationSpecification,
  CreditLevelSpecification,
  BulkDiscountEligibilitySpecification,
  AccountSecuritySpecification,
} from "../specifications/UserSpecifications";

import {
  ProductPurchasabilitySpecification,
  LowStockWarningSpecification,
  PriceReasonabilitySpecification,
  PromotionEligibilitySpecification,
  QualityAssuranceSpecification,
  SeasonalSalesSpecification,
  WholesaleEligibilitySpecification,
  ProductRecommendationSpecification,
} from "../specifications/ProductSpecifications";

/**
 * 规约服务 - 封装所有业务规约的使用
 */
export class SpecificationService {
  /**
   * 验证订单折扣资格
   */
  validateOrderDiscountEligibility(
    order: Order,
    customer: User,
    minimumAmount: Money,
    minimumOrderCount: number
  ): boolean {
    const spec = new OrderDiscountEligibilitySpecification(
      minimumAmount,
      minimumOrderCount
    );
    return spec.isSatisfiedBy({ order, customer });
  }

  /**
   * 验证免费配送资格
   */
  validateFreeShippingEligibility(
    order: Order,
    minimumAmount: Money,
    eligibleRegions: string[]
  ): boolean {
    const spec = new FreeShippingEligibilitySpecification(
      minimumAmount,
      eligibleRegions
    );
    return spec.isSatisfiedBy(order);
  }

  /**
   * 验证订单取消资格
   */
  validateOrderCancellation(order: Order, maxHours: number = 24): boolean {
    const spec = new OrderCancellationSpecification(maxHours);
    return spec.isSatisfiedBy(order);
  }

  /**
   * 验证VIP折扣资格
   */
  validateVipDiscountEligibility(
    order: Order,
    customer: User,
    customerHistory: { totalOrders: number; totalAmount: Money },
    minimumOrders: number,
    minimumAmount: Money
  ): boolean {
    const spec = new VipDiscountEligibilitySpecification(
      minimumOrders,
      minimumAmount
    );
    return spec.isSatisfiedBy({
      order,
      customer,
      customerOrderHistory: customerHistory,
    });
  }

  /**
   * 验证急速配送资格
   */
  validateExpressDeliveryEligibility(
    order: Order,
    eligibleCities: string[],
    maxWeight: number,
    additionalFee: Money
  ): boolean {
    const spec = new ExpressDeliveryEligibilitySpecification(
      eligibleCities,
      maxWeight,
      additionalFee
    );
    return spec.isSatisfiedBy(order);
  }

  /**
   * 验证用户VIP等级
   */
  validateVipLevel(
    user: User,
    totalSpent: Money,
    orderCount: number,
    membershipDuration: number,
    level: "bronze" | "silver" | "gold" | "platinum"
  ): boolean {
    const requirements = this.getVipRequirements(level);
    const spec = new VipLevelSpecification(level, requirements);
    return spec.isSatisfiedBy({
      user,
      totalSpent,
      orderCount,
      membershipDuration,
    });
  }

  /**
   * 验证特殊优惠资格
   */
  validateSpecialOfferEligibility(
    user: User,
    lastOrderDate: Date,
    isFirstTimeCustomer: boolean,
    maxDaysSinceLastOrder: number = 30
  ): boolean {
    const spec = new SpecialOfferEligibilitySpecification(
      maxDaysSinceLastOrder,
      true
    );
    return spec.isSatisfiedBy({ user, lastOrderDate, isFirstTimeCustomer });
  }

  /**
   * 验证商品可购买性
   */
  validateProductPurchasability(
    product: Product,
    requestedQuantity: number,
    minimumStockLevel: number = 1,
    allowBackorder: boolean = false
  ): boolean {
    const spec = new ProductPurchasabilitySpecification(
      minimumStockLevel,
      allowBackorder
    );
    return spec.isSatisfiedBy({ product, requestedQuantity });
  }

  /**
   * 检查库存警告
   */
  checkLowStockWarning(
    product: Product,
    warningThreshold: number = 10,
    criticalThreshold: number = 5
  ): { needsWarning: boolean; isCritical: boolean } {
    const spec = new LowStockWarningSpecification(
      warningThreshold,
      criticalThreshold
    );
    return {
      needsWarning: spec.isSatisfiedBy(product),
      isCritical: spec.isCriticalStock(product),
    };
  }

  /**
   * 验证价格合理性
   */
  validatePriceReasonability(
    product: Product,
    categoryAveragePrice: Money,
    maxDeviationPercentage: number = 50
  ): boolean {
    const spec = new PriceReasonabilitySpecification(maxDeviationPercentage);
    return spec.isSatisfiedBy({ product, categoryAveragePrice });
  }

  /**
   * 验证促销资格
   */
  validatePromotionEligibility(
    product: Product,
    inventoryTurnoverRate: number,
    daysInStock: number,
    eligibleCategories: string[]
  ): boolean {
    const spec = new PromotionEligibilitySpecification(
      2.0,
      60,
      eligibleCategories
    );
    return spec.isSatisfiedBy({ product, inventoryTurnoverRate, daysInStock });
  }

  /**
   * 验证批发资格
   */
  validateWholesaleEligibility(
    product: Product,
    requestedQuantity: number,
    customerType: "individual" | "enterprise",
    minimumQuantity: number = 100
  ): boolean {
    const spec = new WholesaleEligibilitySpecification(minimumQuantity, [
      "enterprise",
    ]);
    return spec.isSatisfiedBy({ product, requestedQuantity, customerType });
  }

  /**
   * 复合订单验证
   */
  validateCompleteOrder(
    order: Order,
    customer: User,
    products: Product[]
  ): {
    isValid: boolean;
    canProceed: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    let isValid = true;
    let canProceed = true;

    // 验证订单基本信息
    if (!customer.isActive) {
      errors.push("客户账户未激活");
      isValid = false;
      canProceed = false;
    }

    // 验证订单项
    for (const orderItem of order.orderItems) {
      const product = products.find((p) => p.id === orderItem.productId);
      if (!product) {
        errors.push(`商品 ${orderItem.productId} 不存在`);
        isValid = false;
        canProceed = false;
        continue;
      }

      // 验证商品可购买性
      if (!this.validateProductPurchasability(product, orderItem.quantity)) {
        errors.push(`商品 ${product.name} 不可购买或库存不足`);
        isValid = false;
        canProceed = false;
      }

      // 检查库存警告
      const stockCheck = this.checkLowStockWarning(product);
      if (stockCheck.isCritical) {
        warnings.push(`商品 ${product.name} 库存严重不足`);
        isValid = false;
      } else if (stockCheck.needsWarning) {
        warnings.push(`商品 ${product.name} 库存较低`);
      }
    }

    // 验证订单取消条件（预检查）
    if (!this.validateOrderCancellation(order)) {
      warnings.push("订单创建后将无法取消");
    }

    return {
      isValid,
      canProceed,
      warnings,
      errors,
    };
  }

  /**
   * 获取VIP等级要求
   */
  private getVipRequirements(level: "bronze" | "silver" | "gold" | "platinum") {
    const requirements = {
      bronze: {
        minimumSpent: new Money(1000, "CNY"),
        minimumOrders: 5,
        minimumMembershipDays: 30,
      },
      silver: {
        minimumSpent: new Money(5000, "CNY"),
        minimumOrders: 20,
        minimumMembershipDays: 90,
      },
      gold: {
        minimumSpent: new Money(20000, "CNY"),
        minimumOrders: 50,
        minimumMembershipDays: 180,
      },
      platinum: {
        minimumSpent: new Money(100000, "CNY"),
        minimumOrders: 200,
        minimumMembershipDays: 365,
      },
    };

    return requirements[level];
  }

  /**
   * 创建订单验证器
   */
  createOrderValidator(): SpecificationValidator<{
    order: Order;
    customer: User;
  }> {
    const validator = new SpecificationValidator<{
      order: Order;
      customer: User;
    }>();

    // 添加基本验证规约
    validator.addSpecification(
      new OrderDiscountEligibilitySpecification(new Money(100, "CNY"), 1)
    );

    return validator;
  }

  /**
   * 创建用户验证器
   */
  createUserValidator(): SpecificationValidator<User> {
    const validator = new SpecificationValidator<User>();

    // 添加用户基本验证
    // 这里可以添加更多的用户验证规约

    return validator;
  }

  /**
   * 创建商品验证器
   */
  createProductValidator(): SpecificationValidator<Product> {
    const validator = new SpecificationValidator<Product>();

    // 添加商品基本验证
    validator.addSpecification(new LowStockWarningSpecification(5, 1));

    return validator;
  }
}
