import { runSagaDemo } from "./src/demo/SagaDemo";

/**
 * 测试Saga功能
 */
async function main() {
  console.log("🎯 开始测试Saga功能...\n");

  try {
    await runSagaDemo();
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error);
    process.exit(1);
  }
}

main();
