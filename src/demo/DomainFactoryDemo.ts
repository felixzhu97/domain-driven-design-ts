/**
 * 领域工厂模式演示
 * 展示工厂模式在复杂对象创建中的应用，包括验证、默认值处理、事件重建等
 */

import {
  FactoryLocator,
  factoryRegistry,
  FactoryRegistry,
} from "../domain/factories/FactoryRegistry";
import { CreateUserData } from "../domain/factories/UserFactory";
import { CreateProductData } from "../domain/factories/ProductFactory";
import { CreateOrderData } from "../domain/factories/OrderFactory";
import { UserCreatedEvent } from "../domain/events/UserEvents";
import { ProductCreatedEvent } from "../domain/events/ProductEvents";
import { OrderCreatedEvent } from "../domain/events/OrderEvents";

/**
 * 领域工厂演示服务
 */
export class DomainFactoryDemo {
  /**
   * 运行完整演示
   */
  public static async runDemo(): Promise<void> {
    console.log("🏭 领域工厂模式演示开始\n");

    try {
      // 1. 工厂注册器演示
      await this.demonstrateFactoryRegistry();

      // 2. 用户工厂演示
      await this.demonstrateUserFactory();

      // 3. 产品工厂演示
      await this.demonstrateProductFactory();

      // 4. 订单工厂演示
      await this.demonstrateOrderFactory();

      // 5. 事件溯源工厂演示
      await this.demonstrateEventSourcingFactory();

      // 6. 快照工厂演示
      await this.demonstrateSnapshotFactory();

      // 7. 工厂验证演示
      await this.demonstrateFactoryValidation();

      // 8. 工厂定位器演示
      await this.demonstrateFactoryLocator();

      console.log("\n✅ 领域工厂模式演示完成");
    } catch (error) {
      console.error("❌ 演示过程中发生错误:", error);
    }
  }

  /**
   * 演示工厂注册器
   */
  private static async demonstrateFactoryRegistry(): Promise<void> {
    console.log("📋 1. 工厂注册器演示");
    console.log("================");

    const registry = FactoryRegistry.getInstance();

    // 获取统计信息
    const stats = registry.getStatistics();
    console.log("工厂统计信息:");
    console.log(`- 总工厂数: ${stats.totalFactories}`);
    console.log(`- 活跃工厂数: ${stats.activeFactories}`);
    console.log(`- 懒加载工厂数: ${stats.lazyFactories}`);
    console.log(`- 单例工厂数: ${stats.singletonFactories}`);
    console.log(`- 已注册类型: ${stats.factoryTypes.join(", ")}`);

    // 验证依赖关系
    const dependencyErrors = registry.validateDependencies();
    if (dependencyErrors.length > 0) {
      console.log("⚠️ 依赖关系错误:");
      dependencyErrors.forEach((error) => console.log(`  - ${error}`));
    } else {
      console.log("✅ 所有工厂依赖关系正常");
    }

    // 预热懒加载工厂
    registry.warmUp();
    console.log("✅ 已预热所有懒加载工厂");

    console.log("");
  }

  /**
   * 演示用户工厂
   */
  private static async demonstrateUserFactory(): Promise<void> {
    console.log("👤 2. 用户工厂演示");
    console.log("===============");

    const userFactory = FactoryLocator.getUserFactory();

    // 创建默认用户
    console.log("创建默认用户:");
    const defaultUserResult = userFactory.createDefault();
    console.log(`- 用户ID: ${defaultUserResult.entity.id}`);
    console.log(`- 用户名: ${defaultUserResult.entity.name}`);
    console.log(`- 邮箱: ${defaultUserResult.entity.email.value}`);
    console.log(`- 警告: ${defaultUserResult.warnings.join(", ") || "无"}`);

    // 从数据创建用户
    const userData: CreateUserData = {
      name: "张三",
      email: "zhangsan@example.com",
      age: 28,
      isVip: true,
      membershipLevel: "gold",
      preferences: {
        newsletter: true,
        promotions: false,
        language: "zh-CN",
      },
    };

    console.log("\n从数据创建用户:");
    const userResult = userFactory.createFromData(userData);
    console.log(`- 用户ID: ${userResult.entity.id}`);
    console.log(`- 用户名: ${userResult.entity.name}`);
    console.log(`- 邮箱: ${userResult.entity.email.value}`);
    console.log(`- 警告: ${userResult.warnings.join(", ") || "无"}`);
    console.log(`- 元数据: ${JSON.stringify(userResult.metadata, null, 2)}`);

    // 创建有问题的用户数据
    const invalidUserData: CreateUserData = {
      name: "A", // 太短
      email: "invalid-email", // 无效邮箱
      age: 200, // 超出范围
    };

    console.log("\n验证无效用户数据:");
    const validationErrors = userFactory.validateCreateData(invalidUserData);
    console.log(`验证错误: ${validationErrors.join(", ")}`);

    console.log("");
  }

  /**
   * 演示产品工厂
   */
  private static async demonstrateProductFactory(): Promise<void> {
    console.log("📦 3. 产品工厂演示");
    console.log("===============");

    const productFactory = FactoryLocator.getProductFactory();

    // 创建复杂产品
    const productData: CreateProductData = {
      name: "iPhone 15 Pro",
      description: "最新款苹果智能手机，配备A17 Pro芯片",
      price: {
        amount: 8999,
        currency: "CNY",
      },
      category: "electronics",
      tags: ["smartphone", "apple", "premium", "5g"],
      specifications: {
        screen: "6.1英寸 Super Retina XDR",
        chip: "A17 Pro",
        storage: "256GB",
        camera: "48MP主摄像头系统",
        battery: "长达23小时视频播放",
      },
      inventory: {
        quantity: 50,
        minThreshold: 10,
        maxThreshold: 200,
      },
      supplier: {
        id: "apple-inc",
        name: "Apple Inc.",
        contact: "supplier@apple.com",
      },
    };

    console.log("创建复杂产品:");
    const productResult = productFactory.createFromData(productData);
    console.log(`- 产品ID: ${productResult.entity.id}`);
    console.log(`- 产品名: ${productResult.entity.name}`);
    console.log(
      `- 价格: ${productResult.entity.price.amountInYuan} ${productResult.entity.price.currency}`
    );
    console.log(`- 分类: ${productResult.entity.category.name}`);
    console.log(`- 警告: ${productResult.warnings.join(", ") || "无"}`);

    // 创建有警告的产品
    const warningProductData: CreateProductData = {
      name: "Test Product 123", // 包含test
      price: {
        amount: 0, // 零价格
        currency: "CNY",
      },
      category: "electronics",
      inventory: {
        quantity: 0, // 零库存
      },
    };

    console.log("\n创建有警告的产品:");
    const warningResult = productFactory.createFromData(warningProductData);
    console.log(`- 产品名: ${warningResult.entity.name}`);
    console.log(`- 警告: ${warningResult.warnings.join(", ")}`);

    console.log("");
  }

  /**
   * 演示订单工厂
   */
  private static async demonstrateOrderFactory(): Promise<void> {
    console.log("🛒 4. 订单工厂演示");
    console.log("===============");

    const orderFactory = FactoryLocator.getOrderFactory();

    // 创建复杂订单
    const orderData: CreateOrderData = {
      userId: "user-123",
      items: [
        {
          productId: "iphone-15-pro",
          productName: "iPhone 15 Pro",
          unitPrice: { amount: 8999, currency: "CNY" },
          quantity: 1,
          discount: { amount: 500, currency: "CNY" },
        },
        {
          productId: "airpods-pro",
          productName: "AirPods Pro",
          unitPrice: { amount: 1999, currency: "CNY" },
          quantity: 2,
        },
      ],
      shippingAddress: {
        street: "中关村大街1号",
        city: "北京",
        postalCode: "100080",
        country: "CN",
      },
      billingAddress: {
        street: "中关村大街1号",
        city: "北京",
        postalCode: "100080",
        country: "CN",
      },
      paymentMethod: {
        type: "credit_card",
        details: {
          brand: "visa",
          lastFour: "1234",
        },
      },
      notes: "请在工作日送达",
      priority: "high",
      expectedDeliveryDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    console.log("创建复杂订单:");
    const orderResult = orderFactory.createFromData(orderData);
    console.log(`- 订单ID: ${orderResult.entity.id}`);
    console.log(`- 用户ID: ${orderResult.entity.customerId}`);
    console.log(`- 商品数量: ${orderData.items.length}`);
    console.log(`- 警告: ${orderResult.warnings.join(", ") || "无"}`);

    // 创建有问题的订单
    const invalidOrderData: CreateOrderData = {
      userId: "", // 空用户ID
      items: [], // 空商品列表
      expectedDeliveryDate: "2020-01-01", // 过去的日期
    };

    console.log("\n验证无效订单数据:");
    const orderValidationErrors =
      orderFactory.validateCreateData(invalidOrderData);
    console.log(`验证错误: ${orderValidationErrors.join(", ")}`);

    console.log("");
  }

  /**
   * 演示事件溯源工厂
   */
  private static async demonstrateEventSourcingFactory(): Promise<void> {
    console.log("📼 5. 事件溯源工厂演示");
    console.log("==================");

    const userFactory = FactoryLocator.getUserFactory();

    // 模拟用户事件序列
    const userEvents = [
      new UserCreatedEvent("user-456", "lisi@example.com", "李四"),
      {
        type: "UserProfileUpdated",
        aggregateId: "user-456",
        changes: {
          name: "李四(更新)",
          age: 30,
        },
        timestamp: new Date("2023-06-01").toISOString(),
      },
    ];

    console.log("从事件重建用户:");
    try {
      const reconstructedResult =
        userFactory.reconstituteFromEvents(userEvents);
      console.log(`- 重建用户ID: ${reconstructedResult.entity.id}`);
      console.log(`- 用户名: ${reconstructedResult.entity.name}`);
      console.log(`- 事件数量: ${userEvents.length}`);
      console.log(`- 警告: ${reconstructedResult.warnings.join(", ") || "无"}`);
    } catch (error) {
      console.log(`❌ 重建失败: ${(error as Error).message}`);
    }

    console.log("");
  }

  /**
   * 演示快照工厂
   */
  private static async demonstrateSnapshotFactory(): Promise<void> {
    console.log("📸 6. 快照工厂演示");
    console.log("===============");

    const userFactory = FactoryLocator.getUserFactory();

    // 模拟用户快照
    const userSnapshot = {
      id: "user-789",
      name: "王五",
      email: "wangwu@example.com",
      age: 25,
      isVip: true,
      membershipLevel: "platinum",
      preferences: {
        newsletter: true,
        promotions: true,
        language: "zh-CN",
      },
      createdAt: "2023-01-01T00:00:00.000Z",
      version: 10,
    };

    console.log("从快照恢复用户:");
    try {
      const snapshotResult = userFactory.createFromSnapshot(userSnapshot);
      console.log(`- 恢复用户ID: ${snapshotResult.entity.id}`);
      console.log(`- 用户名: ${snapshotResult.entity.name}`);
      console.log(`- 快照版本: ${userSnapshot.version}`);
      console.log(
        `- 元数据: ${JSON.stringify(snapshotResult.metadata, null, 2)}`
      );
    } catch (error) {
      console.log(`❌ 恢复失败: ${(error as Error).message}`);
    }

    console.log("");
  }

  /**
   * 演示工厂验证
   */
  private static async demonstrateFactoryValidation(): Promise<void> {
    console.log("✅ 7. 工厂验证演示");
    console.log("===============");

    const userFactory = FactoryLocator.getUserFactory();
    const productFactory = FactoryLocator.getProductFactory();

    // 测试各种验证场景
    const testCases = [
      {
        name: "用户名太短",
        factory: userFactory,
        data: { name: "A", email: "test@example.com" },
      },
      {
        name: "无效邮箱",
        factory: userFactory,
        data: { name: "Test User", email: "invalid-email" },
      },
      {
        name: "产品价格为负",
        factory: productFactory,
        data: {
          name: "Test Product",
          price: { amount: -100, currency: "CNY" },
          category: "electronics",
        },
      },
      {
        name: "无效货币",
        factory: productFactory,
        data: {
          name: "Test Product",
          price: { amount: 100, currency: "INVALID" },
          category: "electronics",
        },
      },
    ];

    for (const testCase of testCases) {
      console.log(`测试场景: ${testCase.name}`);
      const errors = testCase.factory.validateCreateData(testCase.data as any);
      console.log(`- 验证错误: ${errors.join(", ") || "无错误"}`);
    }

    console.log("");
  }

  /**
   * 演示工厂定位器
   */
  private static async demonstrateFactoryLocator(): Promise<void> {
    console.log("🎯 8. 工厂定位器演示");
    console.log("==================");

    // 使用工厂定位器获取各种工厂
    console.log("使用工厂定位器:");

    const userFactory = FactoryLocator.getUserFactory();
    console.log(`- 用户工厂类型: ${userFactory.getSupportedEntityType()}`);

    const productFactory = FactoryLocator.getProductFactory();
    console.log(`- 产品工厂类型: ${productFactory.getSupportedEntityType()}`);

    const orderFactory = FactoryLocator.getOrderFactory();
    console.log(`- 订单工厂类型: ${orderFactory.getSupportedEntityType()}`);

    // 通用工厂获取
    console.log("\n通用工厂获取:");
    const genericUserFactory = FactoryLocator.getFactory("User");
    console.log(
      `- 通用用户工厂: ${genericUserFactory.getSupportedEntityType()}`
    );

    const genericProductFactory = FactoryLocator.getAggregateFactory("Product");
    console.log(
      `- 通用产品工厂: ${genericProductFactory.getSupportedEntityType()}`
    );

    console.log("✅ 工厂定位器演示完成");
    console.log("");
  }
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
  DomainFactoryDemo.runDemo().catch(console.error);
}
