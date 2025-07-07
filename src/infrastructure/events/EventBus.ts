import { DomainEvent } from "../../shared/types";

/**
 * 事件处理器接口
 */
export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void> | void;
}

/**
 * 事件订阅信息
 */
interface EventSubscription {
  eventType: string;
  handler: EventHandler;
  priority?: number;
}

/**
 * 事件总线 - 管理领域事件的发布和订阅
 */
export class EventBus {
  private static instance: EventBus;
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private isProcessing = false;
  private eventQueue: DomainEvent[] = [];

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * 订阅事件
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    priority: number = 0
  ): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subscription: EventSubscription = {
      eventType,
      handler: handler as EventHandler,
      priority,
    };

    const subscriptions = this.subscriptions.get(eventType)!;
    subscriptions.push(subscription);

    // 按优先级排序（优先级高的先执行）
    subscriptions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * 取消订阅
   */
  unsubscribe(eventType: string, handler: EventHandler): void {
    const subscriptions = this.subscriptions.get(eventType);
    if (!subscriptions) {
      return;
    }

    const index = subscriptions.findIndex((sub) => sub.handler === handler);
    if (index >= 0) {
      subscriptions.splice(index, 1);
    }

    // 如果没有订阅者了，删除事件类型
    if (subscriptions.length === 0) {
      this.subscriptions.delete(eventType);
    }
  }

  /**
   * 发布事件（异步）
   */
  async publish(event: DomainEvent): Promise<void> {
    const subscriptions = this.subscriptions.get(event.eventType);
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    // 并行处理所有订阅者
    const promises = subscriptions.map(async (subscription) => {
      try {
        await subscription.handler.handle(event);
      } catch (error) {
        console.error(
          `事件处理器处理事件 ${event.eventType} 时发生错误:`,
          error
        );
        // 可以在这里添加错误处理逻辑，比如发送到错误监控系统
      }
    });

    await Promise.all(promises);
  }

  /**
   * 发布事件（同步，加入队列）
   */
  publishSync(event: DomainEvent): void {
    this.eventQueue.push(event);
    this.processQueue();
  }

  /**
   * 批量发布事件
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    const promises = events.map((event) => this.publish(event));
    await Promise.all(promises);
  }

  /**
   * 处理事件队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        await this.publish(event);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 获取所有事件类型
   */
  getEventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * 获取事件订阅数量
   */
  getSubscriptionCount(eventType?: string): number {
    if (eventType) {
      const subscriptions = this.subscriptions.get(eventType);
      return subscriptions ? subscriptions.length : 0;
    }

    let total = 0;
    for (const subscriptions of this.subscriptions.values()) {
      total += subscriptions.length;
    }
    return total;
  }

  /**
   * 清除所有订阅（主要用于测试）
   */
  clear(): void {
    this.subscriptions.clear();
    this.eventQueue = [];
    this.isProcessing = false;
  }
}
