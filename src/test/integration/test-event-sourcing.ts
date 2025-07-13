#!/usr/bin/env ts-node

// 独立的事件溯源功能测试
import { runEventSourcingDemo } from "./src/demo/EventSourcingDemo";

async function main() {
  try {
    await runEventSourcingDemo();
  } catch (error) {
    console.error("❌ 运行事件溯源演示时发生错误:", error);
    process.exit(1);
  }
}

main();
