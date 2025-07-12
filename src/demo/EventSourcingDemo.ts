import { User, Product, Order, OrderItem } from "../domain/entities";
import {
  Money,
  Address,
  Email,
  ProductCategory,
} from "../domain/value-objects";
import { MemoryEventStore } from "../infrastructure/events/MemoryEventStore";
import { MemorySnapshotStore } from "../infrastructure/events/MemorySnapshotStore";
import { OrderEventSourcingRepository } from "../infrastructure/repositories/OrderEventSourcingRepository";
import { ProjectionManager } from "../infrastructure/events/ProjectionManager";
import { OrderSummaryProjection } from "../infrastructure/projections/OrderSummaryProjection";
import { EventReplayService } from "../infrastructure/events/EventReplayService";
import { EventBus } from "../infrastructure/events/EventBus";

/**
 * 事件溯源功能演示
 */
export class EventSourcingDemo {
  private eventStore: MemoryEventStore;
  private snapshotStore: MemorySnapshotStore;
  private orderRepository: OrderEventSourcingRepository;
  private projectionManager: ProjectionManager;
  private orderProjection: OrderSummaryProjection;
  private replayService: EventReplayService;
  private eventBus: EventBus;

  constructor() {
    this.eventStore = new MemoryEventStore();
    this.snapshotStore = new MemorySnapshotStore();
    this.orderRepository = new OrderEventSourcingRepository(
      this.eventStore,
      this.snapshotStore
    );
    this.projectionManager = new ProjectionManager(this.eventStore);
    this.orderProjection = new OrderSummaryProjection();
    this.eventBus = EventBus.getInstance();
    this.replayService = new EventReplayService(this.eventStore, this.eventBus);
  }

  /**
   * 运行事件溯源演示
   */
  async runDemo(): Promise<void> {
    console.log("⚡ 事件溯源(Event Sourcing)功能演示");
    console.log("=".repeat(70));

    try {
      // 1. 基础事件存储演示
      await this.demonstrateEventStore();

      // 2. 事件溯源仓储演示
      await this.demonstrateEventSourcingRepository();

      // 3. 快照功能演示
      await this.demonstrateSnapshots();

      // 4. 事件投影演示
      await this.demonstrateProjections();

      // 5. 事件重放演示
      await this.demonstrateEventReplay();

      // 6. 综合统计展示
      await this.showStatistics();

      console.log("\n🎉 事件溯源演示完成！");
      console.log("\n📚 事件溯源的优势:");
      console.log("   ✅ 完整的审计跟踪 - 所有变更都被记录");
      console.log("   ✅ 时间旅行 - 可以重建任何时点的状态");
      console.log("   ✅ 事件重放 - 可以重新处理历史事件");
      console.log("   ✅ CQRS支持 - 读写分离，优化查询性能");
      console.log("   ✅ 业务洞察 - 事件流提供业务分析数据");
      console.log("   ✅ 系统集成 - 事件可以驱动其他系统");
    } catch (error) {
      console.error("❌ 演示过程中发生错误:", error);
    }
  }

  /**
   * 演示事件存储功能
   */
  private async demonstrateEventStore(): Promise<void> {
    console.log("\n💾 1. 事件存储功能演示");
    console.log("-".repeat(50));

    // 创建测试订单
    const order = this.createTestOrder();

    // 模拟一些业务操作产生事件
    order.addItem(
      OrderItem.create("product-2", "测试商品2", 1, Money.fromYuan(299, "CNY"))
    );

    order.confirm();
    order.markAsPaid();

    const events = order.getUncommittedEvents();
    console.log(`📊 生成了 ${events.length} 个事件:`);
    events.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.eventType} - ${event.eventId}`);
    });

    // 保存事件到事件存储
    await this.eventStore.saveEvents(order.id, "order", events, -1, {
      source: "demo",
      userId: "demo-user",
    });

    order.markEventsAsCommitted();

    // 读取事件流
    const eventStream = await this.eventStore.getEventStream(order.id);
    console.log(`📖 从事件存储读取 ${eventStream.events.length} 个事件`);
    console.log(`📊 当前流版本: ${eventStream.version}`);
  }

  /**
   * 演示事件溯源仓储功能
   */
  private async demonstrateEventSourcingRepository(): Promise<void> {
    console.log("\n🏛️ 2. 事件溯源仓储功能演示");
    console.log("-".repeat(50));

    // 创建和保存订单
    const order = this.createTestOrder();
    order.addItem(
      OrderItem.create("product-3", "测试商品3", 2, Money.fromYuan(599, "CNY"))
    );

    await this.orderRepository.save(order);
    console.log(`💾 保存订单: ${order.id}`);

    // 从仓储加载订单
    const loadedOrder = await this.orderRepository.getById(order.id);
    if (loadedOrder) {
      console.log(`📖 成功从事件流重建订单: ${loadedOrder.orderNumber}`);
      console.log(`📊 订单状态: ${loadedOrder.status}`);
      console.log(`💰 订单金额: ${loadedOrder.totalAmount.toString()}`);
      console.log(`📦 订单项数量: ${loadedOrder.orderItems.length}`);
    }

    // 继续修改订单
    if (loadedOrder) {
      loadedOrder.confirm();
      loadedOrder.ship("TRACK-12345");
      await this.orderRepository.save(loadedOrder);
      console.log(`✅ 订单状态更新为: ${loadedOrder.status}`);
    }

    // 获取事件历史
    const eventHistory = await this.orderRepository.getEventHistory(order.id);
    console.log(`📜 订单事件历史 (${eventHistory.length} 个事件):`);
    eventHistory.forEach((event, index) => {
      console.log(
        `   ${index + 1}. ${
          event.eventType
        } - ${event.occurredOn.toISOString()}`
      );
    });
  }

  /**
   * 演示快照功能
   */
  private async demonstrateSnapshots(): Promise<void> {
    console.log("\n📸 3. 快照功能演示");
    console.log("-".repeat(50));

    // 创建一个订单并进行多次操作以触发快照
    const order = this.createTestOrder();

    // 添加多个订单项
    for (let i = 1; i <= 5; i++) {
      order.addItem(
        OrderItem.create(
          `product-${i}`,
          `商品${i}`,
          1,
          Money.fromYuan(100 * i, "CNY")
        )
      );
    }

    // 保存订单（这应该会创建快照）
    await this.orderRepository.save(order);

    // 检查快照统计
    const snapshotStats = await this.snapshotStore.getStatistics();
    console.log(`📊 快照统计:`, JSON.stringify(snapshotStats, null, 2));

    // 继续操作以演示快照的效果
    order.confirm();
    order.markAsPaid();
    await this.orderRepository.save(order);

    console.log(`✅ 快照功能正常工作`);
  }

  /**
   * 演示事件投影功能
   */
  private async demonstrateProjections(): Promise<void> {
    console.log("\n📊 4. 事件投影(CQRS读模型)演示");
    console.log("-".repeat(50));

    // 注册投影
    this.projectionManager.registerProjection(this.orderProjection);
    console.log(`📋 注册投影: ${this.orderProjection.projectionName}`);

    // 启动投影管理器
    this.projectionManager.start();
    console.log(`🚀 启动投影管理器`);

    // 等待投影处理完成
    await this.delay(2000);

    // 查询读模型
    const allOrders = await this.orderProjection.getAllOrderSummaries();
    console.log(`📊 读模型中的订单数量: ${allOrders.length}`);

    const statistics = await this.orderProjection.getStatistics();
    console.log(`📈 订单统计:`, JSON.stringify(statistics, null, 2));

    // 按状态查询
    const paidOrders = await this.orderProjection.getOrdersByStatus("PAID");
    console.log(`💳 已支付订单数量: ${paidOrders.length}`);

    // 分页查询
    const pagedResult = await this.orderProjection.getOrdersPaginated(1, 5);
    console.log(
      `📄 分页查询结果: ${pagedResult.orders.length}/${pagedResult.total}`
    );

    // 停止投影管理器
    this.projectionManager.stop();
    console.log(`⏹️ 停止投影管理器`);
  }

  /**
   * 演示事件重放功能
   */
  private async demonstrateEventReplay(): Promise<void> {
    console.log("\n🔄 5. 事件重放功能演示");
    console.log("-".repeat(50));

    // 获取重放统计信息
    const replayStats = await this.replayService.getReplayStatistics();
    console.log(`📊 重放统计:`, JSON.stringify(replayStats, null, 2));

    // 干运行模式
    const dryRunResult = await this.replayService.dryRun({
      eventTypes: ["OrderCreated", "OrderConfirmed"],
    });
    console.log(`🔍 干运行结果:`, JSON.stringify(dryRunResult, null, 2));

    // 实际重放特定类型的事件
    const replayResult = await this.replayService.replayEventsByType(
      ["OrderCreated"],
      new Date(Date.now() - 24 * 60 * 60 * 1000), // 最近24小时
      new Date()
    );
    console.log(`🔄 重放结果:`, JSON.stringify(replayResult, null, 2));
  }

  /**
   * 显示综合统计信息
   */
  private async showStatistics(): Promise<void> {
    console.log("\n📈 6. 综合统计信息");
    console.log("-".repeat(50));

    // 事件存储统计
    const eventStoreStats = await this.eventStore.getStatistics();
    console.log(`💾 事件存储统计:`, JSON.stringify(eventStoreStats, null, 2));

    // 快照存储统计
    const snapshotStats = await this.snapshotStore.getStatistics();
    console.log(`📸 快照存储统计:`, JSON.stringify(snapshotStats, null, 2));

    // 投影管理器统计
    const projectionStats = this.projectionManager.getStatistics();
    console.log(`📊 投影管理器统计:`, JSON.stringify(projectionStats, null, 2));

    // 投影健康检查
    const healthCheck = await this.projectionManager.checkHealth();
    console.log(`🏥 投影健康状态:`, JSON.stringify(healthCheck, null, 2));
  }

  /**
   * 创建测试订单
   */
  private createTestOrder(): Order {
    const shippingAddress = new Address({
      street: "测试街道123号",
      city: "北京",
      province: "北京",
      district: "朝阳区",
      country: "中国",
      postalCode: "100000",
    });

    const order = Order.create(
      "customer-1",
      shippingAddress,
      shippingAddress,
      `ORD-${Date.now()}`
    );

    // 添加一个初始订单项
    order.addItem(
      OrderItem.create("product-1", "测试商品1", 2, Money.fromYuan(199, "CNY"))
    );

    return order;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 运行事件溯源演示
 */
export async function runEventSourcingDemo(): Promise<void> {
  const demo = new EventSourcingDemo();
  await demo.runDemo();
}
