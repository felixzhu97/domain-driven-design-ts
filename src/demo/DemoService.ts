import {
  // 值对象
  Email,
  Money,
  Address,
  ProductCategory,

  // 实体
  User,
  Product,
  Order,
  OrderItem,

  // 领域服务
  OrderService,
  UserRegistrationService,
  PriceCalculationService,

  // 类型
  EntityId,
} from "../index";

export class DemoService {
  /**
   * 运行完整的DDD演示
   */
  public static async runDemo(): Promise<void> {
    console.log("🎯 开始DDD电商系统演示...\n");

    try {
      // 1. 创建值对象演示
      await this.demonstrateValueObjects();

      // 2. 创建实体演示
      await this.demonstrateEntities();

      // 3. 创建领域服务演示
      await this.demonstrateDomainServices();

      // 4. 创建完整业务流程演示
      await this.demonstrateBusinessFlow();

      console.log("✅ DDD演示完成！");
    } catch (error) {
      console.error("❌ 演示过程中出现错误:", error);
    }
  }

  /**
   * 演示值对象
   */
  private static async demonstrateValueObjects(): Promise<void> {
    console.log("📦 值对象演示");
    console.log("==============");

    // Email 值对象
    const userEmail = Email.create("zhang.san@example.com");
    console.log(`✉️  邮箱: ${userEmail.value}`);

    // Money 值对象
    const productPrice = Money.fromYuan(299.99);
    const shippingCost = Money.fromYuan(15.0);
    const totalPrice = productPrice.add(shippingCost);
    console.log(`💰 商品价格: ${productPrice.toString()}`);
    console.log(`🚚 运费: ${shippingCost.toString()}`);
    console.log(`💵 总价: ${totalPrice.toString()}`);

    // Address 值对象
    const shippingAddress = Address.create({
      country: "中国",
      province: "广东省",
      city: "深圳市",
      district: "南山区",
      street: "科技园南路",
      postalCode: "518000",
      detail: "腾讯大厦",
    });
    console.log(`📍 地址: ${shippingAddress.toString()}`);

    // ProductCategory 值对象
    const category = ProductCategory.ELECTRONICS;
    console.log(`📱 商品分类: ${category.name}`);
    console.log("");
  }

  /**
   * 演示实体
   */
  private static async demonstrateEntities(): Promise<void> {
    console.log("🏢 实体演示");
    console.log("============");

    // 创建用户实体
    const userEmail = Email.create("zhang.san@example.com");
    const userAddress = Address.create({
      country: "中国",
      province: "广东省",
      city: "深圳市",
      district: "南山区",
      street: "科技园南路",
      postalCode: "518000",
    });

    const user = User.create(
      userEmail,
      "张三",
      "hashed_password_123",
      userAddress
    );

    console.log(`👤 用户: ${user.name} (${user.email.value})`);
    console.log(`📧 用户ID: ${user.id}`);
    console.log(`✅ 用户状态: ${user.isActive ? "活跃" : "非活跃"}`);

    // 创建商品实体
    const productPrice = Money.fromYuan(1299.99);
    const product = Product.create(
      "iPhone 15 Pro",
      "最新款iPhone，配备强大的A17 Pro芯片",
      productPrice,
      ProductCategory.ELECTRONICS,
      "SKU-IPHONE15PRO-001",
      50
    );

    console.log(`📱 商品: ${product.name}`);
    console.log(`💰 价格: ${product.price.toString()}`);
    console.log(`📦 库存: ${product.stock}件`);
    console.log(`✅ 商品状态: ${product.isActive ? "上架" : "下架"}`);

    // 创建订单项
    const orderItem = OrderItem.create(
      product.id,
      product.name,
      2,
      product.price
    );

    console.log(`🛒 订单项: ${orderItem.productName} x ${orderItem.quantity}`);
    console.log(`💵 小计: ${orderItem.totalPrice.toString()}`);

    // 创建订单实体
    const order = Order.create(
      user.id,
      userAddress,
      userAddress,
      "ORD20241201001"
    );

    order.addItem(orderItem);
    console.log(`📋 订单: ${order.orderNumber}`);
    console.log(`👤 客户: ${order.customerId}`);
    console.log(`📊 状态: ${order.status}`);
    console.log(`💰 总金额: ${order.totalAmount.toString()}`);
    console.log("");
  }

  /**
   * 演示领域服务
   */
  private static async demonstrateDomainServices(): Promise<void> {
    console.log("⚙️  领域服务演示");
    console.log("================");

    // 用户注册服务演示
    console.log("👥 用户注册服务:");
    const registrationData = {
      email: "li.si@example.com",
      name: "李四",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      agreedToTerms: true,
      agreedToPrivacyPolicy: true,
    };

    const validation =
      UserRegistrationService.validateRegistrationData(registrationData);
    console.log(`   验证结果: ${validation.isValid ? "✅ 通过" : "❌ 失败"}`);
    if (!validation.isValid) {
      console.log(`   错误信息: ${validation.errors.join(", ")}`);
    }

    // 价格计算服务演示
    console.log("💰 价格计算服务:");
    const orderItems = [
      OrderItem.create("prod-1", "iPhone 15", 1, Money.fromYuan(5999)),
      OrderItem.create("prod-2", "保护壳", 2, Money.fromYuan(99)),
    ];

    const warehouseAddress = Address.create({
      country: "中国",
      province: "广东省",
      city: "深圳市",
      district: "宝安区",
      street: "工业园区",
      postalCode: "518100",
    });

    const customerAddress = Address.create({
      country: "中国",
      province: "广东省",
      city: "广州市",
      district: "天河区",
      street: "珠江新城",
      postalCode: "510000",
    });

    const priceCalculation = PriceCalculationService.calculateOrderTotal(
      orderItems,
      customerAddress,
      customerAddress,
      undefined,
      [],
      [],
      [],
      new Map(),
      warehouseAddress
    );

    console.log(`   小计: ${priceCalculation.subtotal.toString()}`);
    console.log(`   运费: ${priceCalculation.shippingCost.toString()}`);
    console.log(`   税费: ${priceCalculation.taxAmount.toString()}`);
    console.log(`   折扣: ${priceCalculation.discountAmount.toString()}`);
    console.log(`   总计: ${priceCalculation.total.toString()}`);
    console.log("");
  }

  /**
   * 演示完整业务流程
   */
  private static async demonstrateBusinessFlow(): Promise<void> {
    console.log("🔄 完整业务流程演示");
    console.log("===================");

    try {
      // 1. 用户注册
      console.log("步骤 1: 用户注册");
      const user = User.create(
        Email.create("demo@example.com"),
        "演示用户",
        "hashed_password",
        Address.create({
          country: "中国",
          province: "北京市",
          city: "北京市",
          district: "海淀区",
          street: "中关村大街",
          postalCode: "100000",
        })
      );
      console.log(`   ✅ 用户注册成功: ${user.name}`);

      // 2. 商品创建
      console.log("步骤 2: 商品上架");
      const products: Product[] = [];

      const laptop = Product.create(
        "MacBook Pro 16寸",
        "专业级笔记本电脑",
        Money.fromYuan(16999),
        ProductCategory.ELECTRONICS,
        "SKU-MBP16-001",
        20
      );
      products.push(laptop);

      const mouse = Product.create(
        "无线鼠标",
        "人体工学设计",
        Money.fromYuan(199),
        ProductCategory.ELECTRONICS,
        "SKU-MOUSE-001",
        100
      );
      products.push(mouse);

      console.log(`   ✅ 商品上架成功: ${products.length}个商品`);

      // 3. 创建订单
      console.log("步骤 3: 创建订单");
      // 确保用户有地址，如果没有则添加默认地址
      if (user.addresses.length === 0) {
        const defaultAddress = Address.create({
          country: "中国",
          province: "北京市",
          city: "北京市",
          district: "海淀区",
          street: "中关村大街1号",
          postalCode: "100000",
        });
        user.addAddress(defaultAddress);
      }

      const userAddress = user.addresses[0];
      if (!userAddress) {
        throw new Error("用户地址不存在");
      }

      const orderCreationData = {
        customerId: user.id,
        items: [
          { productId: laptop.id, quantity: 1 },
          { productId: mouse.id, quantity: 2 },
        ],
        shippingAddress: userAddress,
        billingAddress: userAddress,
      };

      const order = OrderService.createOrder(
        orderCreationData,
        products,
        user,
        () => Money.fromYuan(50), // 运费计算
        () => Money.fromYuan(0), // 税费计算
        () => Money.fromYuan(0) // 折扣计算
      );

      console.log(`   ✅ 订单创建成功: ${order.orderNumber}`);
      console.log(`   📦 订单项数量: ${order.orderItems.length}`);
      console.log(`   💰 订单总额: ${order.totalAmount.toString()}`);

      // 4. 确认订单
      console.log("步骤 4: 确认订单");
      OrderService.confirmOrder(order, products);
      console.log(`   ✅ 订单确认成功: ${order.status}`);

      // 检查库存变化
      console.log(`   📦 笔记本库存: ${laptop.stock}件 (减少了1件)`);
      console.log(`   🖱️  鼠标库存: ${mouse.stock}件 (减少了2件)`);

      // 5. 模拟支付
      console.log("步骤 5: 支付订单");
      order.markAsPaid();
      console.log(`   ✅ 支付成功: ${order.status}`);

      // 6. 发货
      console.log("步骤 6: 订单发货");
      order.ship("SF123456789");
      console.log(`   ✅ 发货成功: ${order.status}`);
      console.log(`   🚚 物流单号: ${order.trackingNumber}`);

      // 7. 确认收货
      console.log("步骤 7: 确认收货");
      order.markAsDelivered();
      console.log(`   ✅ 交易完成: ${order.status}`);

      // 8. 展示领域事件
      console.log("步骤 8: 查看领域事件");
      const events = order.getUncommittedEvents();
      console.log(`   📊 产生的领域事件数量: ${events.length}`);
      events.forEach((event, index) => {
        console.log(
          `   ${index + 1}. ${
            event.eventType
          } (${event.occurredOn.toISOString()})`
        );
      });

      console.log("\n🎉 完整业务流程演示成功！");
    } catch (error) {
      console.error("❌ 业务流程演示失败:", error);
    }
  }
}

// 如果直接运行此文件，则执行演示
if (require.main === module) {
  DemoService.runDemo();
}
