import { Specification } from "../../shared/specifications/Specification";
import { Order, OrderStatus } from "../entities/Order";
import { User } from "../entities/User";
import { Money } from "../value-objects/Money";

/**
 * 订单可以享受折扣的规约
 */
export class OrderDiscountEligibilitySpecification extends Specification<{
  order: Order;
  customer: User;
}> {
  constructor(
    private readonly minimumOrderAmount: Money,
    private readonly minimumOrderCount: number
  ) {
    super();
  }

  isSatisfiedBy(candidate: { order: Order; customer: User }): boolean {
    const { order, customer } = candidate;

    // 订单金额必须达到最低要求
    const meetsMinimumAmount = order.subtotalAmount.isGreaterThanOrEqual(
      this.minimumOrderAmount
    );

    // 客户必须是活跃用户
    const isActiveCustomer = customer.isActive;

    // 这里可以添加更多复杂规则，比如检查客户历史订单数
    // 在实际应用中，这可能需要从仓储中获取数据

    return meetsMinimumAmount && isActiveCustomer;
  }

  getDescription(): string {
    return `订单金额不少于${this.minimumOrderAmount.toString()}且客户为活跃用户`;
  }
}

/**
 * 订单可以免费送货的规约
 */
export class FreeShippingEligibilitySpecification extends Specification<Order> {
  constructor(
    private readonly minimumAmount: Money,
    private readonly eligibleRegions: string[]
  ) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    const meetsMinimumAmount = order.subtotalAmount.isGreaterThanOrEqual(
      this.minimumAmount
    );
    const isEligibleRegion = this.eligibleRegions.includes(
      order.shippingAddress.province
    );

    return meetsMinimumAmount && isEligibleRegion;
  }

  getDescription(): string {
    return `订单金额不少于${this.minimumAmount.toString()}且配送地区在${this.eligibleRegions.join(
      ", "
    )}`;
  }
}

/**
 * 订单可以取消的规约
 */
export class OrderCancellationSpecification extends Specification<Order> {
  constructor(private readonly maxHoursAfterCreation: number = 24) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    // 基本的状态检查
    if (!order.canBeCancelled) {
      return false;
    }

    // 时间限制检查
    const now = new Date();
    const createdAt = order.createdAt;
    const hoursSinceCreation =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceCreation <= this.maxHoursAfterCreation;
  }

  getDescription(): string {
    return `订单状态允许取消且创建时间不超过${this.maxHoursAfterCreation}小时`;
  }
}

/**
 * 订单可以享受VIP折扣的规约
 */
export class VipDiscountEligibilitySpecification extends Specification<{
  order: Order;
  customer: User;
  customerOrderHistory: { totalOrders: number; totalAmount: Money };
}> {
  constructor(
    private readonly minimumHistoryOrders: number,
    private readonly minimumHistoryAmount: Money
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    order: Order;
    customer: User;
    customerOrderHistory: { totalOrders: number; totalAmount: Money };
  }): boolean {
    const { customer, customerOrderHistory } = candidate;

    // 客户必须是活跃用户
    if (!customer.isActive) {
      return false;
    }

    // 检查历史订单数量
    const hasEnoughOrders =
      customerOrderHistory.totalOrders >= this.minimumHistoryOrders;

    // 检查历史订单总金额
    const hasEnoughAmount =
      customerOrderHistory.totalAmount.isGreaterThanOrEqual(
        this.minimumHistoryAmount
      );

    return hasEnoughOrders && hasEnoughAmount;
  }

  getDescription(): string {
    return `客户历史订单数不少于${
      this.minimumHistoryOrders
    }且历史订单总金额不少于${this.minimumHistoryAmount.toString()}`;
  }
}

/**
 * 订单急速配送资格规约
 */
export class ExpressDeliveryEligibilitySpecification extends Specification<Order> {
  constructor(
    private readonly eligibleCities: string[],
    private readonly maxWeight: number,
    private readonly additionalFee: Money
  ) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    // 检查配送城市
    const isCityEligible = this.eligibleCities.includes(
      order.shippingAddress.city
    );

    // 检查订单状态
    const isStatusEligible =
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.PAID;

    // 在实际应用中，这里需要计算订单总重量
    // 这可能需要从商品信息中获取重量数据

    return isCityEligible && isStatusEligible;
  }

  getDescription(): string {
    return `配送城市在${this.eligibleCities.join(", ")}且订单状态允许急速配送`;
  }
}

/**
 * 订单可以使用优惠券的规约
 */
export class CouponUsageEligibilitySpecification extends Specification<{
  order: Order;
  couponCode: string;
  customer: User;
}> {
  constructor(
    private readonly validCoupons: Map<
      string,
      {
        minimumAmount: Money;
        validUntil: Date;
        maxUsagePerCustomer: number;
      }
    >
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    order: Order;
    couponCode: string;
    customer: User;
  }): boolean {
    const { order, couponCode, customer } = candidate;

    // 检查优惠券是否存在
    const couponInfo = this.validCoupons.get(couponCode);
    if (!couponInfo) {
      return false;
    }

    // 检查订单金额是否满足最低要求
    const meetsMinimumAmount = order.subtotalAmount.isGreaterThanOrEqual(
      couponInfo.minimumAmount
    );

    // 检查优惠券是否过期
    const isNotExpired = new Date() <= couponInfo.validUntil;

    // 检查客户是否活跃
    const isActiveCustomer = customer.isActive;

    // 在实际应用中，这里还需要检查客户的优惠券使用历史

    return meetsMinimumAmount && isNotExpired && isActiveCustomer;
  }

  getDescription(): string {
    return "优惠券有效且订单满足使用条件";
  }
}

/**
 * 大客户订单特殊处理规约
 */
export class EnterpriseOrderSpecification extends Specification<{
  order: Order;
  customer: User;
  customerType: "individual" | "enterprise";
}> {
  constructor(private readonly minimumEnterpriseOrderAmount: Money) {
    super();
  }

  isSatisfiedBy(candidate: {
    order: Order;
    customer: User;
    customerType: "individual" | "enterprise";
  }): boolean {
    const { order, customer, customerType } = candidate;

    // 必须是企业客户
    if (customerType !== "enterprise") {
      return false;
    }

    // 客户必须是活跃状态
    if (!customer.isActive) {
      return false;
    }

    // 订单金额必须达到企业订单最低要求
    return order.subtotalAmount.isGreaterThanOrEqual(
      this.minimumEnterpriseOrderAmount
    );
  }

  getDescription(): string {
    return `企业客户且订单金额不少于${this.minimumEnterpriseOrderAmount.toString()}`;
  }
}
