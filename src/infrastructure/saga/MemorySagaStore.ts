import {
  ISagaStore,
  SagaInstance,
  SagaStatus,
  SagaContext,
  SagaStepHistory,
} from "../../shared/types/Saga";

/**
 * 内存版本的Saga存储
 */
export class MemorySagaStore implements ISagaStore {
  private sagas: Map<string, SagaInstance> = new Map();

  /**
   * 保存Saga实例
   */
  async saveSaga(saga: SagaInstance): Promise<void> {
    const existingSaga = this.sagas.get(saga.sagaId);
    if (existingSaga) {
      saga.version = existingSaga.version + 1;
    } else {
      saga.version = 1;
    }

    this.sagas.set(saga.sagaId, { ...saga });
    console.log(
      `💾 保存Saga: ${saga.sagaId} (${saga.sagaType}) - 状态: ${saga.status}`
    );
  }

  /**
   * 获取Saga实例
   */
  async getSaga(sagaId: string): Promise<SagaInstance | null> {
    const saga = this.sagas.get(sagaId);
    return saga ? { ...saga } : null;
  }

  /**
   * 更新Saga状态
   */
  async updateSagaStatus(sagaId: string, status: SagaStatus): Promise<void> {
    const saga = this.sagas.get(sagaId);
    if (!saga) {
      throw new Error(`Saga不存在: ${sagaId}`);
    }

    saga.status = status;
    saga.version++;

    if (
      status === SagaStatus.COMPLETED ||
      status === SagaStatus.FAILED ||
      status === SagaStatus.COMPENSATED
    ) {
      saga.completedAt = new Date();
    }

    this.sagas.set(sagaId, saga);
    console.log(`🔄 更新Saga状态: ${sagaId} -> ${status}`);
  }

  /**
   * 更新Saga上下文
   */
  async updateSagaContext(sagaId: string, context: SagaContext): Promise<void> {
    const saga = this.sagas.get(sagaId);
    if (!saga) {
      throw new Error(`Saga不存在: ${sagaId}`);
    }

    saga.context = { ...context };
    saga.version++;
    this.sagas.set(sagaId, saga);
    console.log(`🔄 更新Saga上下文: ${sagaId}`);
  }

  /**
   * 添加步骤历史
   */
  async addStepHistory(
    sagaId: string,
    stepHistory: SagaStepHistory
  ): Promise<void> {
    const saga = this.sagas.get(sagaId);
    if (!saga) {
      throw new Error(`Saga不存在: ${sagaId}`);
    }

    saga.stepHistory.push({ ...stepHistory });
    saga.version++;
    this.sagas.set(sagaId, saga);
    console.log(
      `📝 添加步骤历史: ${sagaId} - ${stepHistory.stepName} (${stepHistory.status})`
    );
  }

  /**
   * 获取待处理的Saga
   */
  async getPendingSagas(): Promise<SagaInstance[]> {
    const pendingSagas = Array.from(this.sagas.values())
      .filter(
        (saga) =>
          saga.status === SagaStatus.PENDING ||
          saga.status === SagaStatus.RUNNING
      )
      .map((saga) => ({ ...saga }));

    return pendingSagas;
  }

  /**
   * 获取超时的Saga
   */
  async getTimeoutSagas(timeoutMs: number): Promise<SagaInstance[]> {
    const cutoffTime = new Date(Date.now() - timeoutMs);

    const timeoutSagas = Array.from(this.sagas.values())
      .filter(
        (saga) =>
          saga.status === SagaStatus.RUNNING && saga.startedAt < cutoffTime
      )
      .map((saga) => ({ ...saga }));

    return timeoutSagas;
  }

  /**
   * 删除Saga
   */
  async deleteSaga(sagaId: string): Promise<void> {
    const deleted = this.sagas.delete(sagaId);
    if (deleted) {
      console.log(`🗑️ 删除Saga: ${sagaId}`);
    }
  }

  /**
   * 查询Saga
   */
  async querySagas(filter: {
    sagaType?: string;
    status?: SagaStatus;
    correlationId?: string;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<SagaInstance[]> {
    let sagas = Array.from(this.sagas.values());

    if (filter.sagaType) {
      sagas = sagas.filter((saga) => saga.sagaType === filter.sagaType);
    }

    if (filter.status) {
      sagas = sagas.filter((saga) => saga.status === filter.status);
    }

    if (filter.correlationId) {
      sagas = sagas.filter(
        (saga) => saga.correlationId === filter.correlationId
      );
    }

    if (filter.userId) {
      sagas = sagas.filter((saga) => saga.createdBy === filter.userId);
    }

    if (filter.fromDate) {
      sagas = sagas.filter((saga) => saga.startedAt >= filter.fromDate!);
    }

    if (filter.toDate) {
      sagas = sagas.filter((saga) => saga.startedAt <= filter.toDate!);
    }

    return sagas.map((saga) => ({ ...saga }));
  }

  /**
   * 获取所有Saga
   */
  async getAllSagas(): Promise<SagaInstance[]> {
    return Array.from(this.sagas.values()).map((saga) => ({ ...saga }));
  }

  /**
   * 获取Saga统计
   */
  async getStatistics(): Promise<{
    totalSagas: number;
    sagasByStatus: Record<string, number>;
    sagasByType: Record<string, number>;
    averageExecutionTime: number;
  }> {
    const sagas = Array.from(this.sagas.values());
    const totalSagas = sagas.length;

    // 按状态统计
    const sagasByStatus: Record<string, number> = {};
    for (const saga of sagas) {
      sagasByStatus[saga.status] = (sagasByStatus[saga.status] || 0) + 1;
    }

    // 按类型统计
    const sagasByType: Record<string, number> = {};
    for (const saga of sagas) {
      sagasByType[saga.sagaType] = (sagasByType[saga.sagaType] || 0) + 1;
    }

    // 计算平均执行时间
    const completedSagas = sagas.filter((saga) => saga.completedAt);
    const totalExecutionTime = completedSagas.reduce((sum, saga) => {
      return sum + (saga.completedAt!.getTime() - saga.startedAt.getTime());
    }, 0);
    const averageExecutionTime =
      completedSagas.length > 0
        ? totalExecutionTime / completedSagas.length
        : 0;

    return {
      totalSagas,
      sagasByStatus,
      sagasByType,
      averageExecutionTime,
    };
  }

  /**
   * 清空所有Saga
   */
  async clear(): Promise<void> {
    this.sagas.clear();
    console.log("🧹 清空所有Saga");
  }

  /**
   * 获取Saga总数
   */
  async getCount(): Promise<number> {
    return this.sagas.size;
  }

  /**
   * 检查Saga是否存在
   */
  async exists(sagaId: string): Promise<boolean> {
    return this.sagas.has(sagaId);
  }

  /**
   * 获取最近的Saga
   */
  async getRecentSagas(limit: number = 10): Promise<SagaInstance[]> {
    return Array.from(this.sagas.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit)
      .map((saga) => ({ ...saga }));
  }

  /**
   * 获取失败的Saga
   */
  async getFailedSagas(): Promise<SagaInstance[]> {
    return Array.from(this.sagas.values())
      .filter((saga) => saga.status === SagaStatus.FAILED)
      .map((saga) => ({ ...saga }));
  }

  /**
   * 获取需要补偿的Saga
   */
  async getCompensatingSagas(): Promise<SagaInstance[]> {
    return Array.from(this.sagas.values())
      .filter((saga) => saga.status === SagaStatus.COMPENSATING)
      .map((saga) => ({ ...saga }));
  }
}
