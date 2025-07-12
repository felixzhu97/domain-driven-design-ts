/**
 * 领域工厂模式测试脚本
 * 测试和演示领域工厂模式的各种功能
 */

import { DomainFactoryDemo } from "./src/demo/DomainFactoryDemo";

async function main() {
  console.log("🏭 领域工厂模式演示测试");
  console.log("=========================\n");

  try {
    // 运行完整的工厂演示
    await DomainFactoryDemo.runDemo();

    console.log("\n🎉 所有演示测试完成！");
    console.log("\n📋 演示内容总结:");
    console.log("- ✅ 工厂注册器：统一管理所有工厂实例");
    console.log("- ✅ 用户工厂：封装用户聚合创建逻辑");
    console.log("- ✅ 产品工厂：处理复杂产品创建和验证");
    console.log("- ✅ 订单工厂：管理多商品订单的创建流程");
    console.log("- ✅ 事件溯源：从事件序列重建聚合状态");
    console.log("- ✅ 快照恢复：从快照数据快速恢复聚合");
    console.log("- ✅ 数据验证：确保创建数据的完整性和正确性");
    console.log("- ✅ 工厂定位器：提供便捷的工厂访问接口");

    console.log("\n🏗️ 领域工厂模式特点:");
    console.log("- 封装复杂的对象创建逻辑");
    console.log("- 确保聚合根的业务不变性");
    console.log("- 支持多种创建方式（数据、事件、快照）");
    console.log("- 提供完整的数据验证机制");
    console.log("- 支持工厂的注册和依赖管理");
    console.log("- 实现工厂的生命周期管理");
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error);
    console.error("\n堆栈信息:", (error as Error).stack);
    process.exit(1);
  }
}

// 运行测试
main().catch((error) => {
  console.error("❌ 程序启动失败:", error);
  process.exit(1);
});
