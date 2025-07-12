import { DomainEvent, EntityId } from "./index";

/**
 * 事件流信息
 */
export interface EventStream {
  streamId: string;
  streamType: string;
  version: number;
  events: StoredEvent[];
}

/**
 * 存储的事件信息
 */
export interface StoredEvent {
  eventId: string;
  streamId: string;
  streamType: string;
  eventType: string;
  eventData: any;
  metadata: EventMetadata;
  eventVersion: number;
  streamVersion: number;
  occurredOn: Date;
  storedOn: Date;
}

/**
 * 事件元数据
 */
export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  source?: string;
  [key: string]: any;
}

/**
 * 事件存储接口
 */
export interface IEventStore {
  /**
   * 保存事件到流
   */
  saveEvents(
    streamId: string,
    streamType: string,
    events: DomainEvent[],
    expectedVersion: number,
    metadata?: EventMetadata
  ): Promise<void>;

  /**
   * 获取事件流
   */
  getEventStream(
    streamId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<EventStream>;

  /**
   * 获取所有事件流
   */
  getAllEventStreams(
    streamType?: string,
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<EventStream[]>;

  /**
   * 检查流是否存在
   */
  streamExists(streamId: string): Promise<boolean>;

  /**
   * 获取流的当前版本
   */
  getStreamVersion(streamId: string): Promise<number>;

  /**
   * 删除事件流（软删除）
   */
  deleteStream(streamId: string): Promise<void>;
}

/**
 * 事件快照
 */
export interface EventSnapshot {
  streamId: string;
  streamType: string;
  snapshotVersion: number;
  snapshotData: any;
  snapshotMetadata: any;
  createdAt: Date;
}

/**
 * 快照存储接口
 */
export interface ISnapshotStore {
  /**
   * 保存快照
   */
  saveSnapshot(snapshot: EventSnapshot): Promise<void>;

  /**
   * 获取快照
   */
  getSnapshot(streamId: string): Promise<EventSnapshot | null>;

  /**
   * 删除快照
   */
  deleteSnapshot(streamId: string): Promise<void>;

  /**
   * 获取快照版本
   */
  getSnapshotVersion(streamId: string): Promise<number>;
}

/**
 * 事件投影接口
 */
export interface IEventProjection {
  /**
   * 投影名称
   */
  readonly projectionName: string;

  /**
   * 支持的事件类型
   */
  readonly supportedEvents: string[];

  /**
   * 处理事件
   */
  project(event: StoredEvent): Promise<void>;

  /**
   * 重置投影
   */
  reset(): Promise<void>;

  /**
   * 获取投影状态
   */
  getStatus(): Promise<ProjectionStatus>;
}

/**
 * 投影状态
 */
export interface ProjectionStatus {
  projectionName: string;
  lastProcessedEventId: string;
  lastProcessedVersion: number;
  isRunning: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 事件重放配置
 */
export interface EventReplayConfig {
  streamId?: string;
  streamType?: string;
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  eventTypes?: string[];
  batchSize?: number;
}

/**
 * 事件重放结果
 */
export interface EventReplayResult {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  errors: string[];
  duration: number;
}

/**
 * 并发控制异常
 */
export class ConcurrencyException extends Error {
  constructor(
    public readonly streamId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `并发冲突: 流 ${streamId} 期望版本 ${expectedVersion}，实际版本 ${actualVersion}`
    );
    this.name = "ConcurrencyException";
  }
}

/**
 * 流不存在异常
 */
export class StreamNotFoundException extends Error {
  constructor(public readonly streamId: string) {
    super(`事件流不存在: ${streamId}`);
    this.name = "StreamNotFoundException";
  }
}
