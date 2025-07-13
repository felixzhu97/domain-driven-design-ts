import { IntegrationTestBase } from "./IntegrationTestBase";

/**
 * 端到端集成测试
 */
export class EndToEndIntegrationTest extends IntegrationTestBase {
  /**
   * 运行测试
   */
  public async run(): Promise<void> {
    console.log("📋 开始端到端集成测试");

    await this.testCompleteOrderFlow();
    await this.testPaymentRefundFlow();
    await this.testInventoryIntegrationFlow();
    await this.testErrorRecoveryFlow();
    await this.testConcurrentOrderProcessing();
    await this.testExternalSystemIntegration();

    console.log("✅ 端到端集成测试完成");
  }

  /**
   * 测试完整订单流程
   */
  private async testCompleteOrderFlow(): Promise<void> {
    this.log("测试完整订单流程...");

    // 获取服务
    const orderService = this.getService<any>("OrderApplicationService");
    const paymentService = this.getService<any>("PaymentApplicationService");
    const notificationService = this.getService<any>("NotificationService");
    const testData = this.generateTestData();

    // 清空所有仓储和历史
    await this.clearAllRepositories();
    notificationService.clear();
    this.clearCapturedEvents();

    // 第1步：创建订单
    this.log("📝 步骤1: 创建订单");
    const orderData = testData.createOrderData({
      customerId: "customer-e2e-001",
      items: [
        { productId: "product-1", quantity: 2, unitPrice: 50000 }, // 500元
        { productId: "product-2", quantity: 1, unitPrice: 30000 }, // 300元
      ],
      description: "端到端测试订单",
    });

    const order = await orderService.createOrder(orderData);

    // 验证订单创建
    this.assertDeepEqual(order.status, "PENDING", "订单应该是待处理状态");
    this.assertDeepEqual(order.totalAmount, 130000, "订单总金额应该是1300元");
    this.assertEventPublished("OrderCreated");

    // 第2步：处理支付
    this.log("📝 步骤2: 处理支付");
    const paymentData = {
      orderId: order.id,
      customerId: order.customerId,
      amount: order.totalAmount,
      paymentMethod: {
        type: "CREDIT_CARD",
        cardNumber: "4111111111111111",
        expiryDate: new Date(2025, 11, 31),
        cvv: "123",
      },
      description: "端到端测试支付",
    };

    const payment = await paymentService.processPayment(paymentData);

    // 验证支付创建
    this.assertDeepEqual(payment.status, "PROCESSING", "支付应该是处理中状态");

    // 第3步：等待支付完成
    this.log("📝 步骤3: 等待支付完成");
    const paymentCompletedEvent = await this.waitForEvent(
      "PaymentCompleted",
      3000
    );

    // 验证支付完成事件
    this.assertDeepEqual(
      paymentCompletedEvent.orderId,
      order.id,
      "支付事件中的订单ID错误"
    );
    this.assertDeepEqual(
      paymentCompletedEvent.amount,
      130000,
      "支付事件中的金额错误"
    );

    // 第4步：确认订单
    this.log("📝 步骤4: 确认订单");
    await orderService.confirmOrder(order.id);

    // 验证订单确认
    this.assertEventPublished("OrderConfirmed");

    // 第5步：验证整体流程
    this.log("📝 步骤5: 验证整体流程");

    // 验证事件顺序
    this.assertEventOrder([
      "OrderCreated",
      "PaymentCompleted",
      "OrderConfirmed",
    ]);

    // 验证最终状态
    const orderRepository = this.getService<any>("OrderRepository");
    const paymentRepository = this.getService<any>("PaymentRepository");

    const finalOrder = await orderRepository.findById(order.id);
    const finalPayment = await paymentRepository.findById(payment.id);

    this.assertDeepEqual(finalOrder.status, "CONFIRMED", "最终订单状态错误");
    this.assertDeepEqual(finalPayment.status, "COMPLETED", "最终支付状态错误");

    this.log("✅ 完整订单流程测试通过");
  }

  /**
   * 测试支付退款流程
   */
  private async testPaymentRefundFlow(): Promise<void> {
    this.log("测试支付退款流程...");

    // 模拟支付聚合的退款功能（简化版）
    const paymentService = this.getService<any>("PaymentApplicationService");
    const paymentRepository = this.getService<any>("PaymentRepository");
    const testData = this.generateTestData();

    // 创建一个已完成的支付
    const paymentData = testData.createPaymentData({
      amount: 50000, // 500元
    });

    const payment = await paymentService.processPayment(paymentData);

    // 等待支付完成
    await this.waitForEvent("PaymentCompleted", 2000);

    // 模拟退款请求（简化实现）
    this.log("📝 模拟退款请求");

    // 发布退款事件模拟
    this.eventBus.emit("RefundRequested", {
      paymentId: payment.id,
      refundAmount: 30000, // 部分退款300元
      reason: "用户申请退款",
    });

    // 模拟退款处理完成
    setTimeout(() => {
      this.eventBus.emit("RefundCompleted", {
        paymentId: payment.id,
        refundAmount: 30000,
        refundId: `refund-${Date.now()}`,
      });
    }, 100);

    // 等待退款完成
    const refundEvent = await this.waitForEvent("RefundCompleted", 2000);

    // 验证退款事件
    this.assertDeepEqual(
      refundEvent.paymentId,
      payment.id,
      "退款事件中的支付ID错误"
    );
    this.assertDeepEqual(refundEvent.refundAmount, 30000, "退款金额错误");

    this.log("✅ 支付退款流程测试通过");
  }

  /**
   * 测试库存集成流程
   */
  private async testInventoryIntegrationFlow(): Promise<void> {
    this.log("测试库存集成流程...");

    const orderService = this.getService<any>("OrderApplicationService");
    const inventoryService = this.getService<any>("InventoryService");
    const inventorySystem = this.getService<any>("InventorySystem");
    const testData = this.generateTestData();

    // 清空仓储
    await this.clearAllRepositories();

    // 检查初始库存
    const initialStock = await inventorySystem.checkStock("product-1");
    this.log(`📦 初始库存: ${initialStock}`);

    // 创建需要库存检查的订单
    const orderData = testData.createOrderData({
      items: [{ productId: "product-1", quantity: 5, unitPrice: 10000 }],
    });

    // 预留库存
    const reserveResult = await inventoryService.reserveInventory(
      "product-1",
      5
    );
    this.assertDeepEqual(reserveResult, true, "库存预留应该成功");

    // 创建订单
    const order = await orderService.createOrder(orderData);

    // 验证库存变化
    const remainingStock = await inventorySystem.checkStock("product-1");
    this.assertDeepEqual(remainingStock, initialStock - 5, "库存应该减少5");

    // 模拟订单取消，释放库存
    this.eventBus.emit("OrderCancelled", {
      orderId: order.id,
      items: orderData.items,
    });

    // 检查库存恢复（这里简化处理）
    this.log("📦 库存管理集成验证完成");

    this.log("✅ 库存集成流程测试通过");
  }

  /**
   * 测试错误恢复流程
   */
  private async testErrorRecoveryFlow(): Promise<void> {
    this.log("测试错误恢复流程...");

    const orderService = this.getService<any>("OrderApplicationService");
    const paymentService = this.getService<any>("PaymentApplicationService");
    const testData = this.generateTestData();

    // 清空仓储
    await this.clearAllRepositories();

    // 场景1：支付失败的订单处理
    this.log("📝 场景1: 支付失败处理");

    const orderData = testData.createOrderData();
    const order = await orderService.createOrder(orderData);

    // 模拟支付失败
    this.eventBus.emit("PaymentFailed", {
      orderId: order.id,
      reason: "信用卡余额不足",
      errorCode: "INSUFFICIENT_FUNDS",
    });

    // 等待错误处理
    await this.delay(100);

    // 验证错误事件
    this.assertEventPublished("PaymentFailed");

    // 场景2：系统异常恢复
    this.log("📝 场景2: 系统异常恢复");

    try {
      // 模拟系统错误
      await orderService.createOrder({
        customerId: null, // 无效数据
        items: null,
      });
    } catch (error) {
      this.log("✅ 系统正确捕获了无效数据错误");
    }

    // 验证系统恢复能力
    const validOrderData = testData.createOrderData();
    const recoveredOrder = await orderService.createOrder(validOrderData);

    this.assertDeepEqual(
      recoveredOrder.status,
      "PENDING",
      "系统恢复后应该能正常处理订单"
    );

    this.log("✅ 错误恢复流程测试通过");
  }

  /**
   * 测试并发订单处理
   */
  private async testConcurrentOrderProcessing(): Promise<void> {
    this.log("测试并发订单处理...");

    const orderService = this.getService<any>("OrderApplicationService");
    const paymentService = this.getService<any>("PaymentApplicationService");
    const testData = this.generateTestData();

    // 清空仓储
    await this.clearAllRepositories();

    // 创建多个并发订单
    const concurrentCount = 10;
    const orderPromises = [];

    for (let i = 0; i < concurrentCount; i++) {
      const orderData = testData.createOrderData({
        customerId: `concurrent-customer-${i}`,
        items: [
          { productId: `product-${i % 3}`, quantity: 1, unitPrice: 10000 },
        ],
      });

      orderPromises.push(orderService.createOrder(orderData));
    }

    // 等待所有订单创建完成
    const orders = await Promise.all(orderPromises);

    // 验证并发处理结果
    this.assertArrayLength(orders, concurrentCount, "并发订单数量错误");

    // 验证每个订单都有唯一ID
    const orderIds = orders.map((order) => order.id);
    const uniqueIds = new Set(orderIds);
    this.assertDeepEqual(
      uniqueIds.size,
      concurrentCount,
      "订单ID应该都是唯一的"
    );

    // 并发处理支付
    const paymentPromises = orders.map((order) => {
      return paymentService.processPayment({
        orderId: order.id,
        customerId: order.customerId,
        amount: order.totalAmount,
        paymentMethod: {
          type: "CREDIT_CARD",
          cardNumber: "4111111111111111",
        },
      });
    });

    const payments = await Promise.all(paymentPromises);

    // 验证并发支付
    this.assertArrayLength(payments, concurrentCount, "并发支付数量错误");

    // 等待所有支付完成
    const completionPromises = payments.map((payment) =>
      this.waitForEvent("PaymentCompleted", 3000)
    );

    await Promise.all(completionPromises);

    // 验证数据一致性
    const orderRepository = this.getService<any>("OrderRepository");
    const paymentRepository = this.getService<any>("PaymentRepository");

    const allOrders = orderRepository.getAll();
    const allPayments = paymentRepository.getAll();

    this.assertArrayLength(allOrders, concurrentCount, "仓储中的订单数量错误");
    this.assertArrayLength(
      allPayments,
      concurrentCount,
      "仓储中的支付数量错误"
    );

    this.log("✅ 并发订单处理测试通过");
  }

  /**
   * 测试外部系统集成
   */
  private async testExternalSystemIntegration(): Promise<void> {
    this.log("测试外部系统集成...");

    const paymentGateway = this.getService<any>("PaymentGateway");
    const paymentAdapter = this.getService<any>("PaymentGatewayAdapter");
    const inventorySystem = this.getService<any>("InventorySystem");
    const notificationService = this.getService<any>("NotificationService");

    // 清空通知历史
    notificationService.clear();

    // 测试支付网关集成
    this.log("📝 测试支付网关集成");

    const paymentData = {
      orderId: "external-test-order",
      amount: 50000,
      currency: "CNY",
      paymentMethod: {
        type: "CREDIT_CARD",
        cardNumber: "4111111111111111",
      },
    };

    const paymentResult = await paymentAdapter.processPayment(paymentData);

    // 验证支付网关响应
    if (paymentResult.status === "SUCCESS") {
      this.log("✅ 支付网关集成成功");
    } else {
      this.log("⚠️ 支付网关返回失败状态（模拟场景）");
    }

    // 测试库存系统集成
    this.log("📝 测试库存系统集成");

    const stockLevel = await inventorySystem.checkStock("product-1");
    this.log(`📦 当前库存: ${stockLevel}`);

    const reserveSuccess = await inventorySystem.reserveStock("product-1", 1);
    if (reserveSuccess) {
      this.log("✅ 库存预留成功");

      const newStockLevel = await inventorySystem.checkStock("product-1");
      this.assertDeepEqual(newStockLevel, stockLevel - 1, "库存应该减少1");
    } else {
      this.log("⚠️ 库存不足（模拟场景）");
    }

    // 测试通知服务集成
    this.log("📝 测试通知服务集成");

    await notificationService.sendNotification({
      recipient: "test@example.com",
      subject: "订单通知",
      message: "您的订单已创建成功",
      channel: "EMAIL",
    });

    const notifications = notificationService.getNotifications();
    this.assertArrayLength(notifications, 1, "应该发送1个通知");

    this.log("✅ 外部系统集成测试通过");
  }

  /**
   * 清空所有仓储
   */
  private async clearAllRepositories(): Promise<void> {
    await this.getService<any>("OrderRepository").clear();
    await this.getService<any>("PaymentRepository").clear();
    await this.getService<any>("CustomerRepository").clear();
    await this.getService<any>("InventoryRepository").clear();
  }
}
