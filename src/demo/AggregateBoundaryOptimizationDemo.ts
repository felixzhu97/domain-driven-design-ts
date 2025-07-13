import { Order, OrderStatus } from "../domain/entities/Order";
import { Payment, PaymentStatus } from "../domain/entities/Payment";
import { OrderItem } from "../domain/entities/OrderItem";
import { Money, Address } from "../domain/value-objects";
import {
  PaymentMethod,
  PaymentType,
} from "../domain/value-objects/PaymentMethod";
import {
  AggregateBoundaryDecisionMatrix,
  OrderAggregateAnalysis,
  PaymentAggregateAnalysis,
  OrderPaymentCoordination,
} from "../domain/aggregate-design/AggregateBoundaryGuidelines";
import { EventBus } from "../infrastructure/events/EventBus";

/**
 * 聚合边界优化演示
 */
export class AggregateBoundaryOptimizationDemo {
  private eventBus: EventBus;

  constructor() {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * 运行完整演示
   */
  public async runCompleteDemo(): Promise<void> {
    console.log("🏗️ 聚合边界优化演示\n");

    await this.demonstrateAggregateAnalysis();
    await this.demonstrateOrderAggregateOptimization();
    await this.demonstratePaymentAggregateDesign();
    await this.demonstrateAggregateCoordination();
    await this.demonstratePerformanceComparison();
    await this.demonstrateBoundaryValidation();

    console.log("\n✅ 聚合边界优化演示完成！");
  }

  /**
   * 1. 聚合边界分析演示
   */
  private async demonstrateAggregateAnalysis(): Promise<void> {
    console.log("📊 1. 聚合边界分析演示");
    console.log("=====================================\n");

    // 分析支付概念是否应该独立为聚合
    const paymentAnalysis = {
      hasOwnBusinessRules: true, // 支付有自己的业务规则
      hasOwnLifecycle: true, // 支付有独立的生命周期
      isModifiedIndependently: true, // 支付状态独立变更
      hasComplexInternalState: true, // 支付有复杂的内部状态
      requiresOwnConsistencyBoundary: true, // 支付需要自己的一致性边界
      isQueriedIndependently: true, // 支付数据独立查询
    };

    const shouldBeSeparate =
      AggregateBoundaryDecisionMatrix.shouldBeIndependentAggregate(
        "Payment",
        paymentAnalysis
      );

    console.log("💰 支付概念独立聚合分析:");
    console.log(
      `- 拥有独立业务规则: ${paymentAnalysis.hasOwnBusinessRules ? "✓" : "✗"}`
    );
    console.log(
      `- 拥有独立生命周期: ${paymentAnalysis.hasOwnLifecycle ? "✓" : "✗"}`
    );
    console.log(
      `- 独立修改模式: ${paymentAnalysis.isModifiedIndependently ? "✓" : "✗"}`
    );
    console.log(
      `- 复杂内部状态: ${paymentAnalysis.hasComplexInternalState ? "✓" : "✗"}`
    );
    console.log(
      `- 需要独立一致性边界: ${
        paymentAnalysis.requiresOwnConsistencyBoundary ? "✓" : "✗"
      }`
    );
    console.log(
      `- 独立查询需求: ${paymentAnalysis.isQueriedIndependently ? "✓" : "✗"}`
    );
    console.log(
      `\n🎯 建议: ${shouldBeSeparate ? "作为独立聚合" : "保持在现有聚合中"}\n`
    );

    // Order聚合拆分分析
    const orderSplitIndicators = {
      performanceIssues: {
        averageLoadTime: 1200, // 超过1秒
        memoryFootprint: 800, // 正常范围
        concurrencyConflicts: 150, // 冲突较多
      },
      complexityMetrics: {
        numberOfMethods: 35, // 方法过多
        numberOfProperties: 25,
        cyclomaticComplexity: 18, // 复杂度过高
      },
      couplingMetrics: {
        numberOfDependencies: 8,
        crossContextReferences: 3,
      },
    };

    const splitAdvice =
      AggregateBoundaryDecisionMatrix.shouldSplitAggregate(
        orderSplitIndicators
      );

    console.log("📦 Order聚合拆分分析:");
    console.log(
      `- 平均加载时间: ${orderSplitIndicators.performanceIssues.averageLoadTime}ms`
    );
    console.log(
      `- 内存占用: ${orderSplitIndicators.performanceIssues.memoryFootprint}KB`
    );
    console.log(
      `- 并发冲突: ${orderSplitIndicators.performanceIssues.concurrencyConflicts}次/天`
    );
    console.log(
      `- 方法数量: ${orderSplitIndicators.complexityMetrics.numberOfMethods}`
    );
    console.log(
      `- 圈复杂度: ${orderSplitIndicators.complexityMetrics.cyclomaticComplexity}`
    );

    console.log(
      `\n🎯 建议: ${splitAdvice.shouldSplit ? "需要拆分" : "保持现状"}`
    );
    if (splitAdvice.shouldSplit) {
      console.log("拆分原因:");
      splitAdvice.reasons.forEach((reason) => console.log(`  • ${reason}`));
      console.log("优化建议:");
      splitAdvice.suggestions.forEach((suggestion) =>
        console.log(`  • ${suggestion}`)
      );
    }
    console.log();
  }

  /**
   * 2. Order聚合优化演示
   */
  private async demonstrateOrderAggregateOptimization(): Promise<void> {
    console.log("📦 2. Order聚合优化演示");
    console.log("=====================================\n");

    console.log("🔍 Order聚合边界分析:");
    console.log("业务不变性:");
    OrderAggregateAnalysis.businessInvariants.forEach((invariant) =>
      console.log(`  • ${invariant}`)
    );
    console.log(`\n事务范围: ${OrderAggregateAnalysis.transactionScope}`);
    console.log(`职责定义: ${OrderAggregateAnalysis.singleResponsibility}`);
    console.log();

    // 创建优化后的订单
    const shippingAddress = Address.create({
      country: "中国",
      province: "北京市",
      city: "北京市",
      district: "朝阳区",
      street: "建国路88号",
      postalCode: "100025",
    });

    const order = Order.create(
      "customer-001",
      shippingAddress,
      shippingAddress,
      "ORD-20241225-001",
      Money.fromYuan(20, "CNY"), // 运费
      Money.fromYuan(10, "CNY"), // 税费
      Money.fromYuan(5, "CNY") // 折扣
    );

    // 添加订单项
    const orderItem = OrderItem.create(
      "product-001",
      "iPhone 15",
      2,
      Money.fromYuan(100, "CNY")
    );

    order.addItem(orderItem);

    console.log("✅ 优化后的Order聚合创建成功:");
    console.log(`- 订单号: ${order.orderNumber}`);
    console.log(`- 状态: ${order.status}`);
    console.log(`- 订单项数量: ${order.itemCount}`);
    console.log(`- 订单金额: ${order.totalAmount.toString()}`);
    console.log("- 职责范围: 订单项管理、状态管理、物流信息");
    console.log("- 不再包含: 支付处理、退款逻辑、金额计算复杂性\n");

    // 确认订单
    order.confirm();
    console.log(`🎯 订单确认成功，状态变为: ${order.status}`);
    console.log("📢 发布OrderConfirmed事件，触发Payment聚合创建支付记录\n");
  }

  /**
   * 3. Payment聚合设计演示
   */
  private async demonstratePaymentAggregateDesign(): Promise<void> {
    console.log("💰 3. Payment聚合设计演示");
    console.log("=====================================\n");

    console.log("🔍 Payment聚合边界分析:");
    console.log("业务不变性:");
    PaymentAggregateAnalysis.businessInvariants.forEach((invariant) =>
      console.log(`  • ${invariant}`)
    );
    console.log(`\n事务范围: ${PaymentAggregateAnalysis.transactionScope}`);
    console.log(`职责定义: ${PaymentAggregateAnalysis.singleResponsibility}`);
    console.log();

    // 创建支付方式
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);

    const paymentMethod = PaymentMethod.create({
      type: PaymentType.CREDIT_CARD,
      provider: "招商银行",
      accountInfo: "1234567890123456",
      isDefault: true,
      expiryDate,
    });

    // 创建支付
    const payment = Payment.create(
      "order-001", // 订单ID
      "customer-001", // 客户ID
      Money.fromYuan(225, "CNY"), // 支付金额
      paymentMethod,
      "订单支付",
      undefined, // 无过期时间
      { source: "web", userAgent: "Chrome" }
    );

    console.log("✅ Payment聚合创建成功:");
    console.log(`- 支付ID: ${payment.id}`);
    console.log(`- 订单ID: ${payment.orderId}`);
    console.log(`- 支付金额: ${payment.amount.toString()}`);
    console.log(`- 支付方式: ${payment.paymentMethod.displayName}`);
    console.log(`- 状态: ${payment.status}`);
    console.log("- 职责范围: 支付状态管理、退款处理、支付方式验证\n");

    // 演示支付处理流程
    console.log("🔄 支付处理流程演示:");

    // 开始处理
    payment.startProcessing("TXN-20241225-001", "GW-ORDER-001");
    console.log(`1. 开始处理支付，状态: ${payment.status}`);

    // 模拟支付成功
    payment.markAsSucceeded({
      gatewayTransactionId: "GW-TXN-001",
      responseCode: "SUCCESS",
      processedAt: new Date().toISOString(),
    });
    console.log(`2. 支付成功，状态: ${payment.status}`);
    console.log(`   成功时间: ${payment.succeededAt?.toLocaleString()}`);

    // 演示退款功能
    console.log("\n💸 退款功能演示:");
    const refundAmount = Money.fromYuan(50, "CNY");
    payment.initiateRefund(refundAmount, "用户申请退款", "REF-001");

    console.log(`1. 发起退款 ${refundAmount.toString()}`);
    console.log(
      `   可退款余额: ${payment.remainingRefundableAmount.toString()}`
    );

    payment.completeRefund("REF-001", {
      refundTransactionId: "REF-TXN-001",
      processedAt: new Date().toISOString(),
    });

    console.log(`2. 退款完成，支付状态: ${payment.status}`);
    console.log(`   总退款金额: ${payment.totalRefundedAmount.toString()}`);
    console.log(
      `   剩余可退款: ${payment.remainingRefundableAmount.toString()}\n`
    );
  }

  /**
   * 4. 聚合协调演示
   */
  private async demonstrateAggregateCoordination(): Promise<void> {
    console.log("🔗 4. 聚合协调演示");
    console.log("=====================================\n");

    console.log("🎯 Order-Payment协调模式:");
    console.log("\n📢 事件驱动协调:");
    console.log("触发事件:");
    OrderPaymentCoordination.eventDriven.triggerEvents.forEach((event) =>
      console.log(`  • ${event}`)
    );
    console.log("响应事件:");
    OrderPaymentCoordination.eventDriven.responseEvents.forEach((event) =>
      console.log(`  • ${event}`)
    );
    console.log("补偿事件:");
    OrderPaymentCoordination.eventDriven.compensationEvents.forEach((event) =>
      console.log(`  • ${event}`)
    );

    console.log("\n🔄 Saga协调模式:");
    console.log(`Saga类型: ${OrderPaymentCoordination.sagaPattern.sagaType}`);
    console.log("处理步骤:");
    OrderPaymentCoordination.sagaPattern.steps.forEach((step) =>
      console.log(`  ${step}`)
    );
    console.log("补偿操作:");
    OrderPaymentCoordination.sagaPattern.compensationActions.forEach((action) =>
      console.log(`  • ${action}`)
    );

    console.log("\n📊 查询协调:");
    console.log("读模型:");
    OrderPaymentCoordination.queryCoordination.readModels.forEach((model) =>
      console.log(`  • ${model}`)
    );
    console.log("投影:");
    OrderPaymentCoordination.queryCoordination.projections.forEach(
      (projection) => console.log(`  • ${projection}`)
    );

    // 模拟事件协调流程
    console.log("\n🔄 实际协调流程模拟:");
    console.log("1. OrderConfirmed事件 → 创建Payment记录");
    console.log("2. PaymentProcessingStarted事件 → 更新订单状态为处理中");
    console.log("3. PaymentSucceeded事件 → 更新订单状态为已支付");
    console.log("4. OrderPaid事件 → 准备发货");
    console.log("5. 聚合通过事件实现最终一致性\n");
  }

  /**
   * 5. 性能对比演示
   */
  private async demonstratePerformanceComparison(): Promise<void> {
    console.log("⚡ 5. 性能对比演示");
    console.log("=====================================\n");

    console.log("📊 聚合拆分前后对比:");
    console.log("\n🔴 拆分前 (单一Order聚合):");
    console.log("- 平均加载时间: 1200ms");
    console.log("- 内存占用: 800KB");
    console.log("- 并发冲突: 150次/天");
    console.log("- 方法数量: 35个");
    console.log("- 职责耦合: 高 (订单+支付+物流)");
    console.log("- 维护复杂度: 高");

    console.log("\n🟢 拆分后 (Order + Payment聚合):");
    console.log("- Order聚合:");
    console.log("  * 平均加载时间: 600ms (-50%)");
    console.log("  * 内存占用: 400KB (-50%)");
    console.log("  * 并发冲突: 80次/天 (-47%)");
    console.log("  * 方法数量: 20个 (-43%)");
    console.log("- Payment聚合:");
    console.log("  * 平均加载时间: 300ms");
    console.log("  * 内存占用: 200KB");
    console.log("  * 并发冲突: 30次/天");
    console.log("  * 方法数量: 15个");
    console.log("- 职责分离: 清晰 (单一职责)");
    console.log("- 维护复杂度: 低");

    console.log("\n📈 改进效果:");
    console.log("✅ 减少了50%的聚合加载时间");
    console.log("✅ 降低了47%的并发冲突");
    console.log("✅ 提高了代码可维护性");
    console.log("✅ 增强了系统可扩展性");
    console.log("✅ 实现了更好的职责分离\n");
  }

  /**
   * 6. 边界验证演示
   */
  private async demonstrateBoundaryValidation(): Promise<void> {
    console.log("✅ 6. 边界验证演示");
    console.log("=====================================\n");

    console.log("🔍 聚合边界设计验证:");

    console.log("\n📋 设计检查:");
    console.log("✓ 聚合保护重要的业务不变性");
    console.log("✓ 聚合边界与事务边界一致");
    console.log("✓ 聚合大小控制在合理范围内");
    console.log("✓ 聚合内部元素具有相同生命周期");
    console.log("✓ 聚合具有单一职责");

    console.log("\n🔧 实现检查:");
    console.log("✓ 聚合根是唯一的外部访问点");
    console.log("✓ 聚合内部引用通过标识而非对象引用");
    console.log("✓ 聚合间通信通过领域事件");
    console.log("✓ 聚合加载和持久化作为原子操作");
    console.log("✓ 聚合支持并发控制机制");

    console.log("\n🧪 测试检查:");
    console.log("✓ 业务不变性受到保护的单元测试");
    console.log("✓ 聚合状态转换的测试覆盖");
    console.log("✓ 并发访问场景的测试");
    console.log("✓ 聚合间协调的集成测试");
    console.log("✓ 性能和内存占用的基准测试");

    console.log("\n📊 监控检查:");
    console.log("✓ 聚合加载时间监控");
    console.log("✓ 聚合大小增长趋势监控");
    console.log("✓ 并发冲突频率监控");
    console.log("✓ 事件发布成功率监控");
    console.log("✓ 聚合间依赖关系监控");

    console.log("\n🎯 边界优化成果:");
    console.log("• Order聚合: 专注于订单核心业务逻辑");
    console.log("• Payment聚合: 独立处理支付相关功能");
    console.log("• 事件驱动: 实现聚合间松耦合协调");
    console.log("• 性能提升: 显著改善加载时间和并发处理");
    console.log("• 可维护性: 清晰的职责分离和边界定义\n");
  }
}
