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
  ProductPurchasabilitySpecification,
  LowStockWarningSpecification,
} from "../domain/specifications";

/**
 * 简化的领域规约演示
 */
export async function runSimpleSpecificationDemo(): Promise<void> {
  console.log("🎯 领域规约(Domain Specifications)功能演示");
  console.log("=".repeat(60));

  // 创建测试数据
  const user = User.create(
    new Email("demo@example.com"),
    "演示用户",
    "password123",
    new Address({
      street: "演示街道123号",
      city: "北京",
      province: "北京",
      district: "朝阳区",
      country: "中国",
      postalCode: "100000",
    })
  );

  const product = Product.create(
    "演示商品",
    "用于演示规约功能的商品",
    Money.fromYuan(999, "CNY"),
    new ProductCategory("演示分类", "演示商品分类"),
    "DEMO-001",
    15
  );

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

  order.addItem(OrderItem.create(product.id, product.name, 2, product.price));

  console.log("\n📋 演示数据创建完成");
  console.log(`👤 用户: ${user.name}`);
  console.log(`📦 商品: ${product.name} (库存: ${product.stock})`);
  console.log(
    `🛒 订单: ${order.orderNumber} (金额: ${order.subtotalAmount.toString()})`
  );

  console.log("\n" + "=".repeat(60));
  console.log("🧪 规约功能测试");

  // 1. 商品可购买性规约
  console.log("\n🔍 1. 商品可购买性规约测试");
  const purchasabilitySpec = new ProductPurchasabilitySpecification(1, false);

  const testCases = [
    { quantity: 2, description: "正常购买数量(2件)" },
    { quantity: 20, description: "超量购买(20件)" },
    { quantity: 0, description: "无效数量(0件)" },
  ];

  for (const testCase of testCases) {
    const result = purchasabilitySpec.isSatisfiedBy({
      product,
      requestedQuantity: testCase.quantity,
    });
    console.log(
      `   ${testCase.description}: ${result ? "✅ 通过" : "❌ 失败"}`
    );
  }

  // 2. 库存警告规约
  console.log("\n📊 2. 库存警告规约测试");
  const stockWarningSpec = new LowStockWarningSpecification(20, 10);
  const needsWarning = stockWarningSpec.isSatisfiedBy(product);
  const isCritical = stockWarningSpec.isCriticalStock(product);

  console.log(`   当前库存: ${product.stock}`);
  console.log(`   需要警告: ${needsWarning ? "⚠️ 是" : "✅ 否"}`);
  console.log(`   库存紧急: ${isCritical ? "🚨 是" : "✅ 否"}`);

  // 3. 订单折扣资格规约
  console.log("\n💰 3. 订单折扣资格规约测试");
  const discountSpec = new OrderDiscountEligibilitySpecification(
    Money.fromYuan(500, "CNY"),
    1
  );
  const eligibleForDiscount = discountSpec.isSatisfiedBy({
    order,
    customer: user,
  });

  console.log(`   订单金额: ${order.subtotalAmount.toString()}`);
  console.log(`   最低要求: ¥500`);
  console.log(`   折扣资格: ${eligibleForDiscount ? "✅ 符合" : "❌ 不符合"}`);

  // 4. 规约服务综合测试
  console.log("\n🛠️ 4. 规约服务综合测试");
  const specService = new SpecificationService();

  // 验证商品可购买性
  const canPurchase = specService.validateProductPurchasability(product, 2);
  console.log(`   商品可购买性: ${canPurchase ? "✅ 通过" : "❌ 失败"}`);

  // 检查库存状态
  const stockCheck = specService.checkLowStockWarning(product);
  console.log(
    `   库存警告检查: ${stockCheck.needsWarning ? "⚠️ 需要警告" : "✅ 正常"}`
  );
  console.log(
    `   库存紧急检查: ${stockCheck.isCritical ? "🚨 紧急" : "✅ 安全"}`
  );

  // 验证免费配送资格
  const freeShipping = specService.validateFreeShippingEligibility(
    order,
    Money.fromYuan(800, "CNY"),
    ["北京", "上海", "广州"]
  );
  console.log(`   免费配送资格: ${freeShipping ? "✅ 符合" : "❌ 不符合"}`);

  // 5. 复合验证示例
  console.log("\n📋 5. 复合验证示例");
  const validationResult = specService.validateCompleteOrder(order, user, [
    product,
  ]);

  console.log(
    `   订单验证结果: ${validationResult.isValid ? "✅ 通过" : "❌ 失败"}`
  );
  console.log(
    `   可以继续处理: ${validationResult.canProceed ? "✅ 是" : "❌ 否"}`
  );

  if (validationResult.warnings.length > 0) {
    console.log(`   警告信息:`);
    validationResult.warnings.forEach((warning) =>
      console.log(`     ⚠️ ${warning}`)
    );
  }

  if (validationResult.errors.length > 0) {
    console.log(`   错误信息:`);
    validationResult.errors.forEach((error) => console.log(`     ❌ ${error}`));
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 领域规约演示完成！");
  console.log("\n📚 规约模式的优势:");
  console.log("   ✅ 将复杂的业务规则封装为可重用的组件");
  console.log("   ✅ 提高代码的可读性和可维护性");
  console.log("   ✅ 支持规约的组合和链式调用");
  console.log("   ✅ 便于业务规则的单元测试");
  console.log("   ✅ 符合单一职责原则和开闭原则");
  console.log("   ✅ 使业务逻辑更加清晰和表达性强");
}
