import { SagaManager } from "../infrastructure/saga/SagaManager";
import { MemorySagaStore } from "../infrastructure/saga/MemorySagaStore";
import { OrderProcessingSaga } from "../application/sagas/OrderProcessingSaga";
import { SagaStatus } from "../shared/types/Saga";

/**
 * Saga演示
 */
export class SagaDemo {
  private sagaStore: MemorySagaStore;
  private sagaManager: SagaManager;

  constructor() {
    this.sagaStore = new MemorySagaStore();
    this.sagaManager = new SagaManager(this.sagaStore);
  }

  /**
   * 运行演示
   */
  async runDemo(): Promise<void> {
    console.log("🎯 开始Saga模式演示\n");

    try {
      // 1. 注册Saga
      await this.registerSagas();

      // 2. 启动Saga管理器
      await this.startSagaManager();

      // 3. 演示成功的订单处理流程
      await this.demonstrateSuccessfulOrderProcessing();

      // 4. 演示失败和补偿的流程
      await this.demonstrateFailureAndCompensation();

      // 5. 演示Saga查询和统计
      await this.demonstrateSagaQuerying();

      // 6. 演示Saga管理功能
      await this.demonstrateSagaManagement();
    } catch (error) {
      console.error("❌ Saga演示过程中发生错误:", error);
    } finally {
      // 停止Saga管理器
      await this.sagaManager.stop();
    }

    console.log("\n✅ Saga演示完成!");
  }

  /**
   * 注册Saga
   */
  private async registerSagas(): Promise<void> {
    console.log("📋 注册Saga类型...");

    const orderProcessingSaga = new OrderProcessingSaga();
    this.sagaManager.registerSaga(orderProcessingSaga);

    console.log("✅ Saga注册完成\n");
  }

  /**
   * 启动Saga管理器
   */
  private async startSagaManager(): Promise<void> {
    console.log("🚀 启动Saga管理器...");

    await this.sagaManager.start();

    console.log("✅ Saga管理器启动完成\n");
  }

  /**
   * 演示成功的订单处理流程
   */
  private async demonstrateSuccessfulOrderProcessing(): Promise<void> {
    console.log("📦 演示成功的订单处理流程...");

    // 创建订单数据
    const orderData = {
      orderId: "ORDER_001",
      customerId: "CUSTOMER_001",
      items: [
        {
          productId: "PRODUCT_001",
          quantity: 2,
          unitPrice: 99.99,
        },
        {
          productId: "PRODUCT_002",
          quantity: 1,
          unitPrice: 199.99,
        },
      ],
      totalAmount: 399.97,
      paymentMethod: "credit_card",
      shippingAddress: {
        street: "123 Main St",
        city: "Beijing",
        country: "China",
      },
    };

    // 启动订单处理Saga
    const sagaId = await this.sagaManager.startSaga(
      "OrderProcessing",
      "correlation_" + Date.now(),
      orderData,
      "user_001"
    );

    console.log(`📋 订单处理Saga已启动: ${sagaId}`);

    // 等待Saga完成
    await this.waitForSagaCompletion(sagaId);

    // 显示结果
    const saga = await this.sagaManager.getSaga(sagaId);
    if (saga) {
      console.log(`📊 Saga状态: ${saga.status}`);
      console.log(`🔢 完成步骤: ${saga.completedSteps}/${saga.totalSteps}`);
      console.log(
        `⏱️ 执行时间: ${
          saga.completedAt
            ? saga.completedAt.getTime() - saga.startedAt.getTime()
            : 0
        }ms`
      );
    }

    console.log("✅ 成功订单处理流程演示完成\n");
  }

  /**
   * 演示失败和补偿的流程
   */
  private async demonstrateFailureAndCompensation(): Promise<void> {
    console.log("🔄 演示失败和补偿流程...");

    // 创建会导致支付失败的订单数据
    const orderData = {
      orderId: "ORDER_002",
      customerId: "CUSTOMER_002",
      items: [
        {
          productId: "PRODUCT_003",
          quantity: 1,
          unitPrice: 999.99,
        },
      ],
      totalAmount: 999.99,
      paymentMethod: "credit_card",
      shippingAddress: {
        street: "456 Oak Ave",
        city: "Shanghai",
        country: "China",
      },
    };

    // 启动订单处理Saga
    const sagaId = await this.sagaManager.startSaga(
      "OrderProcessing",
      "correlation_" + Date.now(),
      orderData,
      "user_002"
    );

    console.log(`📋 订单处理Saga已启动: ${sagaId}`);

    // 等待Saga完成（可能失败或补偿）
    await this.waitForSagaCompletion(sagaId);

    // 显示结果
    const saga = await this.sagaManager.getSaga(sagaId);
    if (saga) {
      console.log(`📊 Saga状态: ${saga.status}`);
      console.log(`🔢 完成步骤: ${saga.completedSteps}/${saga.totalSteps}`);
      console.log(`❌ 失败步骤: ${saga.failedSteps}`);
      console.log(`🔄 补偿步骤: ${saga.compensatedSteps}`);

      if (saga.error) {
        console.log(`💥 错误信息: ${saga.error}`);
      }
    }

    console.log("✅ 失败和补偿流程演示完成\n");
  }

  /**
   * 演示Saga查询和统计
   */
  private async demonstrateSagaQuerying(): Promise<void> {
    console.log("📊 演示Saga查询和统计...");

    // 获取所有Saga
    const allSagas = await this.sagaManager.getSagas();
    console.log(`📋 总Saga数量: ${allSagas.length}`);

    // 按状态查询
    const completedSagas = await this.sagaManager.getSagas({
      status: SagaStatus.COMPLETED,
    });
    console.log(`✅ 完成的Saga: ${completedSagas.length}`);

    const failedSagas = await this.sagaManager.getSagas({
      status: SagaStatus.FAILED,
    });
    console.log(`❌ 失败的Saga: ${failedSagas.length}`);

    const compensatedSagas = await this.sagaManager.getSagas({
      status: SagaStatus.COMPENSATED,
    });
    console.log(`🔄 补偿的Saga: ${compensatedSagas.length}`);

    // 按类型查询
    const orderProcessingSagas = await this.sagaManager.getSagas({
      sagaType: "OrderProcessing",
    });
    console.log(`📦 订单处理Saga: ${orderProcessingSagas.length}`);

    // 获取统计信息
    const statistics = await this.sagaManager.getStatistics();
    console.log("📈 Saga统计信息:");
    console.log(`  - 总数: ${statistics.totalSagas}`);
    console.log(`  - 运行中: ${statistics.runningStagas}`);
    console.log(`  - 已完成: ${statistics.completedSagas}`);
    console.log(`  - 已失败: ${statistics.failedSagas}`);
    console.log(`  - 已补偿: ${statistics.compensatedSagas}`);
    console.log(
      `  - 平均执行时间: ${statistics.averageExecutionTime.toFixed(2)}ms`
    );

    console.log("✅ Saga查询和统计演示完成\n");
  }

  /**
   * 演示Saga管理功能
   */
  private async demonstrateSagaManagement(): Promise<void> {
    console.log("🎛️ 演示Saga管理功能...");

    // 创建一个新的Saga
    const orderData = {
      orderId: "ORDER_003",
      customerId: "CUSTOMER_003",
      items: [
        {
          productId: "PRODUCT_004",
          quantity: 1,
          unitPrice: 49.99,
        },
      ],
      totalAmount: 49.99,
      paymentMethod: "alipay",
    };

    const sagaId = await this.sagaManager.startSaga(
      "OrderProcessing",
      "correlation_" + Date.now(),
      orderData,
      "user_003"
    );

    console.log(`📋 创建新的Saga: ${sagaId}`);

    // 等待一点时间让Saga开始执行
    await this.delay(1000);

    // 取消Saga
    await this.sagaManager.cancelSaga(sagaId, "演示取消功能");
    console.log(`❌ 取消Saga: ${sagaId}`);

    // 检查Saga状态
    const cancelledSaga = await this.sagaManager.getSaga(sagaId);
    if (cancelledSaga) {
      console.log(`📊 Saga状态: ${cancelledSaga.status}`);
      console.log(`💬 取消原因: ${cancelledSaga.error}`);
    }

    // 演示恢复Saga（创建一个新的）
    const newSagaId = await this.sagaManager.startSaga(
      "OrderProcessing",
      "correlation_" + Date.now(),
      orderData,
      "user_003"
    );

    console.log(`📋 创建新的Saga用于恢复演示: ${newSagaId}`);

    // 等待Saga完成
    await this.waitForSagaCompletion(newSagaId);

    console.log("✅ Saga管理功能演示完成\n");
  }

  /**
   * 等待Saga完成
   */
  private async waitForSagaCompletion(
    sagaId: string,
    maxWaitTime = 30000
  ): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 500;

    while (Date.now() - startTime < maxWaitTime) {
      const saga = await this.sagaManager.getSaga(sagaId);

      if (!saga) {
        console.log(`⚠️ Saga不存在: ${sagaId}`);
        return;
      }

      if (saga.status === SagaStatus.COMPLETED) {
        console.log(`✅ Saga完成: ${sagaId}`);
        return;
      }

      if (saga.status === SagaStatus.FAILED) {
        console.log(`❌ Saga失败: ${sagaId}`);
        return;
      }

      if (saga.status === SagaStatus.COMPENSATED) {
        console.log(`🔄 Saga补偿完成: ${sagaId}`);
        return;
      }

      if (saga.status === SagaStatus.CANCELLED) {
        console.log(`❌ Saga已取消: ${sagaId}`);
        return;
      }

      // 等待一段时间后再检查
      await this.delay(checkInterval);
    }

    console.log(`⏰ 等待Saga完成超时: ${sagaId}`);
  }

  /**
   * 延迟函数
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 显示Saga详细信息
   */
  private async displaySagaDetails(sagaId: string): Promise<void> {
    const saga = await this.sagaManager.getSaga(sagaId);
    if (!saga) {
      console.log(`❌ Saga不存在: ${sagaId}`);
      return;
    }

    console.log(`📋 Saga详细信息:`);
    console.log(`  - ID: ${saga.sagaId}`);
    console.log(`  - 类型: ${saga.sagaType}`);
    console.log(`  - 状态: ${saga.status}`);
    console.log(`  - 关联ID: ${saga.correlationId}`);
    console.log(
      `  - 当前步骤: ${saga.currentStepIndex + 1}/${saga.totalSteps}`
    );
    console.log(`  - 完成步骤: ${saga.completedSteps}`);
    console.log(`  - 失败步骤: ${saga.failedSteps}`);
    console.log(`  - 补偿步骤: ${saga.compensatedSteps}`);
    console.log(`  - 开始时间: ${saga.startedAt.toLocaleString()}`);

    if (saga.completedAt) {
      console.log(`  - 完成时间: ${saga.completedAt.toLocaleString()}`);
      console.log(
        `  - 执行时间: ${
          saga.completedAt.getTime() - saga.startedAt.getTime()
        }ms`
      );
    }

    if (saga.error) {
      console.log(`  - 错误: ${saga.error}`);
    }

    console.log(`  - 步骤历史:`);
    for (const history of saga.stepHistory) {
      console.log(
        `    * ${history.stepName}: ${history.status} (${
          history.duration || 0
        }ms)`
      );
      if (history.error) {
        console.log(`      错误: ${history.error}`);
      }
    }
  }
}

/**
 * 运行Saga演示
 */
export async function runSagaDemo(): Promise<void> {
  const demo = new SagaDemo();
  await demo.runDemo();
}
