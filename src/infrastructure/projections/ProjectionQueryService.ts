import {
  OrderSummaryProjection,
  OrderSummaryReadModel,
  OrderStatisticsReadModel,
} from "./OrderSummaryProjection";
import {
  UserProfileProjection,
  UserProfileReadModel,
  UserStatisticsReadModel,
} from "./UserProfileProjection";
import {
  ProductCatalogProjection,
  ProductCatalogReadModel,
  ProductStatisticsReadModel,
} from "./ProductCatalogProjection";

/**
 * 分页结果接口
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 查询选项接口
 */
export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * 投影查询服务
 * 提供统一的查询接口，管理所有投影的查询操作
 */
export class ProjectionQueryService {
  constructor(
    private orderSummaryProjection: OrderSummaryProjection,
    private userProfileProjection: UserProfileProjection,
    private productCatalogProjection: ProductCatalogProjection
  ) {}

  // ==================== 订单查询 ====================

  /**
   * 获取订单摘要
   */
  async getOrderSummary(
    orderId: string
  ): Promise<OrderSummaryReadModel | null> {
    return this.orderSummaryProjection.getOrderSummary(orderId);
  }

  /**
   * 分页查询订单
   */
  async getOrdersPaginated(
    options: QueryOptions & {
      statusFilter?: string;
    } = {}
  ): Promise<PaginatedResult<OrderSummaryReadModel>> {
    const { page = 1, pageSize = 20, statusFilter } = options;

    const result = await this.orderSummaryProjection.getOrdersPaginated(
      page,
      pageSize,
      statusFilter
    );

    return {
      data: result.orders,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  /**
   * 搜索订单
   */
  async searchOrders(query: {
    orderNumber?: string;
    customerId?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<OrderSummaryReadModel[]> {
    return this.orderSummaryProjection.searchOrders(query);
  }

  /**
   * 获取订单统计
   */
  async getOrderStatistics(): Promise<OrderStatisticsReadModel> {
    return this.orderSummaryProjection.getStatistics();
  }

  /**
   * 获取客户订单历史
   */
  async getCustomerOrderHistory(
    customerId: string
  ): Promise<OrderSummaryReadModel[]> {
    return this.orderSummaryProjection.searchOrders({ customerId });
  }

  // ==================== 用户查询 ====================

  /**
   * 获取用户档案
   */
  async getUserProfile(userId: string): Promise<UserProfileReadModel | null> {
    return this.userProfileProjection.getUserProfile(userId);
  }

  /**
   * 分页查询用户档案
   */
  async getUserProfilesPaginated(
    options: QueryOptions & {
      isActive?: boolean;
      vipLevel?: string;
      minTotalSpent?: number;
      maxTotalSpent?: number;
    } = {}
  ): Promise<PaginatedResult<UserProfileReadModel>> {
    const {
      page = 1,
      pageSize = 20,
      isActive,
      vipLevel,
      minTotalSpent,
      maxTotalSpent,
    } = options;

    const filters: {
      isActive?: boolean;
      vipLevel?: string;
      minTotalSpent?: number;
      maxTotalSpent?: number;
    } = {};

    if (isActive !== undefined) filters.isActive = isActive;
    if (vipLevel !== undefined) filters.vipLevel = vipLevel;
    if (minTotalSpent !== undefined) filters.minTotalSpent = minTotalSpent;
    if (maxTotalSpent !== undefined) filters.maxTotalSpent = maxTotalSpent;

    const result = await this.userProfileProjection.getUserProfilesPaginated(
      page,
      pageSize,
      filters
    );

    return {
      data: result.users,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  /**
   * 搜索用户档案
   */
  async searchUserProfiles(query: {
    name?: string;
    email?: string;
    vipLevel?: string;
    isActive?: boolean;
    minTotalSpent?: number;
    maxTotalSpent?: number;
    minTotalOrders?: number;
    maxTotalOrders?: number;
  }): Promise<UserProfileReadModel[]> {
    return this.userProfileProjection.searchUserProfiles(query);
  }

  /**
   * 获取用户统计
   */
  async getUserStatistics(): Promise<UserStatisticsReadModel> {
    return this.userProfileProjection.getStatistics();
  }

  /**
   * 获取VIP用户
   */
  async getVipUsers(): Promise<UserProfileReadModel[]> {
    return this.userProfileProjection.getVipUsers();
  }

  /**
   * 获取高价值客户
   */
  async getHighValueCustomers(
    limit: number = 50
  ): Promise<UserProfileReadModel[]> {
    return this.userProfileProjection.getHighValueCustomers(limit);
  }

  /**
   * 获取活跃客户
   */
  async getActiveCustomers(
    limit: number = 50
  ): Promise<UserProfileReadModel[]> {
    return this.userProfileProjection.getActiveCustomers(limit);
  }

  // ==================== 商品查询 ====================

  /**
   * 获取商品详情
   */
  async getProduct(productId: string): Promise<ProductCatalogReadModel | null> {
    return this.productCatalogProjection.getProduct(productId);
  }

  /**
   * 分页查询商品
   */
  async getProductsPaginated(
    options: QueryOptions & {
      category?: string;
      isActive?: boolean;
      isInStock?: boolean;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
    } = {}
  ): Promise<PaginatedResult<ProductCatalogReadModel>> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      category,
      isActive,
      isInStock,
      minPrice,
      maxPrice,
      minRating,
    } = options;

    const filters: {
      category?: string;
      isActive?: boolean;
      isInStock?: boolean;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
    } = {};

    if (category !== undefined) filters.category = category;
    if (isActive !== undefined) filters.isActive = isActive;
    if (isInStock !== undefined) filters.isInStock = isInStock;
    if (minPrice !== undefined) filters.minPrice = minPrice;
    if (maxPrice !== undefined) filters.maxPrice = maxPrice;
    if (minRating !== undefined) filters.minRating = minRating;

    const result = await this.productCatalogProjection.getProductsPaginated(
      page,
      pageSize,
      filters,
      sortBy as any,
      sortOrder
    );

    return {
      data: result.products,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  /**
   * 搜索商品
   */
  async searchProducts(query: {
    keyword?: string;
    category?: string;
    priceRange?: [number, number];
    tags?: string[];
    isActive?: boolean;
    isInStock?: boolean;
    minRating?: number;
  }): Promise<ProductCatalogReadModel[]> {
    return this.productCatalogProjection.searchProducts(query);
  }

  /**
   * 获取商品统计
   */
  async getProductStatistics(): Promise<ProductStatisticsReadModel> {
    return this.productCatalogProjection.getStatistics();
  }

  /**
   * 获取分类商品
   */
  async getProductsByCategory(
    category: string
  ): Promise<ProductCatalogReadModel[]> {
    return this.productCatalogProjection.getProductsByCategory(category);
  }

  /**
   * 获取热销商品
   */
  async getBestSellingProducts(
    limit: number = 20
  ): Promise<ProductCatalogReadModel[]> {
    return this.productCatalogProjection.getBestSellingProducts(limit);
  }

  /**
   * 获取推荐商品
   */
  async getRecommendedProducts(
    limit: number = 20
  ): Promise<ProductCatalogReadModel[]> {
    return this.productCatalogProjection.getRecommendedProducts(limit);
  }

  /**
   * 获取新品
   */
  async getNewProducts(limit: number = 20): Promise<ProductCatalogReadModel[]> {
    return this.productCatalogProjection.getNewProducts(limit);
  }

  /**
   * 获取低库存商品
   */
  async getLowStockProducts(
    threshold: number = 5
  ): Promise<ProductCatalogReadModel[]> {
    return this.productCatalogProjection.getLowStockProducts(threshold);
  }

  // ==================== 综合分析查询 ====================

  /**
   * 获取客户全景视图
   */
  async getCustomerInsights(customerId: string): Promise<{
    profile: UserProfileReadModel | null;
    orderHistory: OrderSummaryReadModel[];
    totalSpent: number;
    averageOrderValue: number;
    favoriteCategories: string[];
    lastOrderDate?: Date;
    orderTrend: { month: string; orderCount: number; totalAmount: number }[];
  }> {
    const profile = await this.getUserProfile(customerId);
    const orderHistory = await this.getCustomerOrderHistory(customerId);

    const totalSpent = orderHistory.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const averageOrderValue =
      orderHistory.length > 0 ? totalSpent / orderHistory.length : 0;
    const lastOrderDate =
      orderHistory.length > 0
        ? new Date(Math.max(...orderHistory.map((o) => o.createdAt.getTime())))
        : undefined;

    // 计算喜爱的分类（这里简化处理，实际应该从订单商品分析）
    const favoriteCategories: string[] = [];

    // 计算订单趋势（按月统计）
    const orderTrend: {
      month: string;
      orderCount: number;
      totalAmount: number;
    }[] = [];
    const monthlyData: Record<string, { count: number; amount: number }> = {};

    for (const order of orderHistory) {
      const monthKey = order.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, amount: 0 };
      }
      monthlyData[monthKey].count++;
      monthlyData[monthKey].amount += order.totalAmount;
    }

    for (const [month, data] of Object.entries(monthlyData)) {
      orderTrend.push({
        month,
        orderCount: data.count,
        totalAmount: data.amount,
      });
    }

    orderTrend.sort((a, b) => a.month.localeCompare(b.month));

    const result: {
      profile: UserProfileReadModel | null;
      orderHistory: OrderSummaryReadModel[];
      totalSpent: number;
      averageOrderValue: number;
      favoriteCategories: string[];
      lastOrderDate?: Date;
      orderTrend: { month: string; orderCount: number; totalAmount: number }[];
    } = {
      profile,
      orderHistory,
      totalSpent,
      averageOrderValue,
      favoriteCategories,
      orderTrend,
    };

    if (lastOrderDate !== undefined) {
      result.lastOrderDate = lastOrderDate;
    }

    return result;
  }

  /**
   * 获取商品全景视图
   */
  async getProductInsights(productId: string): Promise<{
    product: ProductCatalogReadModel | null;
    salesHistory: { date: Date; quantity: number; revenue: number }[];
    totalRevenue: number;
    conversionRate: number;
    customerReviews: { rating: number; count: number }[];
    competitorComparison?: any;
  }> {
    const product = await this.getProduct(productId);

    if (!product) {
      return {
        product: null,
        salesHistory: [],
        totalRevenue: 0,
        conversionRate: 0,
        customerReviews: [],
      };
    }

    // 这里简化处理，实际应该从事件历史中分析
    const totalRevenue = product.totalSales * product.price;
    const conversionRate =
      product.viewCount > 0 ? product.totalSales / product.viewCount : 0;

    return {
      product,
      salesHistory: [], // 需要从事件历史中分析
      totalRevenue,
      conversionRate,
      customerReviews: [], // 需要从评价事件中分析
    };
  }

  /**
   * 获取业务仪表盘数据
   */
  async getDashboardData(): Promise<{
    orderStats: OrderStatisticsReadModel;
    userStats: UserStatisticsReadModel;
    productStats: ProductStatisticsReadModel;
    recentOrders: OrderSummaryReadModel[];
    topProducts: ProductCatalogReadModel[];
    newCustomers: UserProfileReadModel[];
    alerts: {
      type: "info" | "warning" | "error";
      message: string;
    }[];
  }> {
    const [orderStats, userStats, productStats] = await Promise.all([
      this.getOrderStatistics(),
      this.getUserStatistics(),
      this.getProductStatistics(),
    ]);

    const [recentOrders, topProducts, newCustomers] = await Promise.all([
      this.getOrdersPaginated({ page: 1, pageSize: 10 }),
      this.getBestSellingProducts(10),
      this.getUserProfilesPaginated({
        page: 1,
        pageSize: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    ]);

    // 生成警告信息
    const alerts: { type: "info" | "warning" | "error"; message: string }[] =
      [];

    if (productStats.lowStockProducts.length > 0) {
      alerts.push({
        type: "warning",
        message: `有 ${productStats.lowStockProducts.length} 个商品库存不足`,
      });
    }

    if (productStats.outOfStockProducts > 0) {
      alerts.push({
        type: "error",
        message: `有 ${productStats.outOfStockProducts} 个商品已缺货`,
      });
    }

    const activeRate =
      userStats.totalUsers > 0
        ? userStats.activeUsers / userStats.totalUsers
        : 0;
    if (activeRate < 0.5) {
      alerts.push({
        type: "warning",
        message: `用户活跃率较低 (${(activeRate * 100).toFixed(1)}%)`,
      });
    }

    return {
      orderStats,
      userStats,
      productStats,
      recentOrders: recentOrders.data,
      topProducts,
      newCustomers: newCustomers.data,
      alerts,
    };
  }

  /**
   * 获取所有投影的健康状态
   */
  async getProjectionHealthStatus(): Promise<{
    isHealthy: boolean;
    projections: {
      name: string;
      status: string;
      lastUpdated: Date;
    }[];
    issues: string[];
  }> {
    const projections = [
      {
        name: "OrderSummary",
        projection: this.orderSummaryProjection,
      },
      {
        name: "UserProfile",
        projection: this.userProfileProjection,
      },
      {
        name: "ProductCatalog",
        projection: this.productCatalogProjection,
      },
    ];

    const projectionStatuses = await Promise.all(
      projections.map(async ({ name, projection }) => {
        const status = await projection.getStatus();
        return {
          name,
          status: status.isRunning ? "运行中" : "空闲",
          lastUpdated: status.updatedAt,
        };
      })
    );

    const issues: string[] = [];
    let isHealthy = true;

    // 检查投影健康状态
    for (const status of projectionStatuses) {
      const timeSinceUpdate = Date.now() - status.lastUpdated.getTime();
      const maxUpdateDelay = 10 * 60 * 1000; // 10分钟

      if (timeSinceUpdate > maxUpdateDelay) {
        issues.push(`投影 ${status.name} 长时间未更新`);
        isHealthy = false;
      }
    }

    return {
      isHealthy,
      projections: projectionStatuses,
      issues,
    };
  }
}
