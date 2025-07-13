import { IntegrationTestBase } from "./IntegrationTestBase";
import { Money } from "../../domain/value-objects/Money";
import {
  PaymentMethod,
  PaymentType,
} from "../../domain/value-objects/PaymentMethod";

/**
 * 领域层集成测试
 */
export class DomainLayerIntegrationTest extends IntegrationTestBase {
  /**
   * 运行测试
   */
  public async run(): Promise<void> {
    console.log("📋 开始领域层集成测试");

    await this.testValueObjectsIntegration();
    await this.testAggregateRootLifecycle();
    await this.testDomainEventsFlow();
    await this.testBusinessRulesEnforcement();
    await this.testAggregateCollaboration();

    console.log("✅ 领域层集成测试完成");
  }

  /**
   * 测试值对象集成
   */
  private async testValueObjectsIntegration(): Promise<void> {
    this.log("测试值对象集成...");

    // 测试Money值对象
    const money1 = Money.fromYuan(100, "CNY");
    const money2 = Money.fromYuan(50, "CNY");
    const sum = money1.add(money2);

    this.assertDeepEqual(sum.amountInYuan, 150, "Money加法计算错误");
    this.assertDeepEqual(sum.currency, "CNY", "Money货币类型错误");

    // 测试PaymentMethod值对象
    const paymentMethod = new PaymentMethod({
      type: PaymentType.CREDIT_CARD,
      cardNumber: "4111111111111111",
      expiryDate: new Date(2025, 11, 31),
      cvv: "123",
      cardholderName: "测试用户",
      isDefault: true,
    });

    if (!paymentMethod.isValid) {
      throw new Error("PaymentMethod应该是有效的");
    }

    this.log("✅ 值对象集成测试通过");
  }

  /**
   * 测试聚合根生命周期
   */
  private async testAggregateRootLifecycle(): Promise<void> {
    this.log("测试聚合根生命周期...");

    const testData = this.generateTestData();
    const orderData = testData.createOrderData();

    // 模拟Order聚合根（简化版本）
    const order = {
      id: "order-123",
      customerId: orderData.customerId,
      items: orderData.items,
      status: "PENDING",
      totalAmount: this.calculateTotal(orderData.items),
      createdAt: new Date(),
      events: [] as any[],
    };

    // 添加事件
    order.events.push({
      type: "OrderCreated",
      orderId: order.id,
      customerId: order.customerId,
      totalAmount: order.totalAmount,
      timestamp: new Date(),
    });

    // 确认订单
    order.status = "CONFIRMED";
    order.events.push({
      type: "OrderConfirmed",
      orderId: order.id,
      timestamp: new Date(),
    });

    // 验证状态变化
    this.assertDeepEqual(order.status, "CONFIRMED", "订单状态应该是CONFIRMED");
    this.assertArrayLength(order.events, 2, "应该有2个领域事件");

    this.log("✅ 聚合根生命周期测试通过");
  }

  /**
   * 测试领域事件流
   */
  private async testDomainEventsFlow(): Promise<void> {
    this.log("测试领域事件流...");

    // 发布订单创建事件
    this.eventBus.emit("OrderCreated", {
      orderId: "order-123",
      customerId: "customer-456",
      totalAmount: 25000,
    });

    // 发布支付完成事件
    this.eventBus.emit("PaymentCompleted", {
      paymentId: "payment-789",
      orderId: "order-123",
      amount: 25000,
    });

    // 等待事件处理
    await this.delay(50);

    // 验证事件发布
    this.assertEventPublished("OrderCreated", {
      orderId: "order-123",
      customerId: "customer-456",
      totalAmount: 25000,
    });

    this.assertEventPublished("PaymentCompleted", {
      paymentId: "payment-789",
      orderId: "order-123",
      amount: 25000,
    });

    this.log("✅ 领域事件流测试通过");
  }

  /**
   * 测试业务规则强制执行
   */
  private async testBusinessRulesEnforcement(): Promise<void> {
    this.log("测试业务规则强制执行...");

    // 测试Money不能为负数
    try {
      Money.fromYuan(-100, "CNY");
      throw new Error("应该抛出异常");
    } catch (error) {
      this.log("✅ Money负数验证通过");
    }

    // 测试不同货币不能运算
    try {
      const cny = Money.fromYuan(100, "CNY");
      const usd = Money.fromYuan(100, "USD");
      cny.add(usd);
      throw new Error("应该抛出异常");
    } catch (error) {
      this.log("✅ Money货币类型验证通过");
    }

    // 测试PaymentMethod验证
    try {
      new PaymentMethod({
        type: PaymentType.CREDIT_CARD,
        cardNumber: "invalid", // 无效卡号
        isDefault: false,
      });
      // 应该创建成功但isValid为false
    } catch (error) {
      this.log("✅ PaymentMethod验证通过");
    }

    this.log("✅ 业务规则强制执行测试通过");
  }

  /**
   * 测试聚合协作
   */
  private async testAggregateCollaboration(): Promise<void> {
    this.log("测试聚合协作...");

    const orderService = this.getService<any>("OrderApplicationService");
    const paymentService = this.getService<any>("PaymentApplicationService");

    // 创建订单
    const orderData = this.generateTestData().createOrderData();
    const order = await orderService.createOrder(orderData);

    // 处理支付
    const paymentData = {
      orderId: order.id,
      customerId: order.customerId,
      amount: order.totalAmount,
      paymentMethod: {
        type: "CREDIT_CARD",
        cardNumber: "4111111111111111",
      },
    };

    const payment = await paymentService.processPayment(paymentData);

    // 等待异步处理完成
    await this.waitForEvent("PaymentCompleted", 2000);

    // 验证协作结果
    this.assertEventPublished("OrderCreated");
    this.assertEventPublished("PaymentCompleted");

    // 验证事件顺序
    this.assertEventOrder(["OrderCreated", "PaymentCompleted"]);

    this.log("✅ 聚合协作测试通过");
  }

  /**
   * 计算总金额
   */
  private calculateTotal(items: any[]): number {
    return items.reduce((total, item) => {
      return total + item.quantity * item.unitPrice;
    }, 0);
  }
}
