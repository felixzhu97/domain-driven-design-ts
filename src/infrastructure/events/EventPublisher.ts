import { DomainEvent } from "../../shared/types";
import { EventBus } from "./EventBus";
import { AggregateRoot } from "../../domain/entities/AggregateRoot";

/**
 * 事件发布器 - 负责从聚合根发布领域事件
 */
export class EventPublisher {
  private static instance: EventPublisher;
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
  }

  public static getInstance(): EventPublisher {
    if (!EventPublisher.instance) {
      EventPublisher.instance = new EventPublisher();
    }
    return EventPublisher.instance;
  }

  /**
   * 发布聚合根的所有未提交事件
   */
  async publishEventsForAggregate(aggregate: AggregateRoot): Promise<void> {
    const events = aggregate.getUncommittedEvents();
    if (events.length === 0) {
      return;
    }

    // 发布所有事件
    await this.eventBus.publishAll(events);

    // 标记事件为已提交
    aggregate.markEventsAsCommitted();
  }

  /**
   * 发布单个事件
   */
  async publishEvent(event: DomainEvent): Promise<void> {
    await this.eventBus.publish(event);
  }

  /**
   * 批量发布多个聚合根的事件
   */
  async publishEventsForAggregates(aggregates: AggregateRoot[]): Promise<void> {
    const allEvents: DomainEvent[] = [];

    // 收集所有事件
    for (const aggregate of aggregates) {
      const events = aggregate.getUncommittedEvents();
      allEvents.push(...events);
    }

    if (allEvents.length === 0) {
      return;
    }

    // 批量发布事件
    await this.eventBus.publishAll(allEvents);

    // 标记所有事件为已提交
    for (const aggregate of aggregates) {
      aggregate.markEventsAsCommitted();
    }
  }

  /**
   * 获取事件总线实例（用于直接订阅）
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }
}
