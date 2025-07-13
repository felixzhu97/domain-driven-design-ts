#!/usr/bin/env ts-node

// 独立的规约功能测试
import { runSimpleSpecificationDemo } from "./src/demo/SimpleSpecificationDemo";

async function main() {
  try {
    await runSimpleSpecificationDemo();
  } catch (error) {
    console.error("❌ 运行规约演示时发生错误:", error);
    process.exit(1);
  }
}

main();
