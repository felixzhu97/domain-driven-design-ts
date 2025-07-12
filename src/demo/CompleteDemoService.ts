import { User, Product, Order, OrderItem } from "../domain/entities";

import {
  Email,
  Money,
  ProductCategory,
  Address,
} from "../domain/value-objects";

import {
  MemoryUserRepository,
  MemoryProductRepository,
  MemoryOrderRepository,
} from "../infrastructure/repositories";

import { UserController, ProductController } from "../presentation/controllers";

import { OrderService } from "../domain/services";
import { OrderApplicationService } from "../application/services";
import { SpecificationDemo } from "./SpecificationDemo";

/**
 * 完整的业务流程演示服务
 * 展示从用户注册到下单的完整电商业务流程
 */
export class CompleteDemoService {
  private userRepository: MemoryUserRepository;
  private productRepository: MemoryProductRepository;
  private orderRepository: MemoryOrderRepository;
  private userController: UserController;
  private productController: ProductController;
  private orderService: OrderService;

  constructor() {
    this.userRepository = new MemoryUserRepository();
    this.productRepository = new MemoryProductRepository();
    this.orderRepository = new MemoryOrderRepository();
    this.userController = new UserController();
    this.productController = new ProductController();
    this.orderService = new OrderService();
  }

  /**
   * 运行完整的业务流程演示
   */
  public async runCompleteDemo(): Promise<void> {
    console.log("🚀 开始运行完整的DDD电商业务流程演示...\n");

    try {
      // 1. 准备测试数据
      await this.setupDemoData();

      // 2. 演示用户管理
      await this.demonstrateUserManagement();

      // 3. 演示商品管理
      await this.demonstrateProductManagement();

      // 4. 演示订单流程
      await this.demonstrateOrderProcess();

      // 5. 演示统计功能
      await this.demonstrateStatistics();

      // 6. 演示事件处理
      await this.demonstrateEventHandling();

      // 7. 演示领域规约模式
      await this.demonstrateSpecificationPattern();

      console.log("✅ 完整业务流程演示完成！");
    } catch (error) {
      console.error("❌ 演示过程中发生错误:", error);
    }
  }

  /**
   * 准备演示数据
   */
  private async setupDemoData(): Promise<void> {
    console.log("📋 准备演示数据...\n");

    // 创建示例用户
    const users = [
      {
        email: "zhang.san@example.com",
        name: "张三",
        password: "password123",
        address: {
          country: "中国",
          province: "北京市",
          city: "北京市",
          district: "朝阳区",
          street: "建国路88号",
          postalCode: "100025",
          detail: "SOHO现代城A座1001室",
        },
      },
      {
        email: "li.si@example.com",
        name: "李四",
        password: "password456",
        address: {
          country: "中国",
          province: "上海市",
          city: "上海市",
          district: "浦东新区",
          street: "陆家嘴环路1000号",
          postalCode: "200120",
          detail: "恒生银行大厦2501室",
        },
      },
    ];

    for (const userData of users) {
      const user = User.create(
        Email.create(userData.email),
        userData.name,
        userData.password,
        Address.create({
          country: userData.address.country,
          province: userData.address.province,
          city: userData.address.city,
          district: userData.address.district,
          street: userData.address.street,
          postalCode: userData.address.postalCode,
          detail: userData.address.detail,
        })
      );
      await this.userRepository.save(user);
      console.log(`👤 创建用户: ${userData.name} (${userData.email})`);
    }

    // 创建示例商品
    const products = [
      {
        name: "iPhone 15 Pro",
        description: "最新款苹果智能手机，搭载A17 Pro芯片",
        price: 7999,
        category: "数码产品",
        sku: "IPHONE15PRO-128GB",
        initialStock: 50,
      },
      {
        name: "MacBook Pro 14寸",
        description: "M3芯片MacBook Pro，专业级笔记本电脑",
        price: 14999,
        category: "数码产品",
        sku: "MBP14-M3-512GB",
        initialStock: 30,
      },
      {
        name: "索尼WH-1000XM5耳机",
        description: "降噪蓝牙耳机，音质卓越",
        price: 2399,
        category: "音频设备",
        sku: "SONY-WH1000XM5",
        initialStock: 100,
      },
      {
        name: "戴森V15吸尘器",
        description: "无线手持吸尘器，强劲吸力",
        price: 4490,
        category: "家电",
        sku: "DYSON-V15-DETECT",
        initialStock: 25,
      },
    ];

    for (const productData of products) {
      const product = Product.create(
        productData.name,
        productData.description,
        Money.fromYuan(productData.price),
        ProductCategory.create(productData.category),
        productData.sku,
        productData.initialStock
      );
      await this.productRepository.save(product);
      console.log(`📱 创建商品: ${productData.name} - ¥${productData.price}`);
    }

    console.log("\n✅ 演示数据准备完成\n");
  }

  /**
   * 演示用户管理功能
   */
  private async demonstrateUserManagement(): Promise<void> {
    console.log("👥 演示用户管理功能...\n");

    // 获取用户列表
    const usersResponse = await this.userController.getUsers({
      page: 1,
      pageSize: 10,
    });
    console.log("📊 用户列表响应:", JSON.stringify(usersResponse, null, 2));

    // 根据ID获取用户
    if (usersResponse.data && usersResponse.data.length > 0) {
      const firstUser = usersResponse.data[0];
      const userResponse = await this.userController.getUserById(firstUser.id);
      console.log("👤 用户详情:", JSON.stringify(userResponse, null, 2));
    }

    console.log("\n✅ 用户管理演示完成\n");
  }

  /**
   * 演示商品管理功能
   */
  private async demonstrateProductManagement(): Promise<void> {
    console.log("🛍️ 演示商品管理功能...\n");

    // 获取商品列表
    const productsResponse = await this.productController.getProducts({
      page: 1,
      pageSize: 10,
    });
    console.log("📦 商品列表响应:", JSON.stringify(productsResponse, null, 2));

    // 根据ID获取商品
    if (productsResponse.data && productsResponse.data.length > 0) {
      const firstProduct = productsResponse.data[0];
      const productResponse = await this.productController.getProductById(
        firstProduct.id
      );
      console.log("📱 商品详情:", JSON.stringify(productResponse, null, 2));

      // 更新商品库存
      const updateResponse = await this.productController.updateProductStock(
        firstProduct.id,
        {
          quantity: 5,
          reason: "演示库存更新",
        }
      );
      console.log("📊 库存更新响应:", JSON.stringify(updateResponse, null, 2));
    }

    console.log("\n✅ 商品管理演示完成\n");
  }

  /**
   * 演示订单处理流程
   */
  private async demonstrateOrderProcess(): Promise<void> {
    console.log("📋 演示订单处理流程...\n");

    try {
      // 获取客户和商品
      const customers = await this.userRepository.findAll();
      const products = await this.productRepository.findAll();

      if (customers.length === 0 || products.length === 0) {
        console.log("⚠️ 缺少必要的客户或商品数据");
        return;
      }

      const customer = customers[0];
      if (!customer) {
        console.log("❌ 没有找到可用的客户数据");
        return;
      }

      const selectedProducts = products.slice(0, 2); // 选择前两个商品

      console.log(`👤 客户: ${customer.name}`);
      console.log(
        `🛒 选择商品: ${selectedProducts.map((p) => p.name).join(", ")}`
      );

      // 检查客户是否有地址
      if (!customer.addresses || customer.addresses.length === 0) {
        console.log("❌ 客户缺少配送地址");
        return;
      }

      const firstAddress = customer.addresses[0];
      if (!firstAddress) {
        console.log("❌ 客户第一个地址无效");
        return;
      }

      // 使用订单服务创建订单 - 修改为应用服务调用
      const orderApplicationService = new OrderApplicationService(
        this.orderRepository,
        this.productRepository,
        this.userRepository
      );

      const order = await orderApplicationService.createOrder({
        customerId: customer.id,
        items: selectedProducts.map((product) => ({
          productId: product.id,
          quantity: 2,
          unitPrice: product.price.amount,
        })),
        shippingAddress: {
          country: firstAddress.country,
          province: firstAddress.province,
          city: firstAddress.city,
          district: firstAddress.district,
          street: firstAddress.street,
          postalCode: firstAddress.postalCode,
          ...(firstAddress.detail !== undefined && {
            detail: firstAddress.detail,
          }),
        },
      });

      await this.orderRepository.save(order);
      console.log(`📋 订单创建成功: ${order.orderNumber}`);
      console.log(`💰 订单总金额: ${order.totalAmount.toString()}`);

      // 确认订单
      order.confirm();
      await this.orderRepository.save(order);
      console.log(`✅ 订单已确认: ${order.status}`);

      // 模拟支付
      setTimeout(async () => {
        order.markAsPaid();
        await this.orderRepository.save(order);
        console.log(`💳 订单已支付: ${order.status}`);

        // 发货
        setTimeout(async () => {
          order.ship("TRACK123456789");
          await this.orderRepository.save(order);
          console.log(`🚚 订单已发货: ${order.status}`);
        }, 1000);
      }, 1000);
    } catch (error) {
      console.error("❌ 订单流程演示失败:", error);
    }

    console.log("\n✅ 订单流程演示完成\n");
  }

  /**
   * 演示统计功能
   */
  private async demonstrateStatistics(): Promise<void> {
    console.log("📊 演示统计分析功能...\n");

    // 用户统计
    const userStats = await this.userRepository.getUserStats();
    console.log("👥 用户统计:", JSON.stringify(userStats, null, 2));

    // 商品统计
    const productStats = await this.productRepository.getProductStats();
    console.log("🛍️ 商品统计:", JSON.stringify(productStats, null, 2));

    // 订单统计
    const orderStats = await this.orderRepository.getOrderStats();
    console.log("📋 订单统计:", JSON.stringify(orderStats, null, 2));

    // 月度销售统计
    const monthlySales = await this.orderRepository.getMonthlySalesStats(2024);
    console.log(
      "📈 2024年月度销售统计:",
      JSON.stringify(monthlySales, null, 2)
    );

    console.log("\n✅ 统计功能演示完成\n");
  }

  /**
   * 演示事件处理
   */
  private async demonstrateEventHandling(): Promise<void> {
    console.log("⚡ 演示事件处理机制...\n");

    // 创建一个新用户，触发用户注册事件
    const newUser = User.create(
      Email.create("event.demo@example.com"),
      "事件演示用户",
      "password789"
    );

    console.log("📤 触发用户注册事件");
    console.log("📧 模拟发送欢迎邮件");
    console.log("🎁 模拟发放新用户优惠券");

    await this.userRepository.save(newUser);

    // 创建商品，触发商品创建事件
    const newProduct = Product.create(
      "事件演示商品",
      "用于演示事件处理的商品",
      Money.fromYuan(99),
      ProductCategory.create("演示分类"),
      "EVENT-DEMO-001",
      10
    );

    console.log("📤 触发商品创建事件");
    console.log("🔔 模拟通知相关团队");
    console.log("🏷️ 模拟更新搜索索引");

    await this.productRepository.save(newProduct);

    console.log("\n✅ 事件处理演示完成\n");
  }

  /**
   * 演示领域规约模式
   */
  private async demonstrateSpecificationPattern(): Promise<void> {
    console.log("🎯 演示领域规约(Domain Specifications)模式...\n");

    try {
      const specificationDemo = new SpecificationDemo();
      await specificationDemo.runDemo();
    } catch (error) {
      console.error("❌ 规约演示过程中发生错误:", error);
    }

    console.log("\n✅ 领域规约演示完成\n");
  }

  /**
   * 展示系统架构信息
   */
  public displayArchitectureInfo(): void {
    console.log("🏗️ 领域驱动设计 (DDD) 架构信息\n");

    console.log("📁 项目结构:");
    console.log("├── src/");
    console.log("│   ├── domain/              # 领域层");
    console.log("│   │   ├── entities/        # 实体");
    console.log("│   │   ├── value-objects/   # 值对象");
    console.log("│   │   ├── services/        # 领域服务");
    console.log("│   │   ├── events/          # 领域事件");
    console.log("│   │   ├── specifications/  # 领域规约");
    console.log("│   │   └── repositories/    # 仓储接口");
    console.log("│   ├── application/         # 应用层");
    console.log("│   │   ├── commands/        # 命令 (CQRS)");
    console.log("│   │   ├── queries/         # 查询 (CQRS)");
    console.log("│   │   └── services/        # 应用服务");
    console.log("│   ├── infrastructure/      # 基础设施层");
    console.log("│   │   ├── repositories/    # 仓储实现");
    console.log("│   │   ├── persistence/     # 数据持久化");
    console.log("│   │   └── events/          # 事件处理");
    console.log("│   ├── presentation/        # 表示层");
    console.log("│   │   ├── controllers/     # API控制器");
    console.log("│   │   └── dtos/            # 数据传输对象");
    console.log("│   └── shared/              # 共享组件");
    console.log("│       ├── types/           # 类型定义");
    console.log("│       ├── specifications/  # 规约基础架构");
    console.log("│       └── utils/           # 工具函数");
    console.log("");

    console.log("🎯 核心概念实现:");
    console.log("✅ 聚合根 (Aggregate Root)");
    console.log("✅ 实体 (Entity)");
    console.log("✅ 值对象 (Value Object)");
    console.log("✅ 领域服务 (Domain Service)");
    console.log("✅ 领域事件 (Domain Event)");
    console.log("✅ 领域规约 (Domain Specification)");
    console.log("✅ 仓储模式 (Repository Pattern)");
    console.log("✅ CQRS (命令查询职责分离)");
    console.log("✅ 依赖反转 (Dependency Inversion)");
    console.log("✅ 分层架构 (Layered Architecture)");
    console.log("");

    console.log("💼 业务场景覆盖:");
    console.log("🛒 电商系统完整业务流程");
    console.log("👥 用户管理和认证");
    console.log("📦 商品管理和库存");
    console.log("🛍️ 订单创建和状态管理");
    console.log("💰 价格计算和货币处理");
    console.log("📍 地址管理");
    console.log("📊 业务数据统计分析");
    console.log("⚡ 事件驱动的业务逻辑");
    console.log("🎯 复杂业务规则封装");
    console.log("");
  }
}

/**
 * 导出演示函数
 */
export async function runCompleteDDDDemo(): Promise<void> {
  const demoService = new CompleteDemoService();

  // 显示架构信息
  demoService.displayArchitectureInfo();

  // 运行完整演示
  await demoService.runCompleteDemo();
}
