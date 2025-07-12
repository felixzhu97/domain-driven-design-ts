import {
  ISagaManager,
  ISaga,
  ISagaStore,
  SagaInstance,
  SagaStatus,
  SagaStepStatus,
  SagaContext,
  SagaStepHistory,
  SagaConfig,
  SagaError,
  SagaStepError,
  SagaTimeoutError,
  SagaCancellationError,
} from "../../shared/types/Saga";

/**
 * Saga管理器
 */
export class SagaManager implements ISagaManager {
  private sagas: Map<string, ISaga> = new Map();
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly processingDelay = 1000; // 1秒处理间隔

  constructor(private sagaStore: ISagaStore) {}

  /**
   * 注册Saga
   */
  registerSaga(saga: ISaga): void {
    this.sagas.set(saga.sagaType, saga);
    console.log(`📋 注册Saga: ${saga.sagaType}`);
  }

  /**
   * 启动Saga
   */
  async startSaga(
    sagaType: string,
    correlationId: string,
    data: Record<string, any>,
    userId?: string
  ): Promise<string> {
    const saga = this.sagas.get(sagaType);
    if (!saga) {
      throw new Error(`未找到Saga类型: ${sagaType}`);
    }

    // 验证数据
    if (saga.validateData) {
      const isValid = await saga.validateData(data);
      if (!isValid) {
        throw new Error(`Saga数据验证失败: ${sagaType}`);
      }
    }

    // 创建上下文
    const context = saga.createContext(correlationId, data, userId);

    // 获取步骤
    const steps = saga.getSteps();

    // 创建Saga实例
    const sagaInstance: SagaInstance = {
      sagaId: context.sagaId,
      sagaType: saga.sagaType,
      correlationId,
      status: SagaStatus.PENDING,
      context,
      steps,
      stepHistory: [],
      currentStepIndex: 0,
      completedSteps: 0,
      failedSteps: 0,
      compensatedSteps: 0,
      totalSteps: steps.length,
      startedAt: new Date(),
      version: 1,
    };

    if (userId !== undefined) {
      sagaInstance.createdBy = userId;
    }

    // 保存到存储
    await this.sagaStore.saveSaga(sagaInstance);

    console.log(`🚀 启动Saga: ${sagaInstance.sagaId} (${sagaType})`);

    // 如果管理器正在运行，立即处理
    if (this.isRunning) {
      setTimeout(() => this.processSaga(sagaInstance.sagaId), 100);
    }

    return sagaInstance.sagaId;
  }

  /**
   * 恢复Saga
   */
  async resumeSaga(sagaId: string): Promise<void> {
    const sagaInstance = await this.sagaStore.getSaga(sagaId);
    if (!sagaInstance) {
      throw new Error(`Saga不存在: ${sagaId}`);
    }

    if (
      sagaInstance.status === SagaStatus.COMPLETED ||
      sagaInstance.status === SagaStatus.CANCELLED
    ) {
      throw new Error(`Saga已完成或已取消，无法恢复: ${sagaId}`);
    }

    // 更新状态为待处理
    await this.sagaStore.updateSagaStatus(sagaId, SagaStatus.PENDING);

    console.log(`🔄 恢复Saga: ${sagaId}`);

    // 立即处理
    setTimeout(() => this.processSaga(sagaId), 100);
  }

  /**
   * 取消Saga
   */
  async cancelSaga(sagaId: string, reason?: string): Promise<void> {
    const sagaInstance = await this.sagaStore.getSaga(sagaId);
    if (!sagaInstance) {
      throw new Error(`Saga不存在: ${sagaId}`);
    }

    if (
      sagaInstance.status === SagaStatus.COMPLETED ||
      sagaInstance.status === SagaStatus.CANCELLED
    ) {
      return; // 已完成或已取消
    }

    // 更新状态为取消
    await this.sagaStore.updateSagaStatus(sagaId, SagaStatus.CANCELLED);

    // 记录取消原因
    sagaInstance.error = reason || "用户取消";
    await this.sagaStore.saveSaga(sagaInstance);

    console.log(`❌ 取消Saga: ${sagaId} - ${reason || "用户取消"}`);
  }

  /**
   * 获取Saga实例
   */
  async getSaga(sagaId: string): Promise<SagaInstance | null> {
    return this.sagaStore.getSaga(sagaId);
  }

  /**
   * 获取Saga列表
   */
  async getSagas(filter?: {
    sagaType?: string;
    status?: SagaStatus;
    correlationId?: string;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<SagaInstance[]> {
    return this.sagaStore.querySagas(filter || {});
  }

  /**
   * 获取Saga统计
   */
  async getStatistics(): Promise<{
    totalSagas: number;
    runningStagas: number;
    completedSagas: number;
    failedSagas: number;
    compensatedSagas: number;
    averageExecutionTime: number;
    sagasByType: Record<string, number>;
    sagasByStatus: Record<string, number>;
  }> {
    const storeStats = await this.sagaStore.getStatistics();

    return {
      totalSagas: storeStats.totalSagas,
      runningStagas: storeStats.sagasByStatus[SagaStatus.RUNNING] || 0,
      completedSagas: storeStats.sagasByStatus[SagaStatus.COMPLETED] || 0,
      failedSagas: storeStats.sagasByStatus[SagaStatus.FAILED] || 0,
      compensatedSagas: storeStats.sagasByStatus[SagaStatus.COMPENSATED] || 0,
      averageExecutionTime: storeStats.averageExecutionTime,
      sagasByType: storeStats.sagasByType,
      sagasByStatus: storeStats.sagasByStatus,
    };
  }

  /**
   * 启动管理器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log("🚀 启动Saga管理器");

    // 启动处理循环
    this.processingInterval = setInterval(async () => {
      await this.processPendingSagas();
    }, this.processingDelay);

    // 处理待处理的Saga
    await this.processPendingSagas();
  }

  /**
   * 停止管理器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log("⏹️ 停止Saga管理器");
  }

  /**
   * 处理待处理的Saga
   */
  private async processPendingSagas(): Promise<void> {
    try {
      const pendingSagas = await this.sagaStore.getPendingSagas();

      for (const sagaInstance of pendingSagas) {
        try {
          await this.processSaga(sagaInstance.sagaId);
        } catch (error) {
          console.error(`处理Saga时发生错误 ${sagaInstance.sagaId}:`, error);
        }
      }
    } catch (error) {
      console.error("处理待处理Saga时发生错误:", error);
    }
  }

  /**
   * 处理单个Saga
   */
  private async processSaga(sagaId: string): Promise<void> {
    const sagaInstance = await this.sagaStore.getSaga(sagaId);
    if (!sagaInstance) {
      console.warn(`Saga不存在: ${sagaId}`);
      return;
    }

    // 检查状态
    if (
      sagaInstance.status === SagaStatus.COMPLETED ||
      sagaInstance.status === SagaStatus.CANCELLED
    ) {
      return;
    }

    const saga = this.sagas.get(sagaInstance.sagaType);
    if (!saga) {
      console.error(`未找到Saga类型: ${sagaInstance.sagaType}`);
      return;
    }

    try {
      // 更新状态为运行中
      if (sagaInstance.status === SagaStatus.PENDING) {
        await this.sagaStore.updateSagaStatus(sagaId, SagaStatus.RUNNING);
        sagaInstance.status = SagaStatus.RUNNING;
      }

      if (sagaInstance.status === SagaStatus.RUNNING) {
        await this.executeNextStep(sagaInstance, saga);
      } else if (sagaInstance.status === SagaStatus.COMPENSATING) {
        await this.compensateSteps(sagaInstance, saga);
      }
    } catch (error) {
      console.error(`处理Saga ${sagaId} 时发生错误:`, error);
      await this.handleSagaError(sagaInstance, saga, error);
    }
  }

  /**
   * 执行下一步
   */
  private async executeNextStep(
    sagaInstance: SagaInstance,
    saga: ISaga
  ): Promise<void> {
    const { currentStepIndex, steps } = sagaInstance;

    if (currentStepIndex >= steps.length) {
      // 所有步骤都完成了
      await this.completeSaga(sagaInstance, saga);
      return;
    }

    const step = steps[currentStepIndex];
    if (!step) {
      throw new Error(`步骤不存在: ${currentStepIndex}`);
    }
    const stepHistory: SagaStepHistory = {
      stepName: step.stepName,
      status: SagaStepStatus.RUNNING,
      startedAt: new Date(),
      attempt: sagaInstance.context.retryCount + 1,
    };

    try {
      // 检查是否可以跳过
      if (step.canSkip && (await step.canSkip(sagaInstance.context))) {
        stepHistory.status = SagaStepStatus.SKIPPED;
        stepHistory.completedAt = new Date();
        stepHistory.duration = 0;
        await this.sagaStore.addStepHistory(sagaInstance.sagaId, stepHistory);

        // 移动到下一步
        sagaInstance.currentStepIndex++;
        await this.sagaStore.updateSagaContext(
          sagaInstance.sagaId,
          sagaInstance.context
        );

        // 继续执行下一步
        await this.executeNextStep(sagaInstance, saga);
        return;
      }

      // 执行步骤
      const result = await step.execute(sagaInstance.context);
      stepHistory.completedAt = new Date();
      stepHistory.duration =
        stepHistory.completedAt.getTime() - stepHistory.startedAt.getTime();
      stepHistory.result = result;

      if (result.success) {
        // 步骤执行成功
        stepHistory.status = SagaStepStatus.COMPLETED;
        sagaInstance.completedSteps++;
        sagaInstance.currentStepIndex++;
        sagaInstance.context.retryCount = 0;

        // 保存步骤结果
        sagaInstance.context.stepResults[step.stepName] = result;

        await this.sagaStore.addStepHistory(sagaInstance.sagaId, stepHistory);
        await this.sagaStore.updateSagaContext(
          sagaInstance.sagaId,
          sagaInstance.context
        );

        // 继续执行下一步
        await this.executeNextStep(sagaInstance, saga);
      } else {
        // 步骤执行失败
        stepHistory.status = SagaStepStatus.FAILED;
        if (result.error) stepHistory.error = result.error;
        sagaInstance.failedSteps++;

        await this.sagaStore.addStepHistory(sagaInstance.sagaId, stepHistory);

        // 检查是否可以重试
        if (step.canRetry && (await step.canRetry(sagaInstance.context))) {
          sagaInstance.context.retryCount++;
          const delay = step.getRetryDelay
            ? step.getRetryDelay(sagaInstance.context.retryCount)
            : 1000;

          console.log(`🔄 步骤失败，${delay}ms后重试: ${step.stepName}`);

          setTimeout(() => {
            this.processSaga(sagaInstance.sagaId);
          }, delay);
        } else {
          // 不能重试，开始补偿
          throw new SagaStepError(
            result.error || "步骤执行失败",
            sagaInstance.sagaId,
            step.stepName
          );
        }
      }
    } catch (error) {
      stepHistory.status = SagaStepStatus.FAILED;
      stepHistory.error =
        error instanceof Error ? error.message : String(error);
      stepHistory.completedAt = new Date();
      stepHistory.duration =
        stepHistory.completedAt.getTime() - stepHistory.startedAt.getTime();

      await this.sagaStore.addStepHistory(sagaInstance.sagaId, stepHistory);
      throw error;
    }
  }

  /**
   * 补偿步骤
   */
  private async compensateSteps(
    sagaInstance: SagaInstance,
    saga: ISaga
  ): Promise<void> {
    const { currentStepIndex, steps } = sagaInstance;

    // 从当前步骤向前补偿
    for (let i = currentStepIndex - 1; i >= 0; i--) {
      const step = steps[i];
      if (!step) {
        continue;
      }
      const stepHistory: SagaStepHistory = {
        stepName: step.stepName,
        status: SagaStepStatus.COMPENSATING,
        startedAt: new Date(),
        attempt: 1,
      };

      try {
        const result = await step.compensate(sagaInstance.context);
        stepHistory.completedAt = new Date();
        stepHistory.duration =
          stepHistory.completedAt.getTime() - stepHistory.startedAt.getTime();
        stepHistory.result = result;

        if (result.success) {
          stepHistory.status = SagaStepStatus.COMPENSATED;
          sagaInstance.compensatedSteps++;
        } else {
          stepHistory.status = SagaStepStatus.FAILED;
          if (result.error) stepHistory.error = result.error;
          console.error(`补偿步骤失败: ${step.stepName} - ${result.error}`);
        }

        await this.sagaStore.addStepHistory(sagaInstance.sagaId, stepHistory);
      } catch (error) {
        stepHistory.status = SagaStepStatus.FAILED;
        stepHistory.error =
          error instanceof Error ? error.message : String(error);
        stepHistory.completedAt = new Date();
        stepHistory.duration =
          stepHistory.completedAt.getTime() - stepHistory.startedAt.getTime();

        await this.sagaStore.addStepHistory(sagaInstance.sagaId, stepHistory);
        console.error(`补偿步骤异常: ${step.stepName}`, error);
      }
    }

    // 补偿完成
    await this.sagaStore.updateSagaStatus(
      sagaInstance.sagaId,
      SagaStatus.COMPENSATED
    );

    if (saga.onCompensated) {
      await saga.onCompensated(sagaInstance.context);
    }

    console.log(`✅ Saga补偿完成: ${sagaInstance.sagaId}`);
  }

  /**
   * 完成Saga
   */
  private async completeSaga(
    sagaInstance: SagaInstance,
    saga: ISaga
  ): Promise<void> {
    await this.sagaStore.updateSagaStatus(
      sagaInstance.sagaId,
      SagaStatus.COMPLETED
    );

    if (saga.onCompleted) {
      await saga.onCompleted(sagaInstance.context);
    }

    console.log(`✅ Saga完成: ${sagaInstance.sagaId}`);
  }

  /**
   * 处理Saga错误
   */
  private async handleSagaError(
    sagaInstance: SagaInstance,
    saga: ISaga,
    error: any
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 更新错误信息
    sagaInstance.error = errorMessage;

    // 获取配置
    const config = saga.getConfig?.() || this.getDefaultConfig();

    if (config.enableCompensation) {
      // 开始补偿
      await this.sagaStore.updateSagaStatus(
        sagaInstance.sagaId,
        SagaStatus.COMPENSATING
      );
      await this.compensateSteps(sagaInstance, saga);
    } else {
      // 直接标记为失败
      await this.sagaStore.updateSagaStatus(
        sagaInstance.sagaId,
        SagaStatus.FAILED
      );

      if (saga.onFailed) {
        await saga.onFailed(sagaInstance.context, errorMessage);
      }

      console.error(`❌ Saga失败: ${sagaInstance.sagaId} - ${errorMessage}`);
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): SagaConfig {
    return {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 300000, // 5分钟
      enableCompensation: true,
      enablePersistence: true,
      enableLogging: true,
      enableMetrics: true,
    };
  }
}
