import { AggregateRoot, EntityId, DomainEvent } from "../../shared/types";
import {
  IEventStore,
  ISnapshotStore,
  EventSnapshot,
  EventMetadata,
} from "../../shared/types/EventStore";

/**
 * 事件溯源仓储基类
 */
export abstract class EventSourcingRepository<T extends AggregateRoot> {
  private static readonly SNAPSHOT_FREQUENCY = 10; // 每10个事件创建一个快照

  constructor(
    protected eventStore: IEventStore,
    protected snapshotStore?: ISnapshotStore,
    protected streamType: string = "aggregate"
  ) {}

  /**
   * 根据ID获取聚合
   */
  async getById(id: EntityId): Promise<T | null> {
    try {
      let aggregate: T | null = null;
      let fromVersion = 0;

      // 尝试从快照加载
      if (this.snapshotStore) {
        const snapshot = await this.snapshotStore.getSnapshot(id);
        if (snapshot) {
          aggregate = this.createAggregateFromSnapshot(snapshot);
          fromVersion = snapshot.snapshotVersion;
          console.log(`📸 从快照加载聚合 ${id} (版本: ${fromVersion})`);
        }
      }

      // 从事件流加载剩余事件
      try {
        const eventStream = await this.eventStore.getEventStream(
          id,
          fromVersion
        );

        if (!aggregate && eventStream.events.length === 0) {
          return null; // 聚合不存在
        }

        if (!aggregate) {
          aggregate = this.createEmptyAggregate(id);
        }

        // 应用事件
        if (eventStream.events.length > 0) {
          const domainEvents = eventStream.events.map((storedEvent) =>
            this.deserializeEvent(storedEvent.eventData)
          );
          aggregate.loadFromHistory(domainEvents);
          console.log(
            `⚡ 从 ${eventStream.events.length} 个事件重建聚合 ${id}`
          );
        }

        return aggregate;
      } catch (error) {
        // 如果流不存在，返回null
        if (
          error instanceof Error &&
          error.name === "StreamNotFoundException"
        ) {
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.error(`加载聚合 ${id} 失败:`, error);
      throw error;
    }
  }

  /**
   * 保存聚合
   */
  async save(
    aggregate: T,
    expectedVersion: number = -1,
    metadata?: EventMetadata
  ): Promise<void> {
    const events = aggregate.getUncommittedEvents();
    if (events.length === 0) {
      return; // 没有变更，无需保存
    }

    try {
      // 保存事件
      await this.eventStore.saveEvents(
        aggregate.id,
        this.streamType,
        events,
        expectedVersion,
        metadata
      );

      // 标记事件为已提交
      aggregate.markEventsAsCommitted();

      // 检查是否需要创建快照
      if (
        this.snapshotStore &&
        (await this.shouldCreateSnapshot(aggregate, events.length))
      ) {
        await this.createSnapshot(aggregate);
      }

      console.log(`💾 保存聚合 ${aggregate.id}，${events.length} 个事件`);
    } catch (error) {
      console.error(`保存聚合 ${aggregate.id} 失败:`, error);
      throw error;
    }
  }

  /**
   * 删除聚合（软删除）
   */
  async delete(id: EntityId): Promise<void> {
    await this.eventStore.deleteStream(id);

    if (this.snapshotStore) {
      await this.snapshotStore.deleteSnapshot(id);
    }

    console.log(`🗑️ 删除聚合 ${id}`);
  }

  /**
   * 检查聚合是否存在
   */
  async exists(id: EntityId): Promise<boolean> {
    return await this.eventStore.streamExists(id);
  }

  /**
   * 获取聚合版本
   */
  async getVersion(id: EntityId): Promise<number> {
    return await this.eventStore.getStreamVersion(id);
  }

  /**
   * 重建聚合到指定版本
   */
  async getByIdAtVersion(id: EntityId, version: number): Promise<T | null> {
    try {
      const eventStream = await this.eventStore.getEventStream(id, 0, version);

      if (eventStream.events.length === 0) {
        return null;
      }

      const aggregate = this.createEmptyAggregate(id);
      const domainEvents = eventStream.events.map((storedEvent) =>
        this.deserializeEvent(storedEvent.eventData)
      );

      aggregate.loadFromHistory(domainEvents);

      console.log(`⏮️ 重建聚合 ${id} 到版本 ${version}`);
      return aggregate;
    } catch (error) {
      if (error instanceof Error && error.name === "StreamNotFoundException") {
        return null;
      }
      throw error;
    }
  }

  /**
   * 获取聚合的事件历史
   */
  async getEventHistory(
    id: EntityId,
    fromVersion?: number,
    toVersion?: number
  ): Promise<DomainEvent[]> {
    try {
      const eventStream = await this.eventStore.getEventStream(
        id,
        fromVersion,
        toVersion
      );
      return eventStream.events.map((storedEvent) =>
        this.deserializeEvent(storedEvent.eventData)
      );
    } catch (error) {
      if (error instanceof Error && error.name === "StreamNotFoundException") {
        return [];
      }
      throw error;
    }
  }

  /**
   * 创建快照
   */
  private async createSnapshot(aggregate: T): Promise<void> {
    if (!this.snapshotStore) {
      return;
    }

    try {
      const version = await this.eventStore.getStreamVersion(aggregate.id);
      const snapshotData = this.serializeAggregateForSnapshot(aggregate);

      const snapshot: EventSnapshot = {
        streamId: aggregate.id,
        streamType: this.streamType,
        snapshotVersion: version,
        snapshotData,
        snapshotMetadata: {
          createdBy: this.constructor.name,
          aggregateType: aggregate.constructor.name,
        },
        createdAt: new Date(),
      };

      await this.snapshotStore.saveSnapshot(snapshot);
      console.log(`📸 创建快照: ${aggregate.id} (版本: ${version})`);
    } catch (error) {
      console.error(`创建快照失败:`, error);
      // 快照失败不应该影响主流程，只记录错误
    }
  }

  /**
   * 判断是否应该创建快照
   */
  private async shouldCreateSnapshot(
    aggregate: T,
    newEventsCount: number
  ): Promise<boolean> {
    try {
      const currentVersion = await this.eventStore.getStreamVersion(
        aggregate.id
      );
      const lastSnapshotVersion = this.snapshotStore
        ? await this.snapshotStore.getSnapshotVersion(aggregate.id)
        : 0;

      const eventsSinceSnapshot = currentVersion - lastSnapshotVersion;
      return eventsSinceSnapshot >= EventSourcingRepository.SNAPSHOT_FREQUENCY;
    } catch (error) {
      return false;
    }
  }

  /**
   * 抽象方法：创建空聚合
   */
  protected abstract createEmptyAggregate(id: EntityId): T;

  /**
   * 抽象方法：从快照创建聚合
   */
  protected abstract createAggregateFromSnapshot(snapshot: EventSnapshot): T;

  /**
   * 抽象方法：序列化聚合用于快照
   */
  protected abstract serializeAggregateForSnapshot(aggregate: T): any;

  /**
   * 抽象方法：反序列化事件
   */
  protected abstract deserializeEvent(eventData: any): DomainEvent;
}
