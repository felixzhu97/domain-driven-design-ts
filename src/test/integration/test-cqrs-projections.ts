import { runCQRSProjectionDemo } from "./src/demo/CQRSProjectionDemo";

/**
 * 测试CQRS投影功能
 */
async function main() {
  console.log("🎯 开始测试CQRS投影功能...\n");

  try {
    await runCQRSProjectionDemo();
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error);
    process.exit(1);
  }
}

main();
