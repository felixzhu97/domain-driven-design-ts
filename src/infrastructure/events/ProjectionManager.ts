import {
  IEventProjection,
  IEventStore,
  StoredEvent,
  ProjectionStatus,
} from "../../shared/types/EventStore";

/**
 * 投影管理器
 */
export class ProjectionManager {
  private projections: Map<string, IEventProjection> = new Map();
  private projectionStatus: Map<string, ProjectionStatus> = new Map();
  private isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_DELAY = 1000; // 1秒轮询间隔

  constructor(private eventStore: IEventStore) {}

  /**
   * 注册投影
   */
  registerProjection(projection: IEventProjection): void {
    this.projections.set(projection.projectionName, projection);

    // 初始化投影状态
    if (!this.projectionStatus.has(projection.projectionName)) {
      this.projectionStatus.set(projection.projectionName, {
        projectionName: projection.projectionName,
        lastProcessedEventId: "",
        lastProcessedVersion: 0,
        isRunning: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`📋 注册投影: ${projection.projectionName}`);
  }

  /**
   * 取消注册投影
   */
  unregisterProjection(projectionName: string): void {
    this.projections.delete(projectionName);
    this.projectionStatus.delete(projectionName);
    console.log(`📋 取消注册投影: ${projectionName}`);
  }

  /**
   * 启动投影管理器
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log("🚀 启动投影管理器");

    // 启动轮询
    this.pollingInterval = setInterval(async () => {
      await this.processProjections();
    }, this.POLLING_DELAY);
  }

  /**
   * 停止投影管理器
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // 停止所有投影
    for (const [projectionName, status] of this.projectionStatus) {
      status.isRunning = false;
      status.updatedAt = new Date();
    }

    console.log("⏹️ 停止投影管理器");
  }

  /**
   * 处理所有投影
   */
  private async processProjections(): Promise<void> {
    for (const [projectionName, projection] of this.projections) {
      try {
        await this.processProjection(projection);
      } catch (error) {
        console.error(`处理投影 ${projectionName} 时发生错误:`, error);
      }
    }
  }

  /**
   * 处理单个投影
   */
  private async processProjection(projection: IEventProjection): Promise<void> {
    const status = this.projectionStatus.get(projection.projectionName);
    if (!status || status.isRunning) {
      return;
    }

    status.isRunning = true;

    try {
      // 获取需要处理的事件
      const events = await this.getUnprocessedEvents(
        projection,
        status.lastProcessedVersion
      );

      if (events.length === 0) {
        return;
      }

      console.log(
        `📊 投影 ${projection.projectionName} 处理 ${events.length} 个事件`
      );

      // 逐个处理事件
      for (const event of events) {
        await projection.project(event);

        // 更新状态
        status.lastProcessedEventId = event.eventId;
        status.lastProcessedVersion = event.streamVersion;
        status.updatedAt = new Date();
      }
    } finally {
      status.isRunning = false;
    }
  }

  /**
   * 获取未处理的事件
   */
  private async getUnprocessedEvents(
    projection: IEventProjection,
    lastProcessedVersion: number
  ): Promise<StoredEvent[]> {
    const allEvents: StoredEvent[] = [];

    // 获取所有事件流
    const eventStreams = await this.eventStore.getAllEventStreams();

    for (const stream of eventStreams) {
      // 过滤支持的事件类型
      const supportedEvents = stream.events.filter(
        (event) =>
          projection.supportedEvents.includes(event.eventType) &&
          event.streamVersion > lastProcessedVersion
      );

      allEvents.push(...supportedEvents);
    }

    // 按时间排序确保顺序处理
    allEvents.sort((a, b) => a.occurredOn.getTime() - b.occurredOn.getTime());

    return allEvents;
  }

  /**
   * 重建投影
   */
  async rebuildProjection(projectionName: string): Promise<void> {
    const projection = this.projections.get(projectionName);
    if (!projection) {
      throw new Error(`投影不存在: ${projectionName}`);
    }

    console.log(`🔄 重建投影: ${projectionName}`);

    try {
      // 重置投影
      await projection.reset();

      // 重置状态
      const status = this.projectionStatus.get(projectionName)!;
      status.lastProcessedEventId = "";
      status.lastProcessedVersion = 0;
      status.updatedAt = new Date();

      // 处理所有事件
      await this.processProjection(projection);

      console.log(`✅ 投影重建完成: ${projectionName}`);
    } catch (error) {
      console.error(`投影重建失败: ${projectionName}`, error);
      throw error;
    }
  }

  /**
   * 重建所有投影
   */
  async rebuildAllProjections(): Promise<void> {
    console.log("🔄 重建所有投影");

    for (const projectionName of this.projections.keys()) {
      await this.rebuildProjection(projectionName);
    }

    console.log("✅ 所有投影重建完成");
  }

  /**
   * 获取投影状态
   */
  getProjectionStatus(projectionName: string): ProjectionStatus | null {
    return this.projectionStatus.get(projectionName) || null;
  }

  /**
   * 获取所有投影状态
   */
  getAllProjectionStatuses(): ProjectionStatus[] {
    return Array.from(this.projectionStatus.values());
  }

  /**
   * 检查投影健康状态
   */
  async checkHealth(): Promise<{
    isHealthy: boolean;
    projectionCount: number;
    runningProjections: number;
    healthyProjections: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let healthyProjections = 0;
    let runningProjections = 0;

    for (const status of this.projectionStatus.values()) {
      if (status.isRunning) {
        runningProjections++;
      }

      // 检查是否长时间未更新
      const timeSinceUpdate = Date.now() - status.updatedAt.getTime();
      const maxUpdateDelay = 5 * 60 * 1000; // 5分钟

      if (timeSinceUpdate > maxUpdateDelay) {
        issues.push(`投影 ${status.projectionName} 长时间未更新`);
      } else {
        healthyProjections++;
      }
    }

    return {
      isHealthy: issues.length === 0,
      projectionCount: this.projections.size,
      runningProjections,
      healthyProjections,
      issues,
    };
  }

  /**
   * 获取投影统计信息
   */
  getStatistics(): {
    totalProjections: number;
    runningProjections: number;
    totalEventsProcessed: number;
  } {
    let runningProjections = 0;
    let totalEventsProcessed = 0;

    for (const status of this.projectionStatus.values()) {
      if (status.isRunning) {
        runningProjections++;
      }
      totalEventsProcessed += status.lastProcessedVersion;
    }

    return {
      totalProjections: this.projections.size,
      runningProjections,
      totalEventsProcessed,
    };
  }
}
