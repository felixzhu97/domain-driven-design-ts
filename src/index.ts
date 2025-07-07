// 领域驱动设计 TypeScript 完整示例
// 主入口文件

// 导出所有领域层组件
export * from "./domain/value-objects";
export * from "./domain/entities";
export * from "./domain/events";
export * from "./domain/services";
export * from "./domain/repositories";

// 导出共享类型
export * from "./shared/types";

// 演示函数
import { DemoService } from "./demo";

export { DemoService };

console.log("🚀 领域驱动设计 TypeScript 完整案例已加载");
console.log("📚 包含以下核心概念:");
console.log(
  "  - 值对象 (Value Objects): Email, Money, Address, ProductCategory"
);
console.log("  - 实体 (Entities): User, Product, Order, OrderItem");
console.log("  - 聚合根 (Aggregate Roots): User, Product, Order");
console.log("  - 领域事件 (Domain Events): 用户、商品、订单相关事件");
console.log(
  "  - 领域服务 (Domain Services): OrderService, InventoryService, PriceCalculationService, UserRegistrationService"
);
console.log("  - 仓储接口 (Repository Interfaces): 数据访问抽象层");
console.log("");
console.log("💡 运行演示: DemoService.runDemo()");

// 显式导出避免命名冲突
export { EntityId, DomainEvent } from "./shared/types";

// 基础类型
export { ValueObject } from "./domain/value-objects/ValueObject";
export { Entity } from "./domain/entities/Entity";
export { AggregateRoot } from "./domain/entities/AggregateRoot";

// 值对象
export { Email, Money, Address, ProductCategory } from "./domain/value-objects";

// 实体
export { User, Product, Order, OrderItem } from "./domain/entities";

// 事件
export * from "./domain/events";

// 领域服务
export * from "./domain/services";

// 仓储接口
export * from "./domain/repositories";

// 工具类
export * from "./shared/utils/IdGenerator";

// 演示
export * from "./demo";

import { runCompleteDDDDemo } from "./demo/CompleteDemoService";
import { ApiDemo } from "./presentation/demo/ApiDemo";

/**
 * 主程序入口
 */
async function main(): Promise<void> {
  console.log("🎉 欢迎使用 TypeScript 领域驱动设计 (DDD) 完整示例项目！\n");

  try {
    // 运行完整的DDD业务流程演示
    await runCompleteDDDDemo();

    console.log("\n" + "=".repeat(60));
    console.log("🎮 API 控制器演示\n");

    // 运行API演示
    const apiDemo = new ApiDemo();
    await apiDemo.runDemo();

    console.log("\n" + "=".repeat(60));
    console.log("🎊 所有演示完成！");
    console.log("📚 您已经看到了一个完整的 DDD TypeScript 项目的实现");
    console.log("🚀 可以基于此项目开始您自己的 DDD 实践");
  } catch (error) {
    console.error("❌ 程序执行失败:", error);
    process.exit(1);
  }
}

// 运行主程序
if (require.main === module) {
  main().catch(console.error);
}

export { main };
