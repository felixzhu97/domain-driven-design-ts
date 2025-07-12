import { Specification } from "../../shared/specifications/Specification";
import { Product, ProductStatus } from "../entities/Product";
import { Money } from "../value-objects/Money";
import { ProductCategory } from "../value-objects/ProductCategory";

/**
 * 商品可购买性规约
 */
export class ProductPurchasabilitySpecification extends Specification<{
  product: Product;
  requestedQuantity: number;
}> {
  constructor(
    private readonly minimumStockLevel: number = 1,
    private readonly allowBackorder: boolean = false
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    product: Product;
    requestedQuantity: number;
  }): boolean {
    const { product, requestedQuantity } = candidate;

    // 商品必须是活跃状态
    if (!product.isActive) {
      return false;
    }

    // 检查库存状态
    if (!product.isInStock && !this.allowBackorder) {
      return false;
    }

    // 检查请求数量
    if (requestedQuantity <= 0) {
      return false;
    }

    // 检查库存是否足够
    if (!this.allowBackorder && product.stock < requestedQuantity) {
      return false;
    }

    // 检查最小库存水平
    if (product.stock < this.minimumStockLevel && !this.allowBackorder) {
      return false;
    }

    return true;
  }

  getDescription(): string {
    let description = "商品状态为活跃且库存充足";
    if (this.allowBackorder) {
      description += "（允许缺货预订）";
    }
    return description;
  }
}

/**
 * 商品库存警告规约
 */
export class LowStockWarningSpecification extends Specification<Product> {
  constructor(
    private readonly warningThreshold: number,
    private readonly criticalThreshold: number
  ) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.isActive && product.stock <= this.warningThreshold;
  }

  getDescription(): string {
    return `库存量低于${this.warningThreshold}需要警告`;
  }

  /**
   * 检查是否为严重库存不足
   */
  isCriticalStock(product: Product): boolean {
    return product.isActive && product.stock <= this.criticalThreshold;
  }
}

/**
 * 商品价格合理性规约
 */
export class PriceReasonabilitySpecification extends Specification<{
  product: Product;
  categoryAveragePrice: Money;
}> {
  constructor(
    private readonly maxDeviationPercentage: number = 50 // 最大偏差百分比
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    product: Product;
    categoryAveragePrice: Money;
  }): boolean {
    const { product, categoryAveragePrice } = candidate;

    // 如果类别平均价格为0，则无法判断
    if (categoryAveragePrice.isZero()) {
      return true;
    }

    // 计算价格偏差
    const priceDifference = product.price.subtract(categoryAveragePrice);
    const deviationPercentage =
      Math.abs(priceDifference.amount / categoryAveragePrice.amount) * 100;

    return deviationPercentage <= this.maxDeviationPercentage;
  }

  getDescription(): string {
    return `商品价格偏差不超过同类商品平均价格的${this.maxDeviationPercentage}%`;
  }
}

/**
 * 商品促销资格规约
 */
export class PromotionEligibilitySpecification extends Specification<{
  product: Product;
  inventoryTurnoverRate: number;
  daysInStock: number;
}> {
  constructor(
    private readonly minimumTurnoverRate: number,
    private readonly maxDaysInStock: number,
    private readonly eligibleCategories: string[]
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    product: Product;
    inventoryTurnoverRate: number;
    daysInStock: number;
  }): boolean {
    const { product, inventoryTurnoverRate, daysInStock } = candidate;

    // 商品必须是活跃状态
    if (!product.isActive) {
      return false;
    }

    // 检查商品类别
    const isCategoryEligible = this.eligibleCategories.includes(
      product.category.name
    );

    // 检查库存周转率
    const meetsTurnoverRequirement =
      inventoryTurnoverRate >= this.minimumTurnoverRate;

    // 检查库存时间
    const meetsStockDaysRequirement = daysInStock <= this.maxDaysInStock;

    return (
      isCategoryEligible &&
      (meetsTurnoverRequirement || meetsStockDaysRequirement)
    );
  }

  getDescription(): string {
    return `商品类别在促销范围内且（库存周转率不低于${this.minimumTurnoverRate}或库存时间超过${this.maxDaysInStock}天）`;
  }
}

/**
 * 商品质量保证规约
 */
export class QualityAssuranceSpecification extends Specification<{
  product: Product;
  defectRate: number;
  returnRate: number;
  reviewScore: number;
}> {
  constructor(
    private readonly maxDefectRate: number,
    private readonly maxReturnRate: number,
    private readonly minReviewScore: number
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    product: Product;
    defectRate: number;
    returnRate: number;
    reviewScore: number;
  }): boolean {
    const { product, defectRate, returnRate, reviewScore } = candidate;

    // 商品必须是活跃状态
    if (!product.isActive) {
      return false;
    }

    // 检查缺陷率
    const meetsDefectRateRequirement = defectRate <= this.maxDefectRate;

    // 检查退货率
    const meetsReturnRateRequirement = returnRate <= this.maxReturnRate;

    // 检查评分
    const meetsReviewScoreRequirement = reviewScore >= this.minReviewScore;

    return (
      meetsDefectRateRequirement &&
      meetsReturnRateRequirement &&
      meetsReviewScoreRequirement
    );
  }

  getDescription(): string {
    return (
      `缺陷率不超过${(this.maxDefectRate * 100).toFixed(1)}%且` +
      `退货率不超过${(this.maxReturnRate * 100).toFixed(1)}%且` +
      `评分不低于${this.minReviewScore}分`
    );
  }
}

/**
 * 商品季节性销售规约
 */
export class SeasonalSalesSpecification extends Specification<{
  product: Product;
  currentSeason: "spring" | "summer" | "autumn" | "winter";
  productSeasonality: ("spring" | "summer" | "autumn" | "winter")[];
}> {
  constructor(
    private readonly seasonalDiscount: number = 0.1,
    private readonly offSeasonMarkup: number = 0.05
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    product: Product;
    currentSeason: "spring" | "summer" | "autumn" | "winter";
    productSeasonality: ("spring" | "summer" | "autumn" | "winter")[];
  }): boolean {
    const { product, currentSeason, productSeasonality } = candidate;

    // 商品必须是活跃状态
    if (!product.isActive) {
      return false;
    }

    // 检查商品是否为季节性商品
    if (productSeasonality.length === 0) {
      return true; // 非季节性商品总是符合
    }

    // 检查当前季节是否在商品的销售季节内
    return productSeasonality.includes(currentSeason);
  }

  getDescription(): string {
    return "商品在当前季节的销售范围内";
  }

  /**
   * 检查是否为当季商品
   */
  isInSeason(candidate: {
    currentSeason: "spring" | "summer" | "autumn" | "winter";
    productSeasonality: ("spring" | "summer" | "autumn" | "winter")[];
  }): boolean {
    const { currentSeason, productSeasonality } = candidate;
    return productSeasonality.includes(currentSeason);
  }
}

/**
 * 商品批发资格规约
 */
export class WholesaleEligibilitySpecification extends Specification<{
  product: Product;
  requestedQuantity: number;
  customerType: "individual" | "enterprise";
}> {
  constructor(
    private readonly minimumWholesaleQuantity: number,
    private readonly eligibleCustomerTypes: ("individual" | "enterprise")[]
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    product: Product;
    requestedQuantity: number;
    customerType: "individual" | "enterprise";
  }): boolean {
    const { product, requestedQuantity, customerType } = candidate;

    // 商品必须是活跃状态
    if (!product.isActive) {
      return false;
    }

    // 检查客户类型
    const isEligibleCustomerType =
      this.eligibleCustomerTypes.includes(customerType);

    // 检查订购数量
    const meetsQuantityRequirement =
      requestedQuantity >= this.minimumWholesaleQuantity;

    // 检查库存是否足够
    const hasEnoughStock = product.stock >= requestedQuantity;

    return isEligibleCustomerType && meetsQuantityRequirement && hasEnoughStock;
  }

  getDescription(): string {
    return (
      `客户类型为${this.eligibleCustomerTypes.join("或")}且` +
      `订购数量不少于${this.minimumWholesaleQuantity}且库存充足`
    );
  }
}

/**
 * 商品推荐算法规约
 */
export class ProductRecommendationSpecification extends Specification<{
  product: Product;
  userPurchaseHistory: string[]; // 用户购买过的商品类别
  popularityScore: number;
  similarProducts: Product[];
}> {
  constructor(
    private readonly minPopularityScore: number,
    private readonly maxSimilarProducts: number
  ) {
    super();
  }

  isSatisfiedBy(candidate: {
    product: Product;
    userPurchaseHistory: string[];
    popularityScore: number;
    similarProducts: Product[];
  }): boolean {
    const { product, userPurchaseHistory, popularityScore, similarProducts } =
      candidate;

    // 商品必须是活跃状态且有库存
    if (!product.isActive || !product.isInStock) {
      return false;
    }

    // 检查受欢迎程度
    const meetsPopularityRequirement =
      popularityScore >= this.minPopularityScore;

    // 检查是否与用户历史购买相关
    const isRelatedToUserHistory = userPurchaseHistory.includes(
      product.category.name
    );

    // 检查相似商品数量（避免推荐太多相似商品）
    const hasReasonableSimilarity =
      similarProducts.length <= this.maxSimilarProducts;

    return (
      meetsPopularityRequirement &&
      (isRelatedToUserHistory || hasReasonableSimilarity)
    );
  }

  getDescription(): string {
    return `商品受欢迎程度不低于${this.minPopularityScore}且与用户购买历史相关`;
  }
}
