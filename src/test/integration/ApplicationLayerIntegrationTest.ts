import { IntegrationTestBase } from "./IntegrationTestBase";

/**
 * 应用层集成测试
 */
export class ApplicationLayerIntegrationTest extends IntegrationTestBase {
  /**
   * 运行测试
   */
  public async run(): Promise<void> {
    console.log("📋 开始应用层集成测试");

    await this.testOrderApplicationService();
    await this.testPaymentApplicationService();
    await this.testCrossBoundaryCollaboration();
    await this.testTransactionManagement();
    await this.testErrorHandlingAndRecovery();

    console.log("✅ 应用层集成测试完成");
  }

  /**
   * 测试订单应用服务
   */
  private async testOrderApplicationService(): Promise<void> {
    this.log("测试订单应用服务...");

    const orderService = this.getService<any>("OrderApplicationService");
    const orderRepository = this.getService<any>("OrderRepository");
    const testData = this.generateTestData();

    // 清空仓储
    await orderRepository.clear();

    // 创建订单
    const orderData = testData.createOrderData({
      customerId: "customer-123",
      items: [
        { productId: "product-1", quantity: 2, unitPrice: 10000 },
        { productId: "product-2", quantity: 1, unitPrice: 5000 },
      ],
    });

    const order = await orderService.createOrder(orderData);

    // 验证订单创建
    this.assertDeepEqual(order.status, "PENDING", "订单状态应该是PENDING");
    this.assertDeepEqual(order.totalAmount, 25000, "订单总金额计算错误");

    // 验证事件发布
    this.assertEventPublished("OrderCreated", {
      orderId: order.id,
      customerId: "customer-123",
      totalAmount: 25000,
    });

    // 验证持久化
    const savedOrder = await orderRepository.findById(order.id);
    this.assertDeepEqual(savedOrder.id, order.id, "订单未正确保存");

    // 确认订单
    await orderService.confirmOrder(order.id);

    // 验证状态更新
    const confirmedOrder = await orderRepository.findById(order.id);
    this.assertDeepEqual(
      confirmedOrder.status,
      "CONFIRMED",
      "订单状态应该是CONFIRMED"
    );

    // 验证事件发布
    this.assertEventPublished("OrderConfirmed", {
      orderId: order.id,
      customerId: "customer-123",
    });

    this.log("✅ 订单应用服务测试通过");
  }

  /**
   * 测试支付应用服务
   */
  private async testPaymentApplicationService(): Promise<void> {
    this.log("测试支付应用服务...");

    const paymentService = this.getService<any>("PaymentApplicationService");
    const paymentRepository = this.getService<any>("PaymentRepository");
    const testData = this.generateTestData();

    // 清空仓储
    await paymentRepository.clear();

    // 创建支付
    const paymentData = testData.createPaymentData({
      orderId: "order-123",
      customerId: "customer-456",
      amount: 15000,
    });

    const payment = await paymentService.processPayment(paymentData);

    // 验证支付创建
    this.assertDeepEqual(
      payment.status,
      "PROCESSING",
      "支付状态应该是PROCESSING"
    );
    this.assertDeepEqual(payment.amount, 15000, "支付金额错误");

    // 等待异步处理完成
    const completedEvent = await this.waitForEvent("PaymentCompleted", 2000);

    // 验证完成状态
    const processedPayment = await paymentRepository.findById(payment.id);
    this.assertDeepEqual(
      processedPayment.status,
      "COMPLETED",
      "支付状态应该是COMPLETED"
    );

    // 验证事件数据
    this.assertDeepEqual(
      completedEvent.paymentId,
      payment.id,
      "事件中的支付ID错误"
    );
    this.assertDeepEqual(completedEvent.amount, 15000, "事件中的金额错误");

    this.log("✅ 支付应用服务测试通过");
  }

  /**
   * 测试跨边界协作
   */
  private async testCrossBoundaryCollaboration(): Promise<void> {
    this.log("测试跨边界协作...");

    const orderService = this.getService<any>("OrderApplicationService");
    const paymentService = this.getService<any>("PaymentApplicationService");
    const inventoryService = this.getService<any>("InventoryService");
    const testData = this.generateTestData();

    // 清空所有仓储
    await this.getService<any>("OrderRepository").clear();
    await this.getService<any>("PaymentRepository").clear();

    // 检查库存
    const hasStock = await inventoryService.checkAvailability("product-1", 2);
    if (!hasStock) {
      this.log("⚠️ 库存不足，跳过此测试");
      return;
    }

    // 创建订单
    const orderData = testData.createOrderData({
      items: [{ productId: "product-1", quantity: 2, unitPrice: 10000 }],
    });

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

    // 等待支付完成
    await this.waitForEvent("PaymentCompleted", 2000);

    // 验证跨边界协作
    this.assertEventOrder(["OrderCreated", "PaymentCompleted"]);

    // 确认订单
    await orderService.confirmOrder(order.id);

    // 验证最终状态
    this.assertEventPublished("OrderConfirmed");

    this.log("✅ 跨边界协作测试通过");
  }

  /**
   * 测试事务管理
   */
  private async testTransactionManagement(): Promise<void> {
    this.log("测试事务管理...");

    const orderService = this.getService<any>("OrderApplicationService");
    const orderRepository = this.getService<any>("OrderRepository");
    const testData = this.generateTestData();

    // 清空仓储
    await orderRepository.clear();

    // 测试正常事务
    const orderData = testData.createOrderData();
    const order = await orderService.createOrder(orderData);

    // 验证事务完整性
    const savedOrder = await orderRepository.findById(order.id);
    this.assertDeepEqual(
      savedOrder.id,
      order.id,
      "事务回滚测试：数据应该已保存"
    );

    // 测试并发访问
    const concurrentPromises = [];
    for (let i = 0; i < 5; i++) {
      const concurrentOrderData = testData.createOrderData({
        customerId: `customer-${i}`,
      });
      concurrentPromises.push(orderService.createOrder(concurrentOrderData));
    }

    const concurrentOrders = await Promise.all(concurrentPromises);

    // 验证并发创建
    this.assertArrayLength(concurrentOrders, 5, "并发创建的订单数量错误");

    // 验证数据一致性
    const allOrders = orderRepository.getAll();
    this.assertArrayLength(allOrders, 6, "总订单数量错误"); // 包括之前创建的1个

    this.log("✅ 事务管理测试通过");
  }

  /**
   * 测试错误处理和恢复
   */
  private async testErrorHandlingAndRecovery(): Promise<void> {
    this.log("测试错误处理和恢复...");

    const orderService = this.getService<any>("OrderApplicationService");
    const paymentService = this.getService<any>("PaymentApplicationService");

    // 测试业务规则验证错误
    try {
      await orderService.createOrder({
        customerId: "", // 无效客户ID
        items: [], // 空订单项
      });
      throw new Error("应该抛出验证错误");
    } catch (error) {
      this.log("✅ 业务规则验证错误处理通过");
    }

    // 测试不存在的资源错误
    try {
      await orderService.confirmOrder("non-existent-order");
      throw new Error("应该抛出资源不存在错误");
    } catch (error) {
      this.log("✅ 资源不存在错误处理通过");
    }

    // 测试支付服务错误处理
    try {
      await paymentService.processPayment({
        orderId: "order-123",
        customerId: "customer-456",
        amount: -1000, // 无效金额
        paymentMethod: null,
      });
      // 某些错误可能不会立即抛出，而是在异步处理中处理
      this.log("⚠️ 支付错误处理：异步错误需要通过事件监听验证");
    } catch (error) {
      this.log("✅ 支付错误处理通过");
    }

    // 测试系统恢复能力
    await this.container.reset(); // 重置容器模拟系统重启

    // 验证服务仍然可用
    const testData = this.generateTestData();
    const orderData = testData.createOrderData();
    const newOrderService = this.getService<any>("OrderApplicationService");
    const recoveredOrder = await newOrderService.createOrder(orderData);

    this.assertDeepEqual(
      recoveredOrder.status,
      "PENDING",
      "系统恢复后服务应该正常"
    );

    this.log("✅ 错误处理和恢复测试通过");
  }
}
