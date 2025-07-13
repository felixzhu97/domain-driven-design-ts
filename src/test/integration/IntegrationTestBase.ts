import { TestContainer } from "../infrastructure/TestContainer";
import { EventEmitter } from "events";

/**
 * 集成测试基类
 */
export abstract class IntegrationTestBase {
  protected container: TestContainer;
  protected eventBus: EventEmitter;
  private testStartTime: number = 0;
  private capturedEvents: any[] = [];

  constructor() {
    this.container = new TestContainer();
    this.eventBus = new EventEmitter();
  }

  /**
   * 测试设置
   */
  public async setup(): Promise<void> {
    this.testStartTime = Date.now();
    console.log(`🧪 开始测试: ${this.constructor.name}`);

    await this.container.initialize();
    this.eventBus = this.container.getEventBus();
    this.setupEventCapture();

    // 调用子类的设置方法
    await this.onSetup();
  }

  /**
   * 测试清理
   */
  public async teardown(): Promise<void> {
    await this.onTeardown();
    await this.container.cleanup();

    const duration = Date.now() - this.testStartTime;
    console.log(`✅ 测试完成: ${this.constructor.name} (${duration}ms)`);
  }

  /**
   * 子类可重写的设置方法
   */
  protected async onSetup(): Promise<void> {
    // 子类可重写
  }

  /**
   * 子类可重写的清理方法
   */
  protected async onTeardown(): Promise<void> {
    // 子类可重写
  }

  /**
   * 设置事件捕获
   */
  private setupEventCapture(): void {
    this.capturedEvents = [];

    // 捕获所有事件
    const originalEmit = this.eventBus.emit;
    this.eventBus.emit = (event: string, ...args: any[]) => {
      this.capturedEvents.push({
        event,
        args,
        timestamp: new Date(),
      });
      return originalEmit.call(this.eventBus, event, ...args);
    };
  }

  /**
   * 断言 - 事件已发布
   */
  protected assertEventPublished(eventName: string, expectedData?: any): void {
    const events = this.capturedEvents.filter((e) => e.event === eventName);

    if (events.length === 0) {
      throw new Error(`事件未发布: ${eventName}`);
    }

    if (expectedData) {
      const matchingEvents = events.filter((e) =>
        this.deepMatch(e.args[0], expectedData)
      );

      if (matchingEvents.length === 0) {
        throw new Error(
          `事件已发布但数据不匹配: ${eventName}\n` +
            `期望: ${JSON.stringify(expectedData)}\n` +
            `实际: ${JSON.stringify(events.map((e) => e.args[0]))}`
        );
      }
    }
  }

  /**
   * 断言 - 事件未发布
   */
  protected assertEventNotPublished(eventName: string): void {
    const events = this.capturedEvents.filter((e) => e.event === eventName);

    if (events.length > 0) {
      throw new Error(`不应发布的事件被发布了: ${eventName}`);
    }
  }

  /**
   * 断言 - 事件发布顺序
   */
  protected assertEventOrder(expectedOrder: string[]): void {
    const actualOrder = this.capturedEvents.map((e) => e.event);

    let lastIndex = -1;
    for (const expectedEvent of expectedOrder) {
      const index = actualOrder.findIndex(
        (event, i) => i > lastIndex && event === expectedEvent
      );

      if (index === -1) {
        throw new Error(
          `事件顺序不正确。期望: ${expectedOrder.join(" -> ")}\n` +
            `实际: ${actualOrder.join(" -> ")}`
        );
      }

      lastIndex = index;
    }
  }

  /**
   * 断言 - 深度匹配
   */
  protected assertDeepEqual(
    actual: any,
    expected: any,
    message?: string
  ): void {
    if (!this.deepMatch(actual, expected)) {
      const msg = message || "深度匹配失败";
      throw new Error(
        `${msg}\n期望: ${JSON.stringify(expected)}\n实际: ${JSON.stringify(
          actual
        )}`
      );
    }
  }

  /**
   * 断言 - 数组包含
   */
  protected assertArrayContains<T>(
    array: T[],
    item: T,
    message?: string
  ): void {
    if (!array.includes(item)) {
      const msg = message || `数组不包含预期项目`;
      throw new Error(`${msg}: ${JSON.stringify(item)}`);
    }
  }

  /**
   * 断言 - 数组长度
   */
  protected assertArrayLength<T>(
    array: T[],
    expectedLength: number,
    message?: string
  ): void {
    if (array.length !== expectedLength) {
      const msg = message || `数组长度不匹配`;
      throw new Error(`${msg}。期望: ${expectedLength}, 实际: ${array.length}`);
    }
  }

  /**
   * 断言 - 异步等待条件
   */
  protected async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    checkIntervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const result = await condition();
      if (result) {
        return;
      }
      await this.delay(checkIntervalMs);
    }

    throw new Error(`等待条件超时 (${timeoutMs}ms)`);
  }

  /**
   * 断言 - 异步等待事件
   */
  protected async waitForEvent(
    eventName: string,
    timeoutMs: number = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.eventBus.removeListener(eventName, handler);
        reject(new Error(`等待事件超时: ${eventName} (${timeoutMs}ms)`));
      }, timeoutMs);

      const handler = (data: any) => {
        clearTimeout(timer);
        this.eventBus.removeListener(eventName, handler);
        resolve(data);
      };

      this.eventBus.once(eventName, handler);
    });
  }

  /**
   * 获取捕获的事件
   */
  protected getCapturedEvents(): any[] {
    return [...this.capturedEvents];
  }

  /**
   * 清空捕获的事件
   */
  protected clearCapturedEvents(): void {
    this.capturedEvents = [];
  }

  /**
   * 延迟方法
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 深度匹配工具方法
   */
  private deepMatch(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (obj1 == null || obj2 == null) return false;

    if (typeof obj1 !== typeof obj2) return false;

    if (typeof obj1 !== "object") return obj1 === obj2;

    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepMatch(obj1[key], obj2[key])) return false;
    }

    return true;
  }

  /**
   * 生成测试数据
   */
  protected generateTestData(): any {
    const factory = this.container.get<any>("TestDataFactory");
    return factory;
  }

  /**
   * 获取服务实例
   */
  protected getService<T>(serviceKey: string): T {
    return this.container.get<T>(serviceKey);
  }

  /**
   * 打印测试信息
   */
  protected log(message: string): void {
    console.log(`   📝 ${message}`);
  }

  /**
   * 打印警告信息
   */
  protected warn(message: string): void {
    console.warn(`   ⚠️  ${message}`);
  }

  /**
   * 打印错误信息
   */
  protected error(message: string): void {
    console.error(`   ❌ ${message}`);
  }
}

/**
 * 测试运行器
 */
export class TestRunner {
  private tests: IntegrationTestBase[] = [];
  private results: TestResult[] = [];

  /**
   * 添加测试
   */
  public addTest(test: IntegrationTestBase): void {
    this.tests.push(test);
  }

  /**
   * 运行所有测试
   */
  public async runAll(): Promise<TestSummary> {
    console.log(`🚀 开始运行 ${this.tests.length} 个集成测试`);
    console.log("=".repeat(50));

    this.results = [];
    const startTime = Date.now();

    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i];
      const result = await this.runSingleTest(test, i + 1);
      this.results.push(result);
    }

    const endTime = Date.now();
    const summary = this.generateSummary(startTime, endTime);
    this.printSummary(summary);

    return summary;
  }

  /**
   * 运行单个测试
   */
  private async runSingleTest(
    test: IntegrationTestBase,
    index: number
  ): Promise<TestResult> {
    const testName = test.constructor.name;
    console.log(`\n🧪 [${index}] 运行测试: ${testName}`);

    const startTime = Date.now();
    let success = false;
    let error: Error | null = null;

    try {
      await test.setup();
      await (test as any).run(); // 调用测试的run方法
      await test.teardown();
      success = true;
      console.log(`   ✅ 测试通过: ${testName}`);
    } catch (err) {
      error = err as Error;
      console.error(`   ❌ 测试失败: ${testName}`);
      console.error(`   错误: ${error.message}`);

      try {
        await test.teardown();
      } catch (teardownError) {
        console.error(`   清理错误: ${(teardownError as Error).message}`);
      }
    }

    const endTime = Date.now();

    return {
      testName,
      success,
      error,
      duration: endTime - startTime,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    };
  }

  /**
   * 生成摘要
   */
  private generateSummary(startTime: number, endTime: number): TestSummary {
    const passed = this.results.filter((r) => r.success).length;
    const failed = this.results.filter((r) => !r.success).length;
    const totalDuration = endTime - startTime;

    return {
      total: this.results.length,
      passed,
      failed,
      successRate:
        this.results.length > 0 ? (passed / this.results.length) * 100 : 0,
      totalDuration,
      results: this.results,
    };
  }

  /**
   * 打印摘要
   */
  private printSummary(summary: TestSummary): void {
    console.log("\n" + "=".repeat(50));
    console.log("📊 测试摘要");
    console.log("-".repeat(30));
    console.log(`总测试数: ${summary.total}`);
    console.log(`通过: ${summary.passed} ✅`);
    console.log(`失败: ${summary.failed} ❌`);
    console.log(`成功率: ${summary.successRate.toFixed(1)}%`);
    console.log(`总时间: ${summary.totalDuration}ms`);

    if (summary.failed > 0) {
      console.log("\n❌ 失败的测试:");
      summary.results
        .filter((r) => !r.success)
        .forEach((result) => {
          console.log(`   - ${result.testName}: ${result.error?.message}`);
        });
    }

    console.log("\n🎉 集成测试完成!");
  }
}

/**
 * 测试结果接口
 */
export interface TestResult {
  testName: string;
  success: boolean;
  error: Error | null;
  duration: number;
  startTime: Date;
  endTime: Date;
}

/**
 * 测试摘要接口
 */
export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
  totalDuration: number;
  results: TestResult[];
}
