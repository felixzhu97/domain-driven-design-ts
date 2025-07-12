import { MemoryEventStore } from "../infrastructure/events/MemoryEventStore";
import { ProjectionManager } from "../infrastructure/events/ProjectionManager";
import { OrderSummaryProjection } from "../infrastructure/projections/OrderSummaryProjection";
import { UserProfileProjection } from "../infrastructure/projections/UserProfileProjection";
import { ProductCatalogProjection } from "../infrastructure/projections/ProductCatalogProjection";
import { ProjectionQueryService } from "../infrastructure/projections/ProjectionQueryService";
import { StoredEvent, EventMetadata } from "../shared/types/EventStore";

/**
 * CQRS投影演示
 */
export class CQRSProjectionDemo {
  private eventStore: MemoryEventStore;
  private projectionManager: ProjectionManager;
  private orderSummaryProjection: OrderSummaryProjection;
  private userProfileProjection: UserProfileProjection;
  private productCatalogProjection: ProductCatalogProjection;
  private queryService: ProjectionQueryService;

  constructor() {
    this.eventStore = new MemoryEventStore();
    this.projectionManager = new ProjectionManager(this.eventStore);

    // 创建投影实例
    this.orderSummaryProjection = new OrderSummaryProjection();
    this.userProfileProjection = new UserProfileProjection();
    this.productCatalogProjection = new ProductCatalogProjection();

    // 注册投影
    this.projectionManager.registerProjection(this.orderSummaryProjection);
    this.projectionManager.registerProjection(this.userProfileProjection);
    this.projectionManager.registerProjection(this.productCatalogProjection);

    // 创建查询服务
    this.queryService = new ProjectionQueryService(
      this.orderSummaryProjection,
      this.userProfileProjection,
      this.productCatalogProjection
    );
  }

  /**
   * 运行演示
   */
  async runDemo(): Promise<void> {
    console.log("🎯 开始CQRS投影演示\n");

    try {
      // 1. 设置测试数据
      await this.setupTestData();

      // 2. 启动投影管理器
      this.projectionManager.start();

      // 3. 等待投影处理完成
      await this.waitForProjections();

      // 4. 演示各种查询功能
      await this.demonstrateQueries();

      // 5. 演示综合分析功能
      await this.demonstrateAnalytics();

      // 6. 演示仪表盘功能
      await this.demonstrateDashboard();

      // 7. 演示健康检查
      await this.demonstrateHealthCheck();
    } catch (error) {
      console.error("❌ 投影演示过程中发生错误:", error);
    } finally {
      // 停止投影管理器
      this.projectionManager.stop();
    }

    console.log("\n✅ CQRS投影演示完成!");
  }

  /**
   * 设置测试数据
   */
  private async setupTestData(): Promise<void> {
    console.log("📊 设置测试数据...");

    const currentTime = new Date();

    // 用户注册事件
    await this.addEvent(
      "user-001",
      "UserRegistered",
      {
        email: "alice@example.com",
        name: "Alice Johnson",
      },
      currentTime
    );

    await this.addEvent(
      "user-002",
      "UserRegistered",
      {
        email: "bob@example.com",
        name: "Bob Smith",
      },
      new Date(currentTime.getTime() - 30 * 24 * 60 * 60 * 1000)
    ); // 30天前

    // 商品创建事件
    await this.addEvent(
      "product-001",
      "ProductCreated",
      {
        name: "iPhone 15 Pro",
        description: "最新款苹果手机",
        price: { amount: 8999, currency: "CNY" },
        category: { name: "手机数码" },
        sku: "IPHONE15PRO",
        initialStock: 50,
      },
      new Date(currentTime.getTime() - 10 * 24 * 60 * 60 * 1000)
    ); // 10天前

    await this.addEvent(
      "product-002",
      "ProductCreated",
      {
        name: "MacBook Pro M3",
        description: "专业级笔记本电脑",
        price: { amount: 16999, currency: "CNY" },
        category: { name: "电脑办公" },
        sku: "MACBOOKPROM3",
        initialStock: 20,
      },
      new Date(currentTime.getTime() - 5 * 24 * 60 * 60 * 1000)
    ); // 5天前

    // 订单创建事件
    await this.addEvent(
      "order-001",
      "OrderCreated",
      {
        customerId: "user-001",
        orderNumber: "ORD20240001",
        totalAmount: 8999,
        currency: "CNY",
        itemCount: 1,
      },
      new Date(currentTime.getTime() - 2 * 24 * 60 * 60 * 1000)
    ); // 2天前

    await this.addEvent(
      "order-002",
      "OrderCreated",
      {
        customerId: "user-002",
        orderNumber: "ORD20240002",
        totalAmount: 16999,
        currency: "CNY",
        itemCount: 1,
      },
      new Date(currentTime.getTime() - 1 * 24 * 60 * 60 * 1000)
    ); // 1天前

    // 订单状态变更事件
    await this.addEvent(
      "order-001",
      "OrderPaid",
      {
        customerId: "user-001",
        totalAmount: 8999,
      },
      new Date(currentTime.getTime() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)
    ); // 2天前+1小时

    await this.addEvent(
      "order-002",
      "OrderPaid",
      {
        customerId: "user-002",
        totalAmount: 16999,
      },
      new Date(currentTime.getTime() - 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)
    ); // 1天前+1小时

    // 商品购买事件
    await this.addEvent(
      "product-001",
      "ProductPurchased",
      {
        quantity: 1,
        customerId: "user-001",
      },
      new Date(currentTime.getTime() - 2 * 24 * 60 * 60 * 1000)
    );

    await this.addEvent(
      "product-002",
      "ProductPurchased",
      {
        quantity: 1,
        customerId: "user-002",
      },
      new Date(currentTime.getTime() - 1 * 24 * 60 * 60 * 1000)
    );

    // 商品评价事件
    await this.addEvent(
      "product-001",
      "ProductReviewed",
      {
        rating: 5,
        customerId: "user-001",
      },
      currentTime
    );

    console.log("✅ 测试数据设置完成");
  }

  /**
   * 添加事件到事件存储
   */
  private async addEvent(
    streamId: string,
    eventType: string,
    data: any,
    occurredOn: Date
  ): Promise<void> {
    // 创建领域事件
    const domainEvent = {
      eventId: `${streamId}-${eventType}-${Date.now()}-${Math.random()}`,
      eventType,
      eventVersion: 1,
      occurredOn,
      ...data,
    };

    await this.eventStore.saveEvents(
      streamId,
      "aggregate",
      [domainEvent],
      -1, // 忽略版本检查
      {
        correlationId: `correlation-${Date.now()}`,
        causationId: `causation-${Date.now()}`,
        userId: "system",
      }
    );
  }

  /**
   * 等待投影处理完成
   */
  private async waitForProjections(): Promise<void> {
    console.log("⏳ 等待投影处理完成...");

    // 简单等待一段时间让投影处理事件
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("✅ 投影处理完成");
  }

  /**
   * 演示查询功能
   */
  private async demonstrateQueries(): Promise<void> {
    console.log("\n📋 演示投影查询功能...");

    // 订单查询
    console.log("\n--- 订单查询 ---");
    const orders = await this.queryService.getOrdersPaginated({
      page: 1,
      pageSize: 10,
    });
    console.log(`📋 找到 ${orders.total} 个订单:`);
    orders.data.forEach((order) => {
      console.log(
        `  - ${order.orderNumber}: ${order.totalAmount}元 (${order.status})`
      );
    });

    const orderStats = await this.queryService.getOrderStatistics();
    console.log(
      `📊 订单统计: 总订单 ${orderStats.totalOrders}，总金额 ${orderStats.totalAmount}元`
    );

    // 用户查询
    console.log("\n--- 用户查询 ---");
    const users = await this.queryService.getUserProfilesPaginated({
      page: 1,
      pageSize: 10,
    });
    console.log(`👤 找到 ${users.total} 个用户:`);
    users.data.forEach((user) => {
      console.log(
        `  - ${user.name} (${user.email}): ${user.totalOrders}订单, ${user.totalSpent}元`
      );
    });

    const userStats = await this.queryService.getUserStatistics();
    console.log(
      `📊 用户统计: 总用户 ${userStats.totalUsers}，活跃用户 ${userStats.activeUsers}`
    );

    // 商品查询
    console.log("\n--- 商品查询 ---");
    const products = await this.queryService.getProductsPaginated({
      page: 1,
      pageSize: 10,
    });
    console.log(`🛍️ 找到 ${products.total} 个商品:`);
    products.data.forEach((product) => {
      console.log(
        `  - ${product.name}: ${product.price}元 (库存: ${product.stock}, 销量: ${product.totalSales})`
      );
    });

    const productStats = await this.queryService.getProductStatistics();
    console.log(
      `📊 商品统计: 总商品 ${
        productStats.totalProducts
      }，库存总值 ${productStats.totalValue.toFixed(2)}元`
    );
  }

  /**
   * 演示综合分析功能
   */
  private async demonstrateAnalytics(): Promise<void> {
    console.log("\n📈 演示综合分析功能...");

    // 客户全景视图
    console.log("\n--- 客户全景视图 ---");
    const customerInsights = await this.queryService.getCustomerInsights(
      "user-001"
    );
    console.log(`👤 客户分析 (${customerInsights.profile?.name}):`);
    console.log(`  - 总消费: ${customerInsights.totalSpent}元`);
    console.log(`  - 平均订单价值: ${customerInsights.averageOrderValue}元`);
    console.log(`  - 订单历史: ${customerInsights.orderHistory.length}个订单`);
    console.log(
      `  - 最后下单: ${
        customerInsights.lastOrderDate?.toLocaleDateString() || "无"
      }`
    );

    // 商品全景视图
    console.log("\n--- 商品全景视图 ---");
    const productInsights = await this.queryService.getProductInsights(
      "product-001"
    );
    console.log(`🛍️ 商品分析 (${productInsights.product?.name}):`);
    console.log(`  - 总收入: ${productInsights.totalRevenue}元`);
    console.log(
      `  - 转化率: ${(productInsights.conversionRate * 100).toFixed(2)}%`
    );
    console.log(`  - 平均评分: ${productInsights.product?.averageRating || 0}`);

    // 高价值客户
    console.log("\n--- 高价值客户 ---");
    const highValueCustomers = await this.queryService.getHighValueCustomers(5);
    console.log("💎 高价值客户 TOP5:");
    highValueCustomers.forEach((customer, index) => {
      console.log(
        `  ${index + 1}. ${customer.name}: ${customer.totalSpent}元 (${
          customer.totalOrders
        }订单)`
      );
    });

    // 热销商品
    console.log("\n--- 热销商品 ---");
    const bestSelling = await this.queryService.getBestSellingProducts(5);
    console.log("🔥 热销商品 TOP5:");
    bestSelling.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name}: ${product.totalSales}销量`);
    });
  }

  /**
   * 演示仪表盘功能
   */
  private async demonstrateDashboard(): Promise<void> {
    console.log("\n📊 演示仪表盘功能...");

    const dashboardData = await this.queryService.getDashboardData();

    console.log("📈 业务仪表盘:");
    console.log(
      `  📋 订单: ${dashboardData.orderStats.totalOrders}个，总金额 ${dashboardData.orderStats.totalAmount}元`
    );
    console.log(
      `  👥 用户: ${dashboardData.userStats.totalUsers}个，活跃 ${dashboardData.userStats.activeUsers}个`
    );
    console.log(
      `  🛍️ 商品: ${dashboardData.productStats.totalProducts}个，在售 ${dashboardData.productStats.activeProducts}个`
    );

    console.log("\n🔥 最新订单:");
    dashboardData.recentOrders.slice(0, 3).forEach((order) => {
      console.log(
        `  - ${order.orderNumber}: ${order.totalAmount}元 (${order.status})`
      );
    });

    console.log("\n🏆 热销商品:");
    dashboardData.topProducts.slice(0, 3).forEach((product) => {
      console.log(`  - ${product.name}: ${product.totalSales}销量`);
    });

    console.log("\n👋 新用户:");
    dashboardData.newCustomers.slice(0, 3).forEach((customer) => {
      console.log(
        `  - ${
          customer.name
        } (${customer.registrationDate.toLocaleDateString()})`
      );
    });

    if (dashboardData.alerts.length > 0) {
      console.log("\n⚠️ 系统警告:");
      dashboardData.alerts.forEach((alert) => {
        const icon =
          alert.type === "error"
            ? "❌"
            : alert.type === "warning"
            ? "⚠️"
            : "ℹ️";
        console.log(`  ${icon} ${alert.message}`);
      });
    }
  }

  /**
   * 演示健康检查
   */
  private async demonstrateHealthCheck(): Promise<void> {
    console.log("\n🔍 演示投影健康检查...");

    const healthStatus = await this.queryService.getProjectionHealthStatus();

    console.log(
      `📊 投影健康状态: ${healthStatus.isHealthy ? "✅ 健康" : "❌ 异常"}`
    );

    console.log("📋 投影状态:");
    healthStatus.projections.forEach((projection) => {
      console.log(
        `  - ${projection.name}: ${
          projection.status
        } (最后更新: ${projection.lastUpdated.toLocaleString()})`
      );
    });

    if (healthStatus.issues.length > 0) {
      console.log("⚠️ 发现问题:");
      healthStatus.issues.forEach((issue) => {
        console.log(`  - ${issue}`);
      });
    }

    // 投影管理器统计
    const projectionStats = this.projectionManager.getStatistics();
    console.log(
      `📊 投影统计: ${projectionStats.totalProjections}个投影，${projectionStats.runningProjections}个运行中`
    );
  }
}

/**
 * 运行CQRS投影演示
 */
export async function runCQRSProjectionDemo(): Promise<void> {
  const demo = new CQRSProjectionDemo();
  await demo.runDemo();
}
