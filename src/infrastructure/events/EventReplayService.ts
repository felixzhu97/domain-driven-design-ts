import {
  IEventStore,
  EventReplayConfig,
  EventReplayResult,
  StoredEvent,
} from "../../shared/types/EventStore";
import { EventBus } from "./EventBus";

/**
 * 事件重放服务
 */
export class EventReplayService {
  constructor(private eventStore: IEventStore, private eventBus: EventBus) {}

  /**
   * 重放事件
   */
  async replayEvents(
    config: EventReplayConfig = {}
  ): Promise<EventReplayResult> {
    const startTime = Date.now();
    let totalEvents = 0;
    let processedEvents = 0;
    let failedEvents = 0;
    const errors: string[] = [];

    console.log("🔄 开始事件重放...");
    console.log("配置:", JSON.stringify(config, null, 2));

    try {
      // 获取需要重放的事件
      const events = await this.getEventsToReplay(config);
      totalEvents = events.length;

      console.log(`📊 找到 ${totalEvents} 个事件需要重放`);

      if (totalEvents === 0) {
        return {
          totalEvents: 0,
          processedEvents: 0,
          failedEvents: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      // 按批次处理事件
      const batchSize = config.batchSize || 100;
      const batches = this.chunkArray(events, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch) continue;

        console.log(
          `🔄 处理批次 ${i + 1}/${batches.length} (${batch.length} 个事件)`
        );

        for (const event of batch) {
          try {
            await this.replayEvent(event);
            processedEvents++;
          } catch (error) {
            failedEvents++;
            const errorMsg = `重放事件失败 ${event.eventId}: ${
              error instanceof Error ? error.message : String(error)
            }`;
            errors.push(errorMsg);
            console.error(errorMsg);
          }
        }

        // 批次间短暂延迟，避免过载
        if (i < batches.length - 1) {
          await this.delay(10);
        }
      }
    } catch (error) {
      console.error("事件重放过程中发生错误:", error);
      errors.push(
        `重放过程错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const duration = Date.now() - startTime;
    const result: EventReplayResult = {
      totalEvents,
      processedEvents,
      failedEvents,
      errors,
      duration,
    };

    console.log("✅ 事件重放完成");
    console.log("结果:", JSON.stringify(result, null, 2));

    return result;
  }

  /**
   * 重放单个流的事件
   */
  async replayStreamEvents(
    streamId: string,
    fromVersion: number = 0,
    toVersion?: number
  ): Promise<EventReplayResult> {
    const config: EventReplayConfig = { streamId, fromVersion };
    if (toVersion !== undefined) {
      config.toVersion = toVersion;
    }
    return this.replayEvents(config);
  }

  /**
   * 重放指定类型的事件
   */
  async replayEventsByType(
    eventTypes: string[],
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<EventReplayResult> {
    const config: EventReplayConfig = { eventTypes };
    if (fromTimestamp !== undefined) {
      config.fromTimestamp = fromTimestamp;
    }
    if (toTimestamp !== undefined) {
      config.toTimestamp = toTimestamp;
    }
    return this.replayEvents(config);
  }

  /**
   * 重放指定时间范围的事件
   */
  async replayEventsByTimeRange(
    fromTimestamp: Date,
    toTimestamp: Date,
    streamType?: string
  ): Promise<EventReplayResult> {
    const config: EventReplayConfig = { fromTimestamp, toTimestamp };
    if (streamType !== undefined) {
      config.streamType = streamType;
    }
    return this.replayEvents(config);
  }

  /**
   * 获取需要重放的事件
   */
  private async getEventsToReplay(
    config: EventReplayConfig
  ): Promise<StoredEvent[]> {
    let allEvents: StoredEvent[] = [];

    if (config.streamId) {
      // 重放单个流
      const eventStream = await this.eventStore.getEventStream(
        config.streamId,
        config.fromVersion,
        config.toVersion
      );
      allEvents = eventStream.events;
    } else {
      // 重放多个流
      const eventStreams = await this.eventStore.getAllEventStreams(
        config.streamType,
        config.fromTimestamp,
        config.toTimestamp
      );

      for (const stream of eventStreams) {
        let streamEvents = stream.events;

        // 版本过滤
        if (config.fromVersion !== undefined) {
          streamEvents = streamEvents.filter(
            (event) => event.streamVersion >= config.fromVersion!
          );
        }

        if (config.toVersion !== undefined) {
          streamEvents = streamEvents.filter(
            (event) => event.streamVersion <= config.toVersion!
          );
        }

        allEvents.push(...streamEvents);
      }
    }

    // 事件类型过滤
    if (config.eventTypes && config.eventTypes.length > 0) {
      allEvents = allEvents.filter((event) =>
        config.eventTypes!.includes(event.eventType)
      );
    }

    // 时间过滤
    if (config.fromTimestamp) {
      allEvents = allEvents.filter(
        (event) => event.occurredOn >= config.fromTimestamp!
      );
    }

    if (config.toTimestamp) {
      allEvents = allEvents.filter(
        (event) => event.occurredOn <= config.toTimestamp!
      );
    }

    // 按时间排序，确保按正确的顺序重放
    allEvents.sort((a, b) => a.occurredOn.getTime() - b.occurredOn.getTime());

    return allEvents;
  }

  /**
   * 重放单个事件
   */
  private async replayEvent(storedEvent: StoredEvent): Promise<void> {
    try {
      // 将存储事件转换为领域事件
      const domainEvent = this.convertStoredEventToDomainEvent(storedEvent);

      // 通过事件总线重新发布事件
      await this.eventBus.publish(domainEvent);

      console.log(
        `✅ 重放事件: ${storedEvent.eventType} (${storedEvent.eventId})`
      );
    } catch (error) {
      console.error(`❌ 重放事件失败: ${storedEvent.eventId}`, error);
      throw error;
    }
  }

  /**
   * 转换存储事件为领域事件
   */
  private convertStoredEventToDomainEvent(storedEvent: StoredEvent): any {
    return {
      eventId: storedEvent.eventId,
      occurredOn: storedEvent.occurredOn,
      eventVersion: storedEvent.eventVersion,
      eventType: storedEvent.eventType,
      aggregateId: storedEvent.streamId,
      ...storedEvent.eventData,
    };
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 验证重放配置
   */
  private validateConfig(config: EventReplayConfig): void {
    if (config.fromVersion !== undefined && config.fromVersion < 0) {
      throw new Error("fromVersion 不能小于 0");
    }

    if (
      config.toVersion !== undefined &&
      config.fromVersion !== undefined &&
      config.toVersion < config.fromVersion
    ) {
      throw new Error("toVersion 不能小于 fromVersion");
    }

    if (
      config.fromTimestamp &&
      config.toTimestamp &&
      config.fromTimestamp > config.toTimestamp
    ) {
      throw new Error("fromTimestamp 不能大于 toTimestamp");
    }

    if (config.batchSize !== undefined && config.batchSize <= 0) {
      throw new Error("batchSize 必须大于 0");
    }
  }

  /**
   * 获取重放统计信息
   */
  async getReplayStatistics(config: EventReplayConfig = {}): Promise<{
    estimatedEventCount: number;
    eventTypes: string[];
    dateRange: {
      earliest: Date | null;
      latest: Date | null;
    };
    streamTypes: string[];
  }> {
    const events = await this.getEventsToReplay(config);
    const eventTypes = new Set(events.map((e) => e.eventType));
    const streamTypes = new Set(events.map((e) => e.streamType));

    let earliest: Date | null = null;
    let latest: Date | null = null;

    if (events.length > 0) {
      const dates = events.map((e) => e.occurredOn);
      earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
      latest = new Date(Math.max(...dates.map((d) => d.getTime())));
    }

    return {
      estimatedEventCount: events.length,
      eventTypes: Array.from(eventTypes),
      dateRange: { earliest, latest },
      streamTypes: Array.from(streamTypes),
    };
  }

  /**
   * 干运行模式 - 不实际重放，只统计
   */
  async dryRun(config: EventReplayConfig = {}): Promise<{
    wouldReplayCount: number;
    eventBreakdown: Record<string, number>;
    timeRange: { from: Date | null; to: Date | null };
  }> {
    const events = await this.getEventsToReplay(config);
    const eventBreakdown: Record<string, number> = {};

    for (const event of events) {
      eventBreakdown[event.eventType] =
        (eventBreakdown[event.eventType] || 0) + 1;
    }

    let from: Date | null = null;
    let to: Date | null = null;

    if (events.length > 0) {
      const firstEvent = events[0];
      const lastEvent = events[events.length - 1];
      if (firstEvent && lastEvent) {
        from = firstEvent.occurredOn;
        to = lastEvent.occurredOn;
      }
    }

    return {
      wouldReplayCount: events.length,
      eventBreakdown,
      timeRange: { from, to },
    };
  }
}
