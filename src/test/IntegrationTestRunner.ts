import { TestRunner } from "./integration/IntegrationTestBase";
import { DomainLayerIntegrationTest } from "./integration/DomainLayerIntegrationTest";
import { ApplicationLayerIntegrationTest } from "./integration/ApplicationLayerIntegrationTest";
import { EndToEndIntegrationTest } from "./integration/EndToEndIntegrationTest";

/**
 * 集成测试运行器 - 统一管理和运行所有集成测试
 */
export class IntegrationTestRunner {
  private testRunner: TestRunner;

  constructor() {
    this.testRunner = new TestRunner();
    this.setupTests();
  }

  /**
   * 设置测试套件
   */
  private setupTests(): void {
    console.log("🔧 设置集成测试套件...");

    // 添加领域层集成测试
    this.testRunner.addTest(new DomainLayerIntegrationTest());

    // 添加应用层集成测试
    this.testRunner.addTest(new ApplicationLayerIntegrationTest());

    // 添加端到端集成测试
    this.testRunner.addTest(new EndToEndIntegrationTest());

    console.log("✅ 测试套件设置完成");
  }

  /**
   * 运行所有集成测试
   */
  public async runAllTests(): Promise<TestExecutionReport> {
    console.log("🚀 开始运行DDD架构集成测试套件");
    console.log("=".repeat(60));

    const startTime = Date.now();

    try {
      // 运行所有测试
      const summary = await this.testRunner.runAll();

      const endTime = Date.now();
      const report = this.generateReport(summary, startTime, endTime);

      this.printDetailedReport(report);

      return report;
    } catch (error) {
      console.error("❌ 测试运行过程中发生错误:", error);
      throw error;
    }
  }

  /**
   * 运行特定类型的测试
   */
  public async runTestByType(testType: TestType): Promise<void> {
    console.log(`🎯 运行 ${testType} 测试`);

    const testRunner = new TestRunner();

    switch (testType) {
      case TestType.DOMAIN:
        testRunner.addTest(new DomainLayerIntegrationTest());
        break;
      case TestType.APPLICATION:
        testRunner.addTest(new ApplicationLayerIntegrationTest());
        break;
      case TestType.END_TO_END:
        testRunner.addTest(new EndToEndIntegrationTest());
        break;
      default:
        throw new Error(`未知的测试类型: ${testType}`);
    }

    await testRunner.runAll();
  }

  /**
   * 生成详细报告
   */
  private generateReport(
    summary: any,
    startTime: number,
    endTime: number
  ): TestExecutionReport {
    const report: TestExecutionReport = {
      summary: {
        totalTests: summary.total,
        passedTests: summary.passed,
        failedTests: summary.failed,
        successRate: summary.successRate,
        totalDuration: endTime - startTime,
        executionDate: new Date(startTime),
      },
      testResults: summary.results.map((result: any) => ({
        testName: result.testName,
        testType: this.getTestType(result.testName),
        status: result.success ? TestStatus.PASSED : TestStatus.FAILED,
        duration: result.duration,
        startTime: result.startTime,
        endTime: result.endTime,
        errorMessage: result.error?.message,
        errorStack: result.error?.stack,
      })),
      metrics: this.calculateMetrics(summary.results),
      recommendations: this.generateRecommendations(summary),
    };

    return report;
  }

  /**
   * 获取测试类型
   */
  private getTestType(testName: string): TestType {
    if (testName.includes("Domain")) return TestType.DOMAIN;
    if (testName.includes("Application")) return TestType.APPLICATION;
    if (testName.includes("EndToEnd")) return TestType.END_TO_END;
    return TestType.UNKNOWN;
  }

  /**
   * 计算测试指标
   */
  private calculateMetrics(results: any[]): TestMetrics {
    const durations = results.map((r) => r.duration);

    return {
      averageDuration:
        durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      testsPerSecond:
        results.length / (durations.reduce((sum, d) => sum + d, 0) / 1000),
      memoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): MemoryUsage {
    const memUsage = process.memoryUsage();
    return {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.successRate < 100) {
      recommendations.push("存在失败的测试，建议检查失败原因并修复");
    }

    if (summary.successRate < 80) {
      recommendations.push("成功率过低，建议全面检查DDD架构实现");
    }

    const avgDuration =
      summary.results.reduce((sum: number, r: any) => sum + r.duration, 0) /
      summary.results.length;
    if (avgDuration > 5000) {
      recommendations.push("测试执行时间较长，建议优化测试性能");
    }

    if (summary.successRate === 100) {
      recommendations.push("所有测试通过！DDD架构实现质量良好");
      recommendations.push("建议定期运行集成测试以确保代码质量");
    }

    return recommendations;
  }

  /**
   * 打印详细报告
   */
  private printDetailedReport(report: TestExecutionReport): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 DDD架构集成测试详细报告");
    console.log("=".repeat(60));

    // 总体摘要
    console.log("\n📋 测试摘要:");
    console.log(`   总测试数: ${report.summary.totalTests}`);
    console.log(`   通过: ${report.summary.passedTests} ✅`);
    console.log(`   失败: ${report.summary.failedTests} ❌`);
    console.log(`   成功率: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`   总耗时: ${report.summary.totalDuration}ms`);
    console.log(`   执行时间: ${report.summary.executionDate.toISOString()}`);

    // 分类统计
    console.log("\n📈 分类统计:");
    const typeStats = this.getTypeStatistics(report.testResults);
    Object.entries(typeStats).forEach(([type, stats]) => {
      console.log(`   ${type}: ${stats.passed}/${stats.total} 通过`);
    });

    // 性能指标
    console.log("\n⚡ 性能指标:");
    console.log(`   平均耗时: ${report.metrics.averageDuration.toFixed(0)}ms`);
    console.log(`   最快测试: ${report.metrics.minDuration}ms`);
    console.log(`   最慢测试: ${report.metrics.maxDuration}ms`);
    console.log(
      `   测试速度: ${report.metrics.testsPerSecond.toFixed(2)} 测试/秒`
    );

    // 内存使用
    console.log("\n💾 内存使用:");
    console.log(`   RSS: ${report.metrics.memoryUsage.rss}MB`);
    console.log(
      `   堆内存: ${report.metrics.memoryUsage.heapUsed}/${report.metrics.memoryUsage.heapTotal}MB`
    );

    // 失败的测试
    const failedTests = report.testResults.filter(
      (t) => t.status === TestStatus.FAILED
    );
    if (failedTests.length > 0) {
      console.log("\n❌ 失败的测试:");
      failedTests.forEach((test) => {
        console.log(`   - ${test.testName}: ${test.errorMessage}`);
      });
    }

    // 建议
    if (report.recommendations.length > 0) {
      console.log("\n💡 建议:");
      report.recommendations.forEach((rec) => {
        console.log(`   • ${rec}`);
      });
    }

    // DDD架构质量评估
    console.log("\n🏗️ DDD架构质量评估:");
    this.printArchitectureAssessment(report);

    console.log("\n" + "=".repeat(60));
  }

  /**
   * 获取类型统计
   */
  private getTypeStatistics(results: TestResult[]): Record<string, TypeStats> {
    const stats: Record<string, TypeStats> = {};

    results.forEach((result) => {
      const type = result.testType;
      if (!stats[type]) {
        stats[type] = { total: 0, passed: 0, failed: 0 };
      }

      stats[type].total++;
      if (result.status === TestStatus.PASSED) {
        stats[type].passed++;
      } else {
        stats[type].failed++;
      }
    });

    return stats;
  }

  /**
   * 打印架构评估
   */
  private printArchitectureAssessment(report: TestExecutionReport): void {
    const score = this.calculateArchitectureScore(report);

    console.log(`   架构质量分数: ${score}/100`);

    if (score >= 90) {
      console.log(`   评级: 🌟 优秀 - DDD架构实现非常优秀`);
    } else if (score >= 80) {
      console.log(`   评级: ⭐ 良好 - DDD架构实现良好，有改进空间`);
    } else if (score >= 70) {
      console.log(`   评级: ⚠️  一般 - DDD架构实现基本可用，需要改进`);
    } else {
      console.log(`   评级: ❌ 需要改进 - DDD架构实现存在重大问题`);
    }

    // 各层评估
    const layerScores = this.calculateLayerScores(report);
    console.log(`\n   分层评估:`);
    console.log(`     领域层: ${layerScores.domain}/100`);
    console.log(`     应用层: ${layerScores.application}/100`);
    console.log(`     集成层: ${layerScores.integration}/100`);
  }

  /**
   * 计算架构分数
   */
  private calculateArchitectureScore(report: TestExecutionReport): number {
    const successRateScore = report.summary.successRate;
    const performanceScore = this.calculatePerformanceScore(report.metrics);

    return Math.round(successRateScore * 0.7 + performanceScore * 0.3);
  }

  /**
   * 计算性能分数
   */
  private calculatePerformanceScore(metrics: TestMetrics): number {
    // 基于平均执行时间计算性能分数
    const avgDuration = metrics.averageDuration;

    if (avgDuration <= 1000) return 100;
    if (avgDuration <= 2000) return 90;
    if (avgDuration <= 3000) return 80;
    if (avgDuration <= 5000) return 70;
    return 60;
  }

  /**
   * 计算各层分数
   */
  private calculateLayerScores(report: TestExecutionReport): LayerScores {
    const typeStats = this.getTypeStatistics(report.testResults);

    return {
      domain: this.calculateLayerScore(typeStats[TestType.DOMAIN]),
      application: this.calculateLayerScore(typeStats[TestType.APPLICATION]),
      integration: this.calculateLayerScore(typeStats[TestType.END_TO_END]),
    };
  }

  /**
   * 计算单层分数
   */
  private calculateLayerScore(stats?: TypeStats): number {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.passed / stats.total) * 100);
  }
}

/**
 * 测试类型枚举
 */
export enum TestType {
  DOMAIN = "领域层",
  APPLICATION = "应用层",
  END_TO_END = "端到端",
  UNKNOWN = "未知",
}

/**
 * 测试状态枚举
 */
export enum TestStatus {
  PASSED = "PASSED",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

/**
 * 测试执行报告接口
 */
export interface TestExecutionReport {
  summary: TestSummary;
  testResults: TestResult[];
  metrics: TestMetrics;
  recommendations: string[];
}

/**
 * 测试摘要接口
 */
export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  totalDuration: number;
  executionDate: Date;
}

/**
 * 测试结果接口
 */
export interface TestResult {
  testName: string;
  testType: TestType;
  status: TestStatus;
  duration: number;
  startTime: Date;
  endTime: Date;
  errorMessage?: string;
  errorStack?: string;
}

/**
 * 测试指标接口
 */
export interface TestMetrics {
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  totalDuration: number;
  testsPerSecond: number;
  memoryUsage: MemoryUsage;
}

/**
 * 内存使用接口
 */
export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
}

/**
 * 类型统计接口
 */
interface TypeStats {
  total: number;
  passed: number;
  failed: number;
}

/**
 * 分层分数接口
 */
interface LayerScores {
  domain: number;
  application: number;
  integration: number;
}

/**
 * 运行集成测试的便捷函数
 */
export async function runIntegrationTests(): Promise<TestExecutionReport> {
  const runner = new IntegrationTestRunner();
  return await runner.runAllTests();
}

/**
 * 运行特定类型测试的便捷函数
 */
export async function runTestByType(testType: TestType): Promise<void> {
  const runner = new IntegrationTestRunner();
  return await runner.runTestByType(testType);
}
