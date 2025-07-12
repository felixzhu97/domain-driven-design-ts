import { Specification } from "../../shared/specifications/Specification";
import { User, UserStatus } from "../entities/User";
import { Money } from "../value-objects/Money";

/**
 * 用户VIP等级规约
 */
export class VipLevelSpecification extends Specification<{
  user: User;
  totalSpent: Money;
  orderCount: number;
  membershipDuration: number; // 会员天数
}> {
  constructor(
    private readonly level: "bronze" | "silver" | "gold" | "platinum",
    private readonly requirements: {
      minimumSpent: Money;
      minimumOrders: number;
      minimumMembershipDays: number;
    }
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    user: User;
    totalSpent: Money;
    orderCount: number;
    membershipDuration: number;
  }): boolean {
    const { user, totalSpent, orderCount, membershipDuration } = candidate;

    // 用户必须是活跃状态
    if (!user.isActive) {
      return false;
    }

    // 检查消费金额
    const meetsSpendingRequirement = totalSpent.isGreaterThanOrEqual(
      this.requirements.minimumSpent
    );

    // 检查订单数量
    const meetsOrderRequirement = orderCount >= this.requirements.minimumOrders;

    // 检查会员时长
    const meetsMembershipRequirement =
      membershipDuration >= this.requirements.minimumMembershipDays;

    return (
      meetsSpendingRequirement &&
      meetsOrderRequirement &&
      meetsMembershipRequirement
    );
  }

  getDescription(): string {
    return (
      `${this.level.toUpperCase()}等级要求：消费满${this.requirements.minimumSpent.toString()}，` +
      `订单数不少于${this.requirements.minimumOrders}，` +
      `会员时长不少于${this.requirements.minimumMembershipDays}天`
    );
  }
}

/**
 * 用户可以享受特殊优惠的规约
 */
export class SpecialOfferEligibilitySpecification extends Specification<{
  user: User;
  lastOrderDate: Date;
  isFirstTimeCustomer: boolean;
}> {
  constructor(
    private readonly maxDaysSinceLastOrder: number,
    private readonly includeFirstTimeCustomers: boolean
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    user: User;
    lastOrderDate: Date;
    isFirstTimeCustomer: boolean;
  }): boolean {
    const { user, lastOrderDate, isFirstTimeCustomer } = candidate;

    // 用户必须是活跃状态
    if (!user.isActive) {
      return false;
    }

    // 首次购买客户的特殊处理
    if (isFirstTimeCustomer && this.includeFirstTimeCustomers) {
      return true;
    }

    // 检查最后一次订单时间
    const now = new Date();
    const daysSinceLastOrder = Math.floor(
      (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceLastOrder <= this.maxDaysSinceLastOrder;
  }

  getDescription(): string {
    let description = `最后订单时间不超过${this.maxDaysSinceLastOrder}天`;
    if (this.includeFirstTimeCustomers) {
      description += "或首次购买客户";
    }
    return description;
  }
}

/**
 * 用户可以参与活动的规约
 */
export class ActivityParticipationSpecification extends Specification<{
  user: User;
  registrationDate: Date;
  hasCompletedProfile: boolean;
  hasVerifiedEmail: boolean;
}> {
  constructor(
    private readonly minimumRegistrationDays: number,
    private readonly requireCompleteProfile: boolean,
    private readonly requireVerifiedEmail: boolean
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    user: User;
    registrationDate: Date;
    hasCompletedProfile: boolean;
    hasVerifiedEmail: boolean;
  }): boolean {
    const { user, registrationDate, hasCompletedProfile, hasVerifiedEmail } =
      candidate;

    // 用户必须是活跃状态
    if (!user.isActive) {
      return false;
    }

    // 检查注册时间
    const now = new Date();
    const daysSinceRegistration = Math.floor(
      (now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const meetsRegistrationRequirement =
      daysSinceRegistration >= this.minimumRegistrationDays;

    // 检查资料完整性
    const meetsProfileRequirement =
      !this.requireCompleteProfile || hasCompletedProfile;

    // 检查邮箱验证
    const meetsEmailRequirement =
      !this.requireVerifiedEmail || hasVerifiedEmail;

    return (
      meetsRegistrationRequirement &&
      meetsProfileRequirement &&
      meetsEmailRequirement
    );
  }

  getDescription(): string {
    let requirements = [`注册时间不少于${this.minimumRegistrationDays}天`];

    if (this.requireCompleteProfile) {
      requirements.push("资料完整");
    }

    if (this.requireVerifiedEmail) {
      requirements.push("邮箱已验证");
    }

    return requirements.join("且");
  }
}

/**
 * 用户信用等级规约
 */
export class CreditLevelSpecification extends Specification<{
  user: User;
  paymentHistory: {
    totalOrders: number;
    onTimePayments: number;
    cancelledOrders: number;
    refundedOrders: number;
  };
}> {
  constructor(
    private readonly minimumOnTimePaymentRate: number, // 0-1之间的比例
    private readonly maxCancellationRate: number // 0-1之间的比例
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    user: User;
    paymentHistory: {
      totalOrders: number;
      onTimePayments: number;
      cancelledOrders: number;
      refundedOrders: number;
    };
  }): boolean {
    const { user, paymentHistory } = candidate;

    // 用户必须是活跃状态
    if (!user.isActive) {
      return false;
    }

    // 必须有足够的历史订单数据
    if (paymentHistory.totalOrders < 5) {
      return false;
    }

    // 计算按时付款比例
    const onTimePaymentRate =
      paymentHistory.onTimePayments / paymentHistory.totalOrders;

    // 计算取消订单比例
    const cancellationRate =
      paymentHistory.cancelledOrders / paymentHistory.totalOrders;

    return (
      onTimePaymentRate >= this.minimumOnTimePaymentRate &&
      cancellationRate <= this.maxCancellationRate
    );
  }

  getDescription(): string {
    return (
      `按时付款比例不低于${(this.minimumOnTimePaymentRate * 100).toFixed(
        1
      )}%且` +
      `取消订单比例不超过${(this.maxCancellationRate * 100).toFixed(1)}%`
    );
  }
}

/**
 * 用户可以享受批量折扣的规约
 */
export class BulkDiscountEligibilitySpecification extends Specification<{
  user: User;
  orderItemCount: number;
  orderValue: Money;
  customerType: "individual" | "enterprise";
}> {
  constructor(
    private readonly minimumItemCount: number,
    private readonly minimumOrderValue: Money,
    private readonly preferredCustomerTypes: ("individual" | "enterprise")[]
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    user: User;
    orderItemCount: number;
    orderValue: Money;
    customerType: "individual" | "enterprise";
  }): boolean {
    const { user, orderItemCount, orderValue, customerType } = candidate;

    // 用户必须是活跃状态
    if (!user.isActive) {
      return false;
    }

    // 检查客户类型
    const isEligibleCustomerType =
      this.preferredCustomerTypes.includes(customerType);

    // 检查商品数量
    const meetsItemCountRequirement = orderItemCount >= this.minimumItemCount;

    // 检查订单金额
    const meetsValueRequirement = orderValue.isGreaterThanOrEqual(
      this.minimumOrderValue
    );

    return (
      isEligibleCustomerType &&
      meetsItemCountRequirement &&
      meetsValueRequirement
    );
  }

  getDescription(): string {
    return (
      `客户类型为${this.preferredCustomerTypes.join("或")}且` +
      `商品数量不少于${this.minimumItemCount}且` +
      `订单金额不少于${this.minimumOrderValue.toString()}`
    );
  }
}

/**
 * 用户账户安全规约
 */
export class AccountSecuritySpecification extends Specification<{
  user: User;
  lastPasswordChange: Date;
  hasSecondFactorAuth: boolean;
  recentLoginAttempts: number;
}> {
  constructor(
    private readonly maxPasswordAgeDays: number,
    private readonly requireSecondFactor: boolean,
    private readonly maxRecentLoginAttempts: number
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    user: User;
    lastPasswordChange: Date;
    hasSecondFactorAuth: boolean;
    recentLoginAttempts: number;
  }): boolean {
    const {
      user,
      lastPasswordChange,
      hasSecondFactorAuth,
      recentLoginAttempts,
    } = candidate;

    // 用户必须是活跃状态
    if (!user.isActive) {
      return false;
    }

    // 检查密码更新时间
    const now = new Date();
    const daysSincePasswordChange = Math.floor(
      (now.getTime() - lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24)
    );
    const passwordNotExpired =
      daysSincePasswordChange <= this.maxPasswordAgeDays;

    // 检查双因素认证
    const meetsSecondFactorRequirement =
      !this.requireSecondFactor || hasSecondFactorAuth;

    // 检查最近登录尝试次数
    const loginAttemptsAcceptable =
      recentLoginAttempts <= this.maxRecentLoginAttempts;

    return (
      passwordNotExpired &&
      meetsSecondFactorRequirement &&
      loginAttemptsAcceptable
    );
  }

  getDescription(): string {
    let requirements = [`密码更新时间不超过${this.maxPasswordAgeDays}天`];

    if (this.requireSecondFactor) {
      requirements.push("已启用双因素认证");
    }

    requirements.push(`最近登录尝试次数不超过${this.maxRecentLoginAttempts}次`);

    return requirements.join("且");
  }
}
