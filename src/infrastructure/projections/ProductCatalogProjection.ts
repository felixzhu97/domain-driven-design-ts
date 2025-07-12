import {
  IEventProjection,
  StoredEvent,
  ProjectionStatus,
} from "../../shared/types/EventStore";

/**
 * 商品目录读模型
 */
export interface ProductCatalogReadModel {
  productId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  sku: string;
  stock: number;
  isActive: boolean;
  isInStock: boolean;
  images: string[];
  tags: string[];
  averageRating: number;
  reviewCount: number;
  totalSales: number;
  viewCount: number;
  lastPurchaseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 商品统计读模型
 */
export interface ProductStatisticsReadModel {
  totalProducts: number;
  activeProducts: number;
  inStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  averagePrice: number;
  productsByCategory: Record<string, number>;
  topSellingProducts: { productId: string; name: string; sales: number }[];
  lowStockProducts: { productId: string; name: string; stock: number }[];
  lastUpdated: Date;
}

/**
 * 商品目录投影
 */
export class ProductCatalogProjection implements IEventProjection {
  public readonly projectionName = "ProductCatalog";
  public readonly supportedEvents = [
    "ProductCreated",
    "ProductUpdated",
    "ProductPriceChanged",
    "ProductStockUpdated",
    "ProductActivated",
    "ProductDeactivated",
    "ProductCategoryChanged",
    "ProductImageAdded",
    "ProductImageRemoved",
    "ProductPurchased",
    "ProductReviewed",
    "ProductViewed",
  ];

  private productCatalog: Map<string, ProductCatalogReadModel> = new Map();
  private statistics: ProductStatisticsReadModel = {
    totalProducts: 0,
    activeProducts: 0,
    inStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0,
    averagePrice: 0,
    productsByCategory: {},
    topSellingProducts: [],
    lowStockProducts: [],
    lastUpdated: new Date(),
  };

  private status: ProjectionStatus = {
    projectionName: this.projectionName,
    lastProcessedEventId: "",
    lastProcessedVersion: 0,
    isRunning: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  /**
   * 处理事件
   */
  async project(event: StoredEvent): Promise<void> {
    try {
      console.log(`🛍️ 处理商品事件: ${event.eventType} (${event.streamId})`);

      switch (event.eventType) {
        case "ProductCreated":
          await this.handleProductCreated(event);
          break;
        case "ProductUpdated":
          await this.handleProductUpdated(event);
          break;
        case "ProductPriceChanged":
          await this.handleProductPriceChanged(event);
          break;
        case "ProductStockUpdated":
          await this.handleProductStockUpdated(event);
          break;
        case "ProductActivated":
          await this.handleProductActivated(event);
          break;
        case "ProductDeactivated":
          await this.handleProductDeactivated(event);
          break;
        case "ProductCategoryChanged":
          await this.handleProductCategoryChanged(event);
          break;
        case "ProductImageAdded":
          await this.handleProductImageAdded(event);
          break;
        case "ProductImageRemoved":
          await this.handleProductImageRemoved(event);
          break;
        case "ProductPurchased":
          await this.handleProductPurchased(event);
          break;
        case "ProductReviewed":
          await this.handleProductReviewed(event);
          break;
        case "ProductViewed":
          await this.handleProductViewed(event);
          break;
        default:
          console.warn(`未知商品事件类型: ${event.eventType}`);
      }

      // 更新统计信息
      this.updateStatistics();

      // 更新投影状态
      this.status.lastProcessedEventId = event.eventId;
      this.status.lastProcessedVersion = event.streamVersion;
      this.status.updatedAt = new Date();
    } catch (error) {
      console.error(`处理商品事件失败: ${event.eventType}`, error);
      throw error;
    }
  }

  /**
   * 处理商品创建事件
   */
  private async handleProductCreated(event: StoredEvent): Promise<void> {
    const eventData = event.eventData as any;

    const product: ProductCatalogReadModel = {
      productId: event.streamId,
      name: eventData.name || "",
      description: eventData.description || "",
      price: eventData.price?.amount || 0,
      currency: eventData.price?.currency || "CNY",
      category: eventData.category?.name || "未分类",
      sku: eventData.sku || "",
      stock: eventData.initialStock || 0,
      isActive: true,
      isInStock: (eventData.initialStock || 0) > 0,
      images: [],
      tags: [],
      averageRating: 0,
      reviewCount: 0,
      totalSales: 0,
      viewCount: 0,
      createdAt: event.occurredOn,
      updatedAt: event.occurredOn,
    };

    this.productCatalog.set(event.streamId, product);
  }

  /**
   * 处理商品更新事件
   */
  private async handleProductUpdated(event: StoredEvent): Promise<void> {
    const product = this.productCatalog.get(event.streamId);
    if (!product) return;

    const eventData = event.eventData as any;

    if (eventData.name) product.name = eventData.name;
    if (eventData.description) product.description = eventData.description;

    product.updatedAt = event.occurredOn;
  }

  /**
   * 处理商品价格变更事件
   */
  private async handleProductPriceChanged(event: StoredEvent): Promise<void> {
    const product = this.productCatalog.get(event.streamId);
    if (!product) return;

    const eventData = event.eventData as any;

    if (eventData.newPrice) {
      product.price = eventData.newPrice.amount || product.price;
      product.currency = eventData.newPrice.currency || product.currency;
    }

    product.updatedAt = event.occurredOn;
  }

  /**
   * 处理商品库存更新事件
   */
  private async handleProductStockUpdated(event: StoredEvent): Promise<void> {
    const product = this.productCatalog.get(event.streamId);
    if (!product) return;

    const eventData = event.eventData as any;

    if (typeof eventData.newStock === "number") {
      product.stock = eventData.newStock;
      product.isInStock = product.stock > 0;
    }

    product.updatedAt = event.occurredOn;
  }

  /**
   * 处理商品激活事件
   */
  private async handleProductActivated(event: StoredEvent): Promise<void> {
    const product = this.productCatalog.get(event.streamId);
    if (!product) return;

    product.isActive = true;
    product.updatedAt = event.occurredOn;
  }

  /**
   * 处理商品停用事件
   */
  private async handleProductDeactivated(event: StoredEvent): Promise<void> {
    const product = this.productCatalog.get(event.streamId);
    if (!product) return;

    product.isActive = false;
    product.updatedAt = event.occurredOn;
  }

  /**
   * 处理商品分类变更事件
   */
  private async handleProductCategoryChanged(
    event: StoredEvent
  ): Promise<void> {
    const product = this.productCatalog.get(event.streamId);
    if (!product) return;

    const eventData = event.eventData as any;

    if (eventData.newCategory) {
      product.category = eventData.newCategory.name || product.category;
    }

    product.updatedAt = event.occurredOn;
  }

  /**
   * 处理商品图片添加事件
   */
  private async handleProductImageAdded(event: StoredEvent): Promise<void> {
    const product = this.productCatalog.get(event.streamId);
    if (!product) return;

    const eventData = event.eventData as any;

    if (eventData.imageUrl && !product.images.includes(eventData.imageUrl)) {
      product.images.push(eventData.imageUrl);
    }

    product.updatedAt = event.occurredOn;
  }

  /**
   * 处理商品图片删除事件
   */
  private async handleProductImageRemoved(event: StoredEvent): Promise<void> {
    const product = this.productCatalog.get(event.streamId);
    if (!product) return;

    const eventData = event.eventData as any;

    if (eventData.imageUrl) {
      product.images = product.images.filter(
        (url) => url !== eventData.imageUrl
      );
    }

    product.updatedAt = event.occurredOn;
  }

  /**
   * 处理商品购买事件
   */
  private async handleProductPurchased(event: StoredEvent): Promise<void> {
    const product = this.productCatalog.get(event.streamId);
    if (!product) return;

    const eventData = event.eventData as any;
    const quantity = eventData.quantity || 1;

    product.totalSales += quantity;
    product.lastPurchaseDate = event.occurredOn;
    product.updatedAt = event.occurredOn;
  }

  /**
   * 处理商品评价事件
   */
  private async handleProductReviewed(event: StoredEvent): Promise<void> {
    const product = this.productCatalog.get(event.streamId);
    if (!product) return;

    const eventData = event.eventData as any;
    const rating = eventData.rating || 0;

    // 计算新的平均评分
    const currentTotal = product.averageRating * product.reviewCount;
    product.reviewCount++;
    product.averageRating = (currentTotal + rating) / product.reviewCount;

    product.updatedAt = event.occurredOn;
  }

  /**
   * 处理商品浏览事件
   */
  private async handleProductViewed(event: StoredEvent): Promise<void> {
    const product = this.productCatalog.get(event.streamId);
    if (!product) return;

    product.viewCount++;
    product.updatedAt = event.occurredOn;
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(): void {
    const products = Array.from(this.productCatalog.values());

    this.statistics.totalProducts = products.length;
    this.statistics.activeProducts = products.filter((p) => p.isActive).length;
    this.statistics.inStockProducts = products.filter(
      (p) => p.isInStock
    ).length;
    this.statistics.outOfStockProducts = products.filter(
      (p) => !p.isInStock
    ).length;

    // 计算总价值和平均价格
    this.statistics.totalValue = products.reduce(
      (sum, p) => sum + p.price * p.stock,
      0
    );
    this.statistics.averagePrice =
      products.length > 0
        ? products.reduce((sum, p) => sum + p.price, 0) / products.length
        : 0;

    // 按分类统计
    this.statistics.productsByCategory = {};
    for (const product of products) {
      this.statistics.productsByCategory[product.category] =
        (this.statistics.productsByCategory[product.category] || 0) + 1;
    }

    // 销量排行榜
    this.statistics.topSellingProducts = products
      .filter((p) => p.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10)
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        sales: p.totalSales,
      }));

    // 低库存商品
    this.statistics.lowStockProducts = products
      .filter((p) => p.isActive && p.stock <= 5 && p.stock > 0)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 20)
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        stock: p.stock,
      }));

    this.statistics.lastUpdated = new Date();
  }

  /**
   * 重置投影
   */
  async reset(): Promise<void> {
    this.productCatalog.clear();
    this.statistics = {
      totalProducts: 0,
      activeProducts: 0,
      inStockProducts: 0,
      outOfStockProducts: 0,
      totalValue: 0,
      averagePrice: 0,
      productsByCategory: {},
      topSellingProducts: [],
      lowStockProducts: [],
      lastUpdated: new Date(),
    };

    this.status = {
      projectionName: this.projectionName,
      lastProcessedEventId: "",
      lastProcessedVersion: 0,
      isRunning: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`🔄 重置投影: ${this.projectionName}`);
  }

  /**
   * 获取投影状态
   */
  async getStatus(): Promise<ProjectionStatus> {
    return { ...this.status };
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<ProductStatisticsReadModel> {
    return { ...this.statistics };
  }

  // 查询方法

  /**
   * 获取商品详情
   */
  async getProduct(productId: string): Promise<ProductCatalogReadModel | null> {
    return this.productCatalog.get(productId) || null;
  }

  /**
   * 获取所有商品
   */
  async getAllProducts(): Promise<ProductCatalogReadModel[]> {
    return Array.from(this.productCatalog.values());
  }

  /**
   * 分页查询商品
   */
  async getProductsPaginated(
    page: number,
    pageSize: number,
    filters?: {
      category?: string;
      isActive?: boolean;
      isInStock?: boolean;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
    },
    sortBy?:
      | "name"
      | "price"
      | "createdAt"
      | "totalSales"
      | "averageRating"
      | "stock",
    sortOrder?: "asc" | "desc"
  ): Promise<{
    products: ProductCatalogReadModel[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    let products = Array.from(this.productCatalog.values());

    // 应用过滤器
    if (filters) {
      if (filters.category) {
        products = products.filter((p) => p.category === filters.category);
      }
      if (filters.isActive !== undefined) {
        products = products.filter((p) => p.isActive === filters.isActive);
      }
      if (filters.isInStock !== undefined) {
        products = products.filter((p) => p.isInStock === filters.isInStock);
      }
      if (filters.minPrice !== undefined) {
        products = products.filter((p) => p.price >= filters.minPrice!);
      }
      if (filters.maxPrice !== undefined) {
        products = products.filter((p) => p.price <= filters.maxPrice!);
      }
      if (filters.minRating !== undefined) {
        products = products.filter(
          (p) => p.averageRating >= filters.minRating!
        );
      }
    }

    // 排序
    if (sortBy) {
      products.sort((a, b) => {
        let aValue: any = a[sortBy];
        let bValue: any = b[sortBy];

        if (sortBy === "createdAt") {
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
        }

        const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return sortOrder === "desc" ? -result : result;
      });
    }

    // 分页
    const total = products.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedProducts = products.slice(startIndex, endIndex);

    return {
      products: pagedProducts,
      total,
      page,
      pageSize,
      totalPages,
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
    let products = Array.from(this.productCatalog.values());

    if (query.keyword) {
      const keyword = query.keyword.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          p.description.toLowerCase().includes(keyword) ||
          p.sku.toLowerCase().includes(keyword)
      );
    }

    if (query.category) {
      products = products.filter((p) => p.category === query.category);
    }

    if (query.priceRange) {
      const [minPrice, maxPrice] = query.priceRange;
      products = products.filter(
        (p) => p.price >= minPrice && p.price <= maxPrice
      );
    }

    if (query.tags && query.tags.length > 0) {
      products = products.filter((p) =>
        query.tags!.some((tag) => p.tags.includes(tag))
      );
    }

    if (query.isActive !== undefined) {
      products = products.filter((p) => p.isActive === query.isActive);
    }

    if (query.isInStock !== undefined) {
      products = products.filter((p) => p.isInStock === query.isInStock);
    }

    if (query.minRating !== undefined) {
      products = products.filter((p) => p.averageRating >= query.minRating!);
    }

    return products.sort((a, b) => b.totalSales - a.totalSales);
  }

  /**
   * 获取分类商品
   */
  async getProductsByCategory(
    category: string
  ): Promise<ProductCatalogReadModel[]> {
    return Array.from(this.productCatalog.values())
      .filter((p) => p.category === category && p.isActive)
      .sort((a, b) => b.totalSales - a.totalSales);
  }

  /**
   * 获取热销商品
   */
  async getBestSellingProducts(
    limit: number = 20
  ): Promise<ProductCatalogReadModel[]> {
    return Array.from(this.productCatalog.values())
      .filter((p) => p.isActive && p.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit);
  }

  /**
   * 获取推荐商品（基于评分和销量）
   */
  async getRecommendedProducts(
    limit: number = 20
  ): Promise<ProductCatalogReadModel[]> {
    return Array.from(this.productCatalog.values())
      .filter((p) => p.isActive && p.isInStock && p.reviewCount > 0)
      .sort((a, b) => {
        // 综合评分（评分权重70%，销量权重30%）
        const scoreA = a.averageRating * 0.7 + (a.totalSales / 100) * 0.3;
        const scoreB = b.averageRating * 0.7 + (b.totalSales / 100) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * 获取新品
   */
  async getNewProducts(limit: number = 20): Promise<ProductCatalogReadModel[]> {
    return Array.from(this.productCatalog.values())
      .filter((p) => p.isActive && p.isInStock)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * 获取低库存商品
   */
  async getLowStockProducts(
    threshold: number = 5
  ): Promise<ProductCatalogReadModel[]> {
    return Array.from(this.productCatalog.values())
      .filter((p) => p.isActive && p.stock <= threshold && p.stock > 0)
      .sort((a, b) => a.stock - b.stock);
  }
}
