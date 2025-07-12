import { User, Product, Order, OrderItem } from "../domain/entities";
import {
  Money,
  Address,
  Email,
  ProductCategory,
} from "../domain/value-objects";
import { SpecificationService } from "../domain/services/SpecificationService";
import {
  OrderDiscountEligibilitySpecification,
  VipLevelSpecification,
  ProductPurchasabilitySpecification,
  LowStockWarningSpecification,
  CompositeSpecification,
} from "../domain/specifications";

/**
 * 领域规约使用示例
 */
export class SpecificationDemo {
  private specificationService: SpecificationService;

  constructor() {
    this.specificationService = new SpecificationService();
  }

  /**
   * 运行规约演示
   */
  public async runDemo(): Promise<void> {
    console.log("🎯 领域规约(Domain Specifications)演示开始");
    console.log("=".repeat(60));

    // 创建测试数据
    const { user, products, order } = this.createTestData();

    // 1. 基本规约使用示例
    await this.demonstrateBasicSpecifications(user, products, order);

    // 2. 组合规约使用示例
    await this.demonstrateCompositeSpecifications(user, products, order);

    // 3. 规约服务使用示例
    await this.demonstrateSpecificationService(user, products, order);

    // 4. 复杂业务场景示例
    await this.demonstrateComplexBusinessScenarios(user, products, order);

    console.log("\n🎉 领域规约演示完成！");
    console.log("📚 规约模式帮助我们:");
    console.log("   - 封装复杂的业务规则");
    console.log("   - 提高代码的可读性和可维护性");
    console.log("   - 支持规约的组合和重用");
    console.log("   - 便于业务规则的测试和验证");
  }

  /**
   * 基本规约使用示例
   */
  private async demonstrateBasicSpecifications(
    user: User,
    products: Product[],
    order: Order
  ): Promise<void> {
    console.log("\n🔍 1. 基本规约使用示例");
    console.log("-".repeat(40));

    // 商品可购买性规约
    const product = products[0];
    if (!product) {
      console.log("❌ 没有找到测试商品");
      return;
    }

    const purchasabilitySpec = new ProductPurchasabilitySpecification(1, false);
    const canPurchase = purchasabilitySpec.isSatisfiedBy({
      product,
      requestedQuantity: 2,
    });

    console.log(`📦 商品 "${product.name}" 可购买性检查:`);
    console.log(`   结果: ${canPurchase ? "✅ 可购买" : "❌ 不可购买"}`);
    console.log(`   规约描述: ${purchasabilitySpec.getDescription()}`);

    // 库存警告规约
    const stockWarningSpec = new LowStockWarningSpecification(10, 5);
    const needsWarning = stockWarningSpec.isSatisfiedBy(product);

    console.log(`\n📊 商品库存警告检查:`);
    console.log(`   当前库存: ${product.stock}`);
    console.log(`   需要警告: ${needsWarning ? "⚠️ 是" : "✅ 否"}`);
    console.log(`   规约描述: ${stockWarningSpec.getDescription()}`);

    // 订单折扣资格规约
    const discountSpec = new OrderDiscountEligibilitySpecification(
      Money.fromYuan(500, "CNY"),
      3
    );
    const eligibleForDiscount = discountSpec.isSatisfiedBy({
      order,
      customer: user,
    });

    console.log(`\n💰 订单折扣资格检查:`);
    console.log(`   订单金额: ${order.subtotalAmount.toString()}`);
    console.log(
      `   折扣资格: ${eligibleForDiscount ? "✅ 符合" : "❌ 不符合"}`
    );
    console.log(`   规约描述: ${discountSpec.getDescription()}`);
  }

  /**
   * 组合规约使用示例
   */
  private async demonstrateCompositeSpecifications(
    user: User,
    products: Product[],
    order: Order
  ): Promise<void> {
    console.log("\n🔧 2. 组合规约使用示例");
    console.log("-".repeat(40));

    // 创建单个规约
    const discountSpec = new OrderDiscountEligibilitySpecification(
      Money.fromYuan(200, "CNY"),
      1
    );

    console.log(`🎯 基本折扣规约:`);
    console.log(`   规约描述: ${discountSpec.getDescription()}`);

    const discountEligible = discountSpec.isSatisfiedBy({
      order,
      customer: user,
    });
    console.log(`   检查结果: ${discountEligible ? "✅ 符合" : "❌ 不符合"}`);

    // 创建组合规约示例
    const product = products[0];
    if (product) {
      const purchasabilitySpec = new ProductPurchasabilitySpecification(
        1,
        false
      );
      const stockWarningSpec = new LowStockWarningSpecification(20, 10);

      console.log(`\n📊 商品规约组合示例:`);
      console.log(`   可购买性规约: ${purchasabilitySpec.getDescription()}`);
      console.log(`   库存警告规约: ${stockWarningSpec.getDescription()}`);

      const canPurchase = purchasabilitySpec.isSatisfiedBy({
        product,
        requestedQuantity: 2,
      });
      const needsWarning = stockWarningSpec.isSatisfiedBy(product);

      console.log(`   可购买性检查: ${canPurchase ? "✅ 通过" : "❌ 失败"}`);
      console.log(
        `   库存警告检查: ${needsWarning ? "⚠️ 需要警告" : "✅ 正常"}`
      );
    }
  }

  /**
   * 规约服务使用示例
   */
  private async demonstrateSpecificationService(
    user: User,
    products: Product[],
    order: Order
  ): Promise<void> {
    console.log("\n🛠️ 3. 规约服务使用示例");
    console.log("-".repeat(40));

    // 使用规约服务进行各种验证
    const product = products[0];
    if (!product) {
      console.log("❌ 没有找到测试商品");
      return;
    }

    // 验证商品可购买性
    const canPurchase = this.specificationService.validateProductPurchasability(
      product,
      2
    );
    console.log(`📦 商品可购买性验证: ${canPurchase ? "✅ 通过" : "❌ 失败"}`);

    // 检查库存警告
    const stockCheck = this.specificationService.checkLowStockWarning(product);
    console.log(`📊 库存状态检查:`);
    console.log(`   需要警告: ${stockCheck.needsWarning ? "⚠️ 是" : "✅ 否"}`);
    console.log(
      `   库存严重不足: ${stockCheck.isCritical ? "🚨 是" : "✅ 否"}`
    );

    // 验证免费配送资格
    const freeShipping =
      this.specificationService.validateFreeShippingEligibility(
        order,
        Money.fromYuan(500, "CNY"),
        ["北京", "上海", "广州"]
      );
    console.log(`🚚 免费配送资格: ${freeShipping ? "✅ 符合" : "❌ 不符合"}`);

    // 复合验证
    const validationResult = this.specificationService.validateCompleteOrder(
      order,
      user,
      products
    );

    console.log(`\n📋 完整订单验证:`);
    console.log(
      `   验证结果: ${validationResult.isValid ? "✅ 通过" : "❌ 失败"}`
    );
    console.log(
      `   可以继续: ${validationResult.canProceed ? "✅ 是" : "❌ 否"}`
    );

    if (validationResult.warnings.length > 0) {
      console.log(`   警告信息: ${validationResult.warnings.join(", ")}`);
    }

    if (validationResult.errors.length > 0) {
      console.log(`   错误信息: ${validationResult.errors.join(", ")}`);
    }
  }

  /**
   * 复杂业务场景示例
   */
  private async demonstrateComplexBusinessScenarios(
    user: User,
    products: Product[],
    order: Order
  ): Promise<void> {
    console.log("\n🎪 4. 复杂业务场景示例");
    console.log("-".repeat(40));

    const product = products[0];
    if (!product) {
      console.log("❌ 没有找到测试商品");
      return;
    }

    // 场景1: 促销活动资格验证
    console.log(`🎉 场景1: 促销活动资格验证`);
    const promotionEligible =
      this.specificationService.validatePromotionEligibility(
        product,
        2.5, // 库存周转率
        45, // 库存天数
        ["电子产品", "家用电器"]
      );
    console.log(`   促销资格: ${promotionEligible ? "✅ 符合" : "❌ 不符合"}`);

    // 场景2: 批发订单验证
    console.log(`\n🏭 场景2: 批发订单验证`);
    const wholesaleEligible =
      this.specificationService.validateWholesaleEligibility(
        product,
        150, // 请求数量
        "enterprise", // 客户类型
        100 // 最小批发数量
      );
    console.log(`   批发资格: ${wholesaleEligible ? "✅ 符合" : "❌ 不符合"}`);

    // 场景3: VIP客户等级验证
    console.log(`\n👑 场景3: VIP客户等级验证`);
    const vipLevels: ("bronze" | "silver" | "gold" | "platinum")[] = [
      "bronze",
      "silver",
      "gold",
      "platinum",
    ];

    for (const level of vipLevels) {
      const isVip = this.specificationService.validateVipLevel(
        user,
        Money.fromYuan(15000, "CNY"), // 总消费
        35, // 订单数量
        120, // 会员天数
        level
      );
      console.log(
        `   ${level.toUpperCase()}等级: ${isVip ? "✅ 符合" : "❌ 不符合"}`
      );
    }

    // 场景4: 特殊优惠资格
    console.log(`\n🎁 场景4: 特殊优惠资格验证`);
    const specialOfferEligible =
      this.specificationService.validateSpecialOfferEligibility(
        user,
        new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15天前的订单
        false, // 不是首次客户
        30 // 最大天数
      );
    console.log(
      `   特殊优惠资格: ${specialOfferEligible ? "✅ 符合" : "❌ 不符合"}`
    );
  }

  /**
   * 创建测试数据
   */
  private createTestData(): {
    user: User;
    products: Product[];
    order: Order;
  } {
    // 创建用户
    const user = User.create(
      new Email("test@example.com"),
      "测试用户",
      "hashed_password",
      new Address({
        street: "测试街道123号",
        city: "北京",
        province: "北京",
        district: "朝阳区",
        country: "中国",
        postalCode: "100000",
      })
    );

    // 创建商品
    const products = [
      Product.create(
        "iPhone 15",
        "最新款苹果手机",
        Money.fromYuan(7999, "CNY"),
        new ProductCategory("电子产品", "电子产品类别"),
        "IP15-001",
        15
      ),
      Product.create(
        "MacBook Pro",
        "专业级笔记本电脑",
        Money.fromYuan(15999, "CNY"),
        new ProductCategory("电子产品", "电子产品类别"),
        "MBP-001",
        8
      ),
    ];

    // 创建订单
    const shippingAddress = new Address({
      street: "配送街道456号",
      city: "上海",
      province: "上海",
      district: "浦东新区",
      country: "中国",
      postalCode: "200000",
    });

    const order = Order.create(
      user.id,
      shippingAddress,
      shippingAddress,
      "ORD-DEMO-001"
    );

    // 添加订单项
    const firstProduct = products[0];
    if (firstProduct) {
      order.addItem(
        OrderItem.create(
          firstProduct.id,
          firstProduct.name,
          1,
          firstProduct.price
        )
      );
    }

    return { user, products, order };
  }
}
