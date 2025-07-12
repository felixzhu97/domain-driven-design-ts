import {
  IEventStore,
  EventStream,
  StoredEvent,
  EventMetadata,
  ConcurrencyException,
  StreamNotFoundException,
} from "../../shared/types/EventStore";
import { DomainEvent } from "../../shared/types";
import { IdGenerator } from "../../shared/utils/IdGenerator";

/**
 * 内存事件存储实现
 */
export class MemoryEventStore implements IEventStore {
  private streams: Map<string, StoredEvent[]> = new Map();
  private streamVersions: Map<string, number> = new Map();
  private deletedStreams: Set<string> = new Set();

  /**
   * 保存事件到流
   */
  async saveEvents(
    streamId: string,
    streamType: string,
    events: DomainEvent[],
    expectedVersion: number,
    metadata: EventMetadata = {}
  ): Promise<void> {
    if (this.deletedStreams.has(streamId)) {
      throw new StreamNotFoundException(streamId);
    }

    // 检查并发控制
    const currentVersion = this.streamVersions.get(streamId) || 0;
    if (expectedVersion !== -1 && currentVersion !== expectedVersion) {
      throw new ConcurrencyException(streamId, expectedVersion, currentVersion);
    }

    // 如果流不存在，创建新流
    if (!this.streams.has(streamId)) {
      this.streams.set(streamId, []);
      this.streamVersions.set(streamId, 0);
    }

    const streamEvents = this.streams.get(streamId)!;
    let streamVersion = this.streamVersions.get(streamId)!;

    // 转换为存储事件
    const storedEvents: StoredEvent[] = events.map((event, index) => ({
      eventId: event.eventId,
      streamId,
      streamType,
      eventType: event.eventType,
      eventData: this.serializeEventData(event),
      metadata: { ...metadata, originalEvent: event },
      eventVersion: event.eventVersion,
      streamVersion: streamVersion + index + 1,
      occurredOn: event.occurredOn,
      storedOn: new Date(),
    }));

    // 保存事件
    streamEvents.push(...storedEvents);
    streamVersion += events.length;
    this.streamVersions.set(streamId, streamVersion);

    console.log(
      `💾 保存 ${events.length} 个事件到流 ${streamId}，版本: ${streamVersion}`
    );
  }

  /**
   * 获取事件流
   */
  async getEventStream(
    streamId: string,
    fromVersion: number = 0,
    toVersion?: number
  ): Promise<EventStream> {
    if (this.deletedStreams.has(streamId)) {
      throw new StreamNotFoundException(streamId);
    }

    const streamEvents = this.streams.get(streamId);
    if (!streamEvents) {
      throw new StreamNotFoundException(streamId);
    }

    // 过滤版本范围
    let filteredEvents = streamEvents.filter(
      (event) => event.streamVersion > fromVersion
    );

    if (toVersion !== undefined) {
      filteredEvents = filteredEvents.filter(
        (event) => event.streamVersion <= toVersion
      );
    }

    const currentVersion = this.streamVersions.get(streamId) || 0;
    const streamType =
      filteredEvents.length > 0 && filteredEvents[0]
        ? filteredEvents[0].streamType
        : "unknown";

    return {
      streamId,
      streamType,
      version: currentVersion,
      events: filteredEvents,
    };
  }

  /**
   * 获取所有事件流
   */
  async getAllEventStreams(
    streamType?: string,
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<EventStream[]> {
    const result: EventStream[] = [];

    for (const [streamId, events] of this.streams.entries()) {
      if (this.deletedStreams.has(streamId)) {
        continue;
      }

      let filteredEvents = [...events];

      // 按流类型过滤
      if (streamType && events.length > 0 && events[0]) {
        if (events[0].streamType !== streamType) {
          continue;
        }
      }

      // 按时间过滤
      if (fromTimestamp) {
        filteredEvents = filteredEvents.filter(
          (event) => event.occurredOn >= fromTimestamp
        );
      }

      if (toTimestamp) {
        filteredEvents = filteredEvents.filter(
          (event) => event.occurredOn <= toTimestamp
        );
      }

      if (filteredEvents.length > 0) {
        const currentVersion = this.streamVersions.get(streamId) || 0;
        const eventStreamType =
          filteredEvents[0] && filteredEvents[0].streamType
            ? filteredEvents[0].streamType
            : "unknown";

        result.push({
          streamId,
          streamType: eventStreamType,
          version: currentVersion,
          events: filteredEvents,
        });
      }
    }

    return result;
  }

  /**
   * 检查流是否存在
   */
  async streamExists(streamId: string): Promise<boolean> {
    return this.streams.has(streamId) && !this.deletedStreams.has(streamId);
  }

  /**
   * 获取流的当前版本
   */
  async getStreamVersion(streamId: string): Promise<number> {
    if (this.deletedStreams.has(streamId)) {
      throw new StreamNotFoundException(streamId);
    }

    return this.streamVersions.get(streamId) || 0;
  }

  /**
   * 删除事件流（软删除）
   */
  async deleteStream(streamId: string): Promise<void> {
    if (!this.streams.has(streamId)) {
      throw new StreamNotFoundException(streamId);
    }

    this.deletedStreams.add(streamId);
    console.log(`🗑️ 删除事件流: ${streamId}`);
  }

  /**
   * 序列化事件数据
   */
  private serializeEventData(event: DomainEvent): any {
    try {
      return JSON.parse(JSON.stringify(event));
    } catch (error) {
      console.error("序列化事件数据失败:", error);
      return event;
    }
  }

  /**
   * 反序列化事件数据
   */
  private deserializeEventData(eventData: any): DomainEvent {
    return eventData;
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    totalStreams: number;
    totalEvents: number;
    deletedStreams: number;
    streamTypes: string[];
  }> {
    const activeStreams = Array.from(this.streams.keys()).filter(
      (streamId) => !this.deletedStreams.has(streamId)
    );

    let totalEvents = 0;
    const streamTypes = new Set<string>();

    for (const streamId of activeStreams) {
      const events = this.streams.get(streamId) || [];
      totalEvents += events.length;

      if (events.length > 0 && events[0]) {
        streamTypes.add(events[0].streamType);
      }
    }

    return {
      totalStreams: activeStreams.length,
      totalEvents,
      deletedStreams: this.deletedStreams.size,
      streamTypes: Array.from(streamTypes),
    };
  }

  /**
   * 重建聚合从事件流
   */
  async rebuildAggregateFromEvents<
    T extends { loadFromHistory(events: DomainEvent[]): void }
  >(streamId: string, aggregateFactory: () => T): Promise<T> {
    const eventStream = await this.getEventStream(streamId);
    const aggregate = aggregateFactory();

    // 将存储事件转换回领域事件
    const domainEvents = eventStream.events.map((storedEvent) =>
      this.deserializeEventData(storedEvent.eventData)
    );

    aggregate.loadFromHistory(domainEvents);
    return aggregate;
  }

  /**
   * 清空所有数据（用于测试）
   */
  clear(): void {
    this.streams.clear();
    this.streamVersions.clear();
    this.deletedStreams.clear();
  }

  /**
   * 获取流的所有事件类型
   */
  async getEventTypes(streamId: string): Promise<string[]> {
    const events = this.streams.get(streamId) || [];
    const eventTypes = new Set(events.map((event) => event.eventType));
    return Array.from(eventTypes);
  }

  /**
   * 按事件类型获取事件
   */
  async getEventsByType(
    eventType: string,
    streamId?: string,
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<StoredEvent[]> {
    const result: StoredEvent[] = [];

    const streamsToSearch = streamId
      ? [streamId]
      : Array.from(this.streams.keys()).filter(
          (id) => !this.deletedStreams.has(id)
        );

    for (const currentStreamId of streamsToSearch) {
      const events = this.streams.get(currentStreamId) || [];

      let filteredEvents = events.filter(
        (event) => event.eventType === eventType
      );

      if (fromTimestamp) {
        filteredEvents = filteredEvents.filter(
          (event) => event.occurredOn >= fromTimestamp
        );
      }

      if (toTimestamp) {
        filteredEvents = filteredEvents.filter(
          (event) => event.occurredOn <= toTimestamp
        );
      }

      result.push(...filteredEvents);
    }

    // 按时间排序
    result.sort((a, b) => a.occurredOn.getTime() - b.occurredOn.getTime());

    return result;
  }
}
