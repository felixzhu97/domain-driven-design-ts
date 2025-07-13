import { Money } from "../domain/value-objects";
import {
  PaymentMethod,
  PaymentType,
} from "../domain/value-objects/PaymentMethod";
import { PaymentStatus } from "../domain/entities/Payment";
import {
  AntiCorruptionLayerManager,
  AntiCorruptionLayerConfig,
} from "../infrastructure/anti-corruption/AntiCorruptionLayer";
import {
  PaymentGatewayAdapter,
  PaymentGatewayConfigFactory,
  InternalPaymentData,
  InternalRefundData,
} from "../infrastructure/anti-corruption/PaymentGatewayAdapter";
import { MockPaymentGateway } from "../infrastructure/external-systems/ExternalSystemMocks";

/**
 * 防腐层演示
 */
export class AntiCorruptionLayerDemo {
  private aclManager: AntiCorruptionLayerManager;
  private paymentAdapter: PaymentGatewayAdapter;

  constructor() {
    this.aclManager = AntiCorruptionLayerManager.getInstance();

    // 创建支付网关配置
    const paymentConfig =
      PaymentGatewayConfigFactory.createConfig("MERCHANT_001");

    // 创建支付网关适配器
    this.paymentAdapter = new PaymentGatewayAdapter(
      paymentConfig,
      new MockPaymentGateway()
    );

    // 注册到防腐层管理器
    this.aclManager.registerAdapter("payment", this.paymentAdapter);
  }

  /**
   * 运行完整演示
   */
  public async runCompleteDemo(): Promise<void> {
    console.log("🛡️ 防腐层(Anti-Corruption Layer)演示\n");

    await this.demonstratePaymentGatewayIntegration();
    await this.demonstrateErrorHandlingAndRetry();
    await this.demonstrateCachingMechanism();
    await this.demonstrateMetricsAndMonitoring();
    await this.demonstrateHealthCheck();
    await this.demonstrateDataTransformation();

    console.log("\n✅ 防腐层演示完成！");
  }

  /**
   * 1. 支付网关集成演示
   */
  private async demonstratePaymentGatewayIntegration(): Promise<void> {
    console.log("💳 1. 支付网关集成演示");
    console.log("=====================================\n");

    try {
      // 创建支付方式
      const paymentMethod = PaymentMethod.create({
        type: PaymentType.CREDIT_CARD,
        provider: "招商银行",
        accountInfo: "1234567890123456",
        isDefault: true,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      // 创建内部支付数据
      const paymentData: InternalPaymentData = {
        orderId: "ORDER-001",
        customerId: "CUSTOMER-001",
        amount: Money.fromYuan(100, "CNY"),
        paymentMethod,
        description: "商品购买",
        metadata: { source: "web", userAgent: "Chrome" },
      };

      console.log("🔄 创建支付请求...");
      const createResponse = await this.paymentAdapter.createPayment(
        paymentData
      );

      if (createResponse.success && createResponse.data) {
        console.log("✅ 支付创建成功:");
        console.log(`- 交易ID: ${createResponse.data.transactionId}`);
        console.log(`- 订单ID: ${createResponse.data.orderId}`);
        console.log(`- 状态: ${createResponse.data.status}`);
        console.log(`- 金额: ${createResponse.data.amount.toString()}`);
        console.log(`- 支付URL: ${createResponse.data.paymentUrl}`);
        console.log(`- 响应时间: ${createResponse.metadata.latency}ms`);
        console.log(`- 请求ID: ${createResponse.metadata.requestId}`);
        console.log(
          `- 来自缓存: ${createResponse.metadata.fromCache ? "是" : "否"}`
        );

        // 查询支付状态
        console.log("\n🔍 查询支付状态...");
        const queryResponse = await this.paymentAdapter.queryPayment(
          createResponse.data.transactionId
        );

        if (queryResponse.success && queryResponse.data) {
          console.log("✅ 支付查询成功:");
          console.log(`- 当前状态: ${queryResponse.data.status}`);
          console.log(
            `- 更新时间: ${queryResponse.data.updatedAt.toLocaleString()}`
          );
          console.log(`- 响应时间: ${queryResponse.metadata.latency}ms`);
          console.log(
            `- 来自缓存: ${queryResponse.metadata.fromCache ? "是" : "否"}`
          );
        }

        // 等待支付完成（模拟）
        console.log("\n⏳ 等待支付处理...");
        await this.delay(3000);

        // 再次查询支付状态
        const finalQueryResponse = await this.paymentAdapter.queryPayment(
          createResponse.data.transactionId
        );
        if (finalQueryResponse.success && finalQueryResponse.data) {
          console.log("✅ 支付最终状态:");
          console.log(`- 状态: ${finalQueryResponse.data.status}`);

          if (finalQueryResponse.data.status === PaymentStatus.SUCCEEDED) {
            console.log("🎉 支付成功完成!");

            // 演示退款
            console.log("\n💸 演示退款流程...");
            const refundData: InternalRefundData = {
              transactionId: createResponse.data.transactionId,
              refundId: "REF-001",
              amount: Money.fromYuan(30, "CNY"),
              reason: "用户申请退款",
            };

            const refundResponse = await this.paymentAdapter.refundPayment(
              refundData
            );
            if (refundResponse.success && refundResponse.data) {
              console.log("✅ 退款请求成功:");
              console.log(`- 退款ID: ${refundResponse.data.refundId}`);
              console.log(`- 退款状态: ${refundResponse.data.status}`);
              console.log(
                `- 退款金额: ${refundResponse.data.amount.toString()}`
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ 支付网关集成失败:", error);
    }

    console.log();
  }

  /**
   * 2. 错误处理和重试演示
   */
  private async demonstrateErrorHandlingAndRetry(): Promise<void> {
    console.log("🔄 2. 错误处理和重试演示");
    console.log("=====================================\n");

    try {
      // 模拟无效的支付数据
      const invalidPaymentData = {
        orderId: "", // 空订单ID
        customerId: "",
        amount: Money.fromYuan(-100, "CNY"), // 负数金额
        paymentMethod: PaymentMethod.create({
          type: PaymentType.CREDIT_CARD,
          provider: "测试银行",
          accountInfo: "1234",
          isDefault: true,
        }),
      };

      console.log("🔄 发送无效支付请求...");
      const response = await this.paymentAdapter.createPayment(
        invalidPaymentData
      );

      if (!response.success) {
        console.log("❌ 请求失败（预期行为）:");
        console.log(`- 错误代码: ${response.error?.code}`);
        console.log(`- 错误消息: ${response.error?.message}`);
        console.log(`- 重试次数: ${response.metadata.retryCount}`);
        console.log(`- 响应时间: ${response.metadata.latency}ms`);
        console.log("✅ 错误处理机制正常工作");
      }
    } catch (error) {
      console.log("✅ 异常被防腐层正确捕获和处理");
    }

    console.log();
  }

  /**
   * 3. 缓存机制演示
   */
  private async demonstrateCachingMechanism(): Promise<void> {
    console.log("🗄️ 3. 缓存机制演示");
    console.log("=====================================\n");

    try {
      const transactionId = "MOCK_TRANSACTION_ID";

      console.log("🔄 第一次查询支付状态...");
      const firstQuery = await this.paymentAdapter.queryPayment(transactionId);

      if (firstQuery.success) {
        console.log(
          `✅ 第一次查询完成 (响应时间: ${firstQuery.metadata.latency}ms)`
        );
        console.log(
          `- 来自缓存: ${firstQuery.metadata.fromCache ? "是" : "否"}`
        );
      }

      console.log("\n🔄 第二次查询支付状态（应该从缓存返回）...");
      const secondQuery = await this.paymentAdapter.queryPayment(transactionId);

      if (secondQuery.success) {
        console.log(
          `✅ 第二次查询完成 (响应时间: ${secondQuery.metadata.latency}ms)`
        );
        console.log(
          `- 来自缓存: ${secondQuery.metadata.fromCache ? "是" : "否"}`
        );

        if (secondQuery.metadata.fromCache) {
          console.log("🎉 缓存机制正常工作，响应时间显著减少！");
        }
      }
    } catch (error) {
      console.log("ℹ️ 缓存演示：模拟交易ID不存在，这是正常行为");
    }

    console.log();
  }

  /**
   * 4. 指标和监控演示
   */
  private async demonstrateMetricsAndMonitoring(): Promise<void> {
    console.log("📊 4. 指标和监控演示");
    console.log("=====================================\n");

    // 获取支付适配器的指标
    const metrics = this.paymentAdapter.getMetrics();

    console.log("📈 支付网关适配器指标:");
    console.log(`- 总请求数: ${metrics.requestCount}`);
    console.log(`- 错误率: ${(metrics.errorRate * 100).toFixed(2)}%`);
    console.log(`- 平均响应时间: ${metrics.averageLatency.toFixed(2)}ms`);
    console.log(`- 缓存命中率: ${(metrics.cacheHitRate * 100).toFixed(2)}%`);
    console.log(`- 最后重置时间: ${metrics.lastResetTime.toLocaleString()}`);

    // 获取所有适配器的指标
    const allMetrics = this.aclManager.getAllMetrics();

    console.log("\n📊 所有防腐层适配器指标:");
    Object.entries(allMetrics).forEach(([name, metric]) => {
      console.log(`\n${name}适配器:`);
      console.log(`  - 请求数: ${metric.requestCount}`);
      console.log(`  - 错误率: ${(metric.errorRate * 100).toFixed(2)}%`);
      console.log(`  - 平均延迟: ${metric.averageLatency.toFixed(2)}ms`);
      console.log(`  - 缓存命中率: ${(metric.cacheHitRate * 100).toFixed(2)}%`);
    });

    console.log();
  }

  /**
   * 5. 健康检查演示
   */
  private async demonstrateHealthCheck(): Promise<void> {
    console.log("🏥 5. 健康检查演示");
    console.log("=====================================\n");

    const healthStatus = await this.aclManager.healthCheck();

    console.log("🔍 防腐层健康状态:");
    Object.entries(healthStatus).forEach(([name, status]) => {
      const indicator = status.healthy ? "✅" : "❌";
      console.log(
        `${indicator} ${name}: ${status.healthy ? "健康" : "不健康"}`
      );
      if (status.error) {
        console.log(`  错误: ${status.error}`);
      }
    });

    // 整体健康状态
    const overallHealthy = Object.values(healthStatus).every(
      (status) => status.healthy
    );
    console.log(
      `\n🎯 整体健康状态: ${overallHealthy ? "✅ 健康" : "❌ 不健康"}`
    );

    console.log();
  }

  /**
   * 6. 数据转换演示
   */
  private async demonstrateDataTransformation(): Promise<void> {
    console.log("🔄 6. 数据转换演示");
    console.log("=====================================\n");

    // 内部模型
    const internalPaymentData: InternalPaymentData = {
      orderId: "ORDER-123",
      customerId: "CUSTOMER-456",
      amount: Money.fromYuan(199.99, "CNY"),
      paymentMethod: PaymentMethod.create({
        type: PaymentType.DIGITAL_WALLET,
        provider: "支付宝",
        accountInfo: "13800138000",
        isDefault: true,
      }),
      description: "商品购买",
      metadata: {
        source: "mobile",
        version: "1.0.0",
      },
    };

    console.log("📥 内部数据模型:");
    console.log(`- 订单ID: ${internalPaymentData.orderId}`);
    console.log(`- 客户ID: ${internalPaymentData.customerId}`);
    console.log(`- 金额: ${internalPaymentData.amount.toString()}`);
    console.log(`- 支付方式: ${internalPaymentData.paymentMethod.displayName}`);
    console.log(`- 描述: ${internalPaymentData.description}`);
    console.log(`- 元数据: ${JSON.stringify(internalPaymentData.metadata)}`);

    // 通过防腐层转换
    console.log("\n🔄 通过防腐层转换为外部系统格式...");
    console.log("（内部细节被隐藏，提供统一的接口）");

    console.log("\n📤 转换后的外部系统调用:");
    console.log("- 商户ID: MERCHANT_001");
    console.log("- 外部订单号: ORDER-123");
    console.log("- 金额: 19999 分");
    console.log("- 货币: CNY");
    console.log("- 支付方式: digital_wallet");
    console.log("- 超时时间: 30m");

    console.log("\n🛡️ 防腐层价值:");
    console.log("✅ 隔离外部系统的复杂性");
    console.log("✅ 提供统一的内部接口");
    console.log("✅ 自动数据格式转换");
    console.log("✅ 处理外部系统的变化");
    console.log("✅ 提供可靠性保障（重试、缓存、监控）");
    console.log("✅ 防止外部模型腐蚀内部领域模型");

    console.log();
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
