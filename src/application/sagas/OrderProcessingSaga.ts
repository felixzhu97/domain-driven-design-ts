import {
  ISaga,
  SagaContext,
  SagaConfig,
  ISagaStep,
} from "../../shared/types/Saga";
import { SagaStep } from "../../infrastructure/saga/SagaStep";
import { SagaStepResult } from "../../shared/types/Saga";

/**
 * 订单处理Saga - 处理完整的订单流程
 */
export class OrderProcessingSaga implements ISaga {
  public readonly sagaType = "OrderProcessing";
  public readonly description =
    "处理订单的完整流程：验证订单 -> 预留库存 -> 处理支付 -> 发货 -> 更新库存 -> 发送通知";

  /**
   * 获取Saga步骤
   */
  getSteps(): ISagaStep[] {
    return [
      new ValidateOrderStep(),
      new ReserveInventoryStep(),
      new ProcessPaymentStep(),
      new ShipOrderStep(),
      new UpdateInventoryStep(),
      new SendNotificationStep(),
    ];
  }

  /**
   * 创建Saga上下文
   */
  createContext(
    correlationId: string,
    data: Record<string, any>,
    userId?: string
  ): SagaContext {
    const context: SagaContext = {
      sagaId: `order-saga-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      sagaType: this.sagaType,
      correlationId,
      data,
      stepResults: {},
      currentStep: 0,
      totalSteps: this.getSteps().length,
      retryCount: 0,
      maxRetries: 3,
      startedAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    if (userId !== undefined) {
      context.userId = userId;
    }

    return context;
  }

  /**
   * 验证Saga数据
   */
  async validateData(data: Record<string, any>): Promise<boolean> {
    // 验证必要的订单数据
    const requiredFields = ["orderId", "customerId", "items", "totalAmount"];

    for (const field of requiredFields) {
      if (!data[field]) {
        console.error(`订单处理Saga数据验证失败: 缺少 ${field}`);
        return false;
      }
    }

    // 验证订单项
    if (!Array.isArray(data.items) || data.items.length === 0) {
      console.error("订单处理Saga数据验证失败: 订单项为空");
      return false;
    }

    // 验证总金额
    if (typeof data.totalAmount !== "number" || data.totalAmount <= 0) {
      console.error("订单处理Saga数据验证失败: 总金额无效");
      return false;
    }

    return true;
  }

  /**
   * 获取Saga配置
   */
  getConfig(): SagaConfig {
    return {
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 600000, // 10分钟
      enableCompensation: true,
      enablePersistence: true,
      enableLogging: true,
      enableMetrics: true,
    };
  }

  /**
   * Saga完成时的回调
   */
  async onCompleted(context: SagaContext): Promise<void> {
    console.log(`✅ 订单处理Saga完成: ${context.correlationId}`);

    // 发送完成事件
    // 这里可以集成事件总线
    const completedEvent = {
      type: "OrderProcessingCompleted",
      orderId: context.data.orderId,
      sagaId: context.sagaId,
      completedAt: new Date(),
    };

    console.log("📢 订单处理完成事件:", completedEvent);
  }

  /**
   * Saga失败时的回调
   */
  async onFailed(context: SagaContext, error: string): Promise<void> {
    console.error(`❌ 订单处理Saga失败: ${context.correlationId} - ${error}`);

    // 发送失败事件
    const failedEvent = {
      type: "OrderProcessingFailed",
      orderId: context.data.orderId,
      sagaId: context.sagaId,
      error,
      failedAt: new Date(),
    };

    console.log("📢 订单处理失败事件:", failedEvent);
  }

  /**
   * Saga补偿完成时的回调
   */
  async onCompensated(context: SagaContext): Promise<void> {
    console.log(`🔄 订单处理Saga补偿完成: ${context.correlationId}`);

    // 发送补偿完成事件
    const compensatedEvent = {
      type: "OrderProcessingCompensated",
      orderId: context.data.orderId,
      sagaId: context.sagaId,
      compensatedAt: new Date(),
    };

    console.log("📢 订单处理补偿完成事件:", compensatedEvent);
  }
}

/**
 * 步骤1：验证订单
 */
class ValidateOrderStep extends SagaStep {
  public readonly stepName = "ValidateOrder";
  public readonly description = "验证订单信息和业务规则";

  async execute(context: SagaContext): Promise<SagaStepResult> {
    this.log("开始验证订单");

    const { orderId, customerId, items, totalAmount } = context.data;

    // 模拟验证过程
    await this.delay(500);

    // 验证客户
    if (!customerId || customerId.trim() === "") {
      return {
        success: false,
        error: "客户ID无效",
      };
    }

    // 验证订单项
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return {
          success: false,
          error: "订单项无效",
        };
      }
    }

    // 验证总金额
    const calculatedTotal = items.reduce((sum: number, item: any) => {
      return sum + item.unitPrice * item.quantity;
    }, 0);

    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return {
        success: false,
        error: "订单总金额不匹配",
      };
    }

    this.log("订单验证通过");

    return {
      success: true,
      data: {
        validatedAt: new Date(),
        calculatedTotal,
      },
    };
  }

  async compensate(context: SagaContext): Promise<SagaStepResult> {
    this.log("订单验证无需补偿");
    return { success: true };
  }
}

/**
 * 步骤2：预留库存
 */
class ReserveInventoryStep extends SagaStep {
  public readonly stepName = "ReserveInventory";
  public readonly description = "预留商品库存";

  async execute(context: SagaContext): Promise<SagaStepResult> {
    this.log("开始预留库存");

    const { items } = context.data;
    const reservations: any[] = [];

    // 模拟库存预留
    await this.delay(1000);

    for (const item of items) {
      // 模拟检查库存
      const availableStock = Math.floor(Math.random() * 100) + 10; // 模拟库存

      if (availableStock < item.quantity) {
        return {
          success: false,
          error: `商品 ${item.productId} 库存不足，需要 ${item.quantity}，可用 ${availableStock}`,
        };
      }

      const reservation = {
        productId: item.productId,
        quantity: item.quantity,
        reservationId: this.generateId(),
        reservedAt: new Date(),
      };

      reservations.push(reservation);
    }

    this.log(`成功预留 ${reservations.length} 个商品的库存`);

    return {
      success: true,
      data: {
        reservations,
      },
      compensationData: {
        reservations,
      },
    };
  }

  async compensate(context: SagaContext): Promise<SagaStepResult> {
    this.log("开始释放库存预留");

    const stepResult = this.getStepResult(context, this.stepName);
    if (!stepResult?.compensationData?.reservations) {
      return { success: true };
    }

    const { reservations } = stepResult.compensationData;

    // 模拟释放库存
    await this.delay(500);

    for (const reservation of reservations) {
      this.log(
        `释放库存预留: ${reservation.productId} - ${reservation.quantity}`
      );
    }

    this.log("库存预留释放完成");

    return {
      success: true,
      data: {
        releasedReservations: reservations,
      },
    };
  }
}

/**
 * 步骤3：处理支付
 */
class ProcessPaymentStep extends SagaStep {
  public readonly stepName = "ProcessPayment";
  public readonly description = "处理订单支付";

  async execute(context: SagaContext): Promise<SagaStepResult> {
    this.log("开始处理支付");

    const { orderId, totalAmount, paymentMethod } = context.data;

    // 模拟支付处理
    await this.delay(2000);

    // 模拟支付失败（10%的概率）
    if (Math.random() < 0.1) {
      return {
        success: false,
        error: "支付处理失败：银行拒绝交易",
      };
    }

    const transactionId = `txn_${this.generateId()}`;

    this.log(`支付处理成功，交易ID: ${transactionId}`);

    return {
      success: true,
      data: {
        transactionId,
        paidAmount: totalAmount,
        paidAt: new Date(),
        paymentMethod: paymentMethod || "credit_card",
      },
      compensationData: {
        transactionId,
        refundAmount: totalAmount,
      },
    };
  }

  async compensate(context: SagaContext): Promise<SagaStepResult> {
    this.log("开始退款");

    const stepResult = this.getStepResult(context, this.stepName);
    if (!stepResult?.compensationData?.transactionId) {
      return { success: true };
    }

    const { transactionId, refundAmount } = stepResult.compensationData;

    // 模拟退款处理
    await this.delay(1500);

    const refundId = `refund_${this.generateId()}`;

    this.log(`退款处理成功，退款ID: ${refundId}`);

    return {
      success: true,
      data: {
        refundId,
        refundAmount,
        refundedAt: new Date(),
      },
    };
  }
}

/**
 * 步骤4：发货
 */
class ShipOrderStep extends SagaStep {
  public readonly stepName = "ShipOrder";
  public readonly description = "安排订单发货";

  async execute(context: SagaContext): Promise<SagaStepResult> {
    this.log("开始安排发货");

    const { orderId, shippingAddress } = context.data;

    // 模拟发货处理
    await this.delay(1000);

    const trackingNumber = `TRACK_${this.generateId().toUpperCase()}`;

    this.log(`发货安排成功，追踪号: ${trackingNumber}`);

    return {
      success: true,
      data: {
        trackingNumber,
        shippedAt: new Date(),
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后
        carrier: "顺丰快递",
      },
    };
  }

  async compensate(context: SagaContext): Promise<SagaStepResult> {
    this.log("开始取消发货");

    const stepResult = this.getStepResult(context, this.stepName);
    if (!stepResult?.data?.trackingNumber) {
      return { success: true };
    }

    const { trackingNumber } = stepResult.data;

    // 模拟取消发货
    await this.delay(500);

    this.log(`发货取消成功，追踪号: ${trackingNumber}`);

    return {
      success: true,
      data: {
        cancelledTrackingNumber: trackingNumber,
        cancelledAt: new Date(),
      },
    };
  }
}

/**
 * 步骤5：更新库存
 */
class UpdateInventoryStep extends SagaStep {
  public readonly stepName = "UpdateInventory";
  public readonly description = "更新商品库存";

  async execute(context: SagaContext): Promise<SagaStepResult> {
    this.log("开始更新库存");

    const reserveResult = this.getStepResult(context, "ReserveInventory");
    if (!reserveResult?.data?.reservations) {
      return {
        success: false,
        error: "未找到库存预留信息",
      };
    }

    const { reservations } = reserveResult.data;

    // 模拟更新库存
    await this.delay(800);

    const inventoryUpdates: any[] = [];

    for (const reservation of reservations) {
      const update = {
        productId: reservation.productId,
        deductedQuantity: reservation.quantity,
        updatedAt: new Date(),
      };

      inventoryUpdates.push(update);
    }

    this.log(`成功更新 ${inventoryUpdates.length} 个商品的库存`);

    return {
      success: true,
      data: {
        inventoryUpdates,
      },
      compensationData: {
        inventoryUpdates,
      },
    };
  }

  async compensate(context: SagaContext): Promise<SagaStepResult> {
    this.log("开始恢复库存");

    const stepResult = this.getStepResult(context, this.stepName);
    if (!stepResult?.compensationData?.inventoryUpdates) {
      return { success: true };
    }

    const { inventoryUpdates } = stepResult.compensationData;

    // 模拟恢复库存
    await this.delay(500);

    for (const update of inventoryUpdates) {
      this.log(`恢复库存: ${update.productId} + ${update.deductedQuantity}`);
    }

    this.log("库存恢复完成");

    return {
      success: true,
      data: {
        restoredInventoryUpdates: inventoryUpdates,
      },
    };
  }
}

/**
 * 步骤6：发送通知
 */
class SendNotificationStep extends SagaStep {
  public readonly stepName = "SendNotification";
  public readonly description = "发送订单处理通知";

  async execute(context: SagaContext): Promise<SagaStepResult> {
    this.log("开始发送通知");

    const { orderId, customerId } = context.data;
    const shipResult = this.getStepResult(context, "ShipOrder");

    // 模拟发送通知
    await this.delay(300);

    const notifications = [
      {
        type: "email",
        recipient: customerId,
        subject: "订单发货通知",
        content: `您的订单 ${orderId} 已发货`,
        sentAt: new Date(),
      },
      {
        type: "sms",
        recipient: customerId,
        content: `您的订单已发货，追踪号: ${shipResult?.data?.trackingNumber}`,
        sentAt: new Date(),
      },
    ];

    this.log(`成功发送 ${notifications.length} 条通知`);

    return {
      success: true,
      data: {
        notifications,
      },
    };
  }

  async compensate(context: SagaContext): Promise<SagaStepResult> {
    this.log("发送取消通知");

    const { orderId, customerId } = context.data;

    // 模拟发送取消通知
    await this.delay(300);

    const cancelNotification = {
      type: "email",
      recipient: customerId,
      subject: "订单取消通知",
      content: `您的订单 ${orderId} 已取消并退款`,
      sentAt: new Date(),
    };

    this.log("取消通知发送成功");

    return {
      success: true,
      data: {
        cancelNotification,
      },
    };
  }
}
