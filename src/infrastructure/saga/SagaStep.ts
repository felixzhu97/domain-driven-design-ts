import {
  ISagaStep,
  SagaContext,
  SagaStepResult,
} from "../../shared/types/Saga";

/**
 * Saga步骤抽象基类
 */
export abstract class SagaStep implements ISagaStep {
  public abstract readonly stepName: string;
  public abstract readonly description?: string;

  /**
   * 执行步骤
   */
  public abstract execute(context: SagaContext): Promise<SagaStepResult>;

  /**
   * 补偿步骤
   */
  public abstract compensate(context: SagaContext): Promise<SagaStepResult>;

  /**
   * 是否可以跳过
   */
  public async canSkip(context: SagaContext): Promise<boolean> {
    return false;
  }

  /**
   * 是否可以重试
   */
  public async canRetry(context: SagaContext): Promise<boolean> {
    return context.retryCount < context.maxRetries;
  }

  /**
   * 获取重试延迟（毫秒）
   */
  public getRetryDelay(attempt: number): number {
    // 指数退避算法
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }

  /**
   * 执行步骤的安全包装
   */
  public async safeExecute(context: SagaContext): Promise<SagaStepResult> {
    try {
      console.log(
        `🔄 执行Saga步骤: ${this.stepName} (Saga: ${context.sagaId})`
      );

      const result = await this.execute(context);

      if (result.success) {
        console.log(`✅ 步骤执行成功: ${this.stepName}`);
      } else {
        console.log(`❌ 步骤执行失败: ${this.stepName} - ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`💥 步骤执行异常: ${this.stepName}`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 补偿步骤的安全包装
   */
  public async safeCompensate(context: SagaContext): Promise<SagaStepResult> {
    try {
      console.log(
        `🔄 补偿Saga步骤: ${this.stepName} (Saga: ${context.sagaId})`
      );

      const result = await this.compensate(context);

      if (result.success) {
        console.log(`✅ 步骤补偿成功: ${this.stepName}`);
      } else {
        console.log(`❌ 步骤补偿失败: ${this.stepName} - ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`💥 步骤补偿异常: ${this.stepName}`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 记录步骤执行日志
   */
  protected log(
    message: string,
    level: "info" | "warn" | "error" = "info"
  ): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.stepName}] ${message}`;

    switch (level) {
      case "warn":
        console.warn(logMessage);
        break;
      case "error":
        console.error(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  /**
   * 从上下文获取数据
   */
  protected getData<T>(context: SagaContext, key: string, defaultValue?: T): T {
    return context.data[key] ?? defaultValue;
  }

  /**
   * 设置数据到上下文
   */
  protected setData(context: SagaContext, key: string, value: any): void {
    context.data[key] = value;
  }

  /**
   * 获取步骤结果
   */
  protected getStepResult(
    context: SagaContext,
    stepName: string
  ): SagaStepResult | undefined {
    return context.stepResults[stepName];
  }

  /**
   * 设置步骤结果
   */
  protected setStepResult(
    context: SagaContext,
    stepName: string,
    result: SagaStepResult
  ): void {
    context.stepResults[stepName] = result;
  }

  /**
   * 检查依赖步骤是否完成
   */
  protected checkDependencies(
    context: SagaContext,
    dependencies: string[]
  ): boolean {
    return dependencies.every((dep) => {
      const result = this.getStepResult(context, dep);
      return result && result.success;
    });
  }

  /**
   * 模拟异步操作
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 生成唯一ID
   */
  protected generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
