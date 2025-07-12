/**
 * 增强错误处理模式演示
 * 展示领域错误、应用错误、错误恢复机制和错误映射功能
 */

import {
  DomainError,
  BusinessRuleError,
  ValidationError,
  AggregateNotFoundError,
  ConcurrencyConflictError,
  PermissionError,
  ExternalServiceError,
  InfrastructureError,
  ErrorSeverity,
  ErrorCategory,
} from "../shared/errors/DomainError";

import {
  ApplicationError,
  CommandHandlingError,
  QueryHandlingError,
  ApplicationServiceError,
  ConfigurationError,
  SerializationError,
  MappingError,
  AuthorizationError,
  AuthenticationError,
  DuplicateOperationError,
} from "../shared/errors/ApplicationError";

import {
  ErrorHandler,
  DefaultErrorHandlingStrategy,
  DomainErrorHandlingStrategy,
  DefaultErrorMapper,
  globalErrorHandler,
} from "../shared/errors/ErrorHandler";

import {
  ErrorRecoveryManager,
  FallbackValueStrategy,
  CacheRecoveryStrategy,
  DegradedServiceStrategy,
  CompensationStrategy,
  PredefinedCompensationActions,
} from "../shared/errors/ErrorRecovery";

/**
 * 增强错误处理演示服务
 */
export class ErrorHandlingDemo {
  private readonly errorHandler: ErrorHandler;
  private readonly recoveryManager: ErrorRecoveryManager;
  private readonly cache = new Map<
    string,
    { value: unknown; timestamp: number; ttl: number }
  >();

  constructor() {
    this.errorHandler = new ErrorHandler();
    this.recoveryManager = new ErrorRecoveryManager();
    this.setupRecoveryStrategies();
  }

  /**
   * 运行完整演示
   */
  public static async runDemo(): Promise<void> {
    console.log("🔧 增强错误处理模式演示开始\n");

    try {
      const demo = new ErrorHandlingDemo();

      // 1. 领域错误演示
      await demo.demonstrateDomainErrors();

      // 2. 应用错误演示
      await demo.demonstrateApplicationErrors();

      // 3. 错误处理策略演示
      await demo.demonstrateErrorHandlingStrategies();

      // 4. 错误映射演示
      await demo.demonstrateErrorMapping();

      // 5. 错误恢复机制演示
      await demo.demonstrateErrorRecovery();

      // 6. 重试机制演示
      await demo.demonstrateRetryMechanism();

      // 7. 补偿机制演示
      await demo.demonstrateCompensationMechanism();

      // 8. 集成演示
      await demo.demonstrateIntegratedErrorHandling();

      console.log("\n✅ 增强错误处理模式演示完成");
    } catch (error) {
      console.error("❌ 演示过程中发生错误:", error);
    }
  }

  /**
   * 演示领域错误
   */
  private async demonstrateDomainErrors(): Promise<void> {
    console.log("🏗️ 1. 领域错误演示");
    console.log("===============");

    // 业务规则错误
    const businessRuleError = new BusinessRuleError(
      "用户年龄必须大于18岁才能创建账户",
      "USER_AGE_RESTRICTION",
      { age: 16, minAge: 18 },
      { operation: "createAccount", userId: "user-123" }
    );
    this.displayError("业务规则错误", businessRuleError);

    // 验证错误
    const validationError = new ValidationError("用户输入验证失败", {
      email: ["邮箱格式不正确"],
      password: ["密码长度至少8位", "密码必须包含特殊字符"],
      phone: ["手机号格式不正确"],
    });
    this.displayError("验证错误", validationError);

    // 聚合未找到错误
    const notFoundError = new AggregateNotFoundError(
      "User",
      "user-456",
      { searchAttempts: 3 },
      { operation: "getUserById", requestId: "req-789" }
    );
    this.displayError("聚合未找到错误", notFoundError);

    // 并发冲突错误
    const concurrencyError = new ConcurrencyConflictError(
      "Order",
      "order-789",
      5,
      7,
      { conflictField: "status" },
      { operation: "updateOrderStatus", userId: "user-123" }
    );
    this.displayError("并发冲突错误", concurrencyError);

    // 权限错误
    const permissionError = new PermissionError(
      "deleteUser",
      "User:user-456",
      "user-123",
      { requiredRole: "admin", userRole: "user" }
    );
    this.displayError("权限错误", permissionError);

    // 外部服务错误
    const externalServiceError = new ExternalServiceError(
      "PaymentService",
      "processPayment",
      "Connection timeout",
      new Error("Socket timeout"),
      { paymentId: "pay-123", amount: 199.99 }
    );
    this.displayError("外部服务错误", externalServiceError);

    console.log("");
  }

  /**
   * 演示应用错误
   */
  private async demonstrateApplicationErrors(): Promise<void> {
    console.log("📱 2. 应用错误演示");
    console.log("===============");

    // 命令处理错误
    const commandError = new CommandHandlingError(
      "CreateUserCommand",
      "Invalid command payload",
      new Error("Missing required field"),
      { commandId: "cmd-123" }
    );
    this.displayError("命令处理错误", commandError);

    // 查询处理错误
    const queryError = new QueryHandlingError(
      "GetUserQuery",
      "Database connection failed",
      new Error("Connection refused"),
      { queryId: "query-456" }
    );
    this.displayError("查询处理错误", queryError);

    // 应用服务错误
    const serviceError = new ApplicationServiceError(
      "UserService",
      "registerUser",
      "Email already exists",
      undefined,
      { email: "test@example.com" }
    );
    this.displayError("应用服务错误", serviceError);

    // 配置错误
    const configError = new ConfigurationError(
      "database.connectionString",
      "Configuration value is missing",
      { configSource: "environment" }
    );
    this.displayError("配置错误", configError);

    // 序列化错误
    const serializationError = new SerializationError(
      "UserDto",
      "serialize",
      "Circular reference detected",
      new Error("Converting circular structure to JSON")
    );
    this.displayError("序列化错误", serializationError);

    console.log("");
  }

  /**
   * 演示错误处理策略
   */
  private async demonstrateErrorHandlingStrategies(): Promise<void> {
    console.log("🎯 3. 错误处理策略演示");
    console.log("==================");

    const testErrors = [
      new ValidationError("验证失败"),
      new ConcurrencyConflictError("Order", "order-123", 1, 2),
      new ExternalServiceError("PaymentService", "charge", "Timeout"),
      new Error("未知错误"),
    ];

    for (const error of testErrors) {
      const result = this.errorHandler.handle(error, { demoContext: true });
      console.log(`错误类型: ${error.constructor.name}`);
      console.log(`- 恢复操作: ${result.recoveryAction}`);
      console.log(`- 应该重试: ${result.shouldRetry}`);
      console.log(`- 重试延迟: ${result.retryDelay}ms`);
      console.log(`- 元数据: ${JSON.stringify(result.metadata, null, 2)}`);
      console.log("");
    }
  }

  /**
   * 演示错误映射
   */
  private async demonstrateErrorMapping(): Promise<void> {
    console.log("🗺️ 4. 错误映射演示");
    console.log("===============");

    const testErrors = [
      new ValidationError("验证失败"),
      new BusinessRuleError("业务规则违反"),
      new AggregateNotFoundError("User", "user-123"),
      new PermissionError("delete", "resource", "user-123"),
      new ExternalServiceError(
        "PaymentService",
        "charge",
        "Service unavailable"
      ),
      new ApplicationServiceError("UserService", "create", "Internal error"),
    ];

    for (const error of testErrors) {
      const httpResponse = this.errorHandler.mapToHttpResponse(error);
      console.log(`错误: ${error.constructor.name}`);
      console.log(`- HTTP状态码: ${httpResponse.status}`);
      console.log(`- 日志级别: ${httpResponse.logLevel}`);
      console.log(`- 响应体: ${JSON.stringify(httpResponse.body, null, 2)}`);
      console.log("");
    }
  }

  /**
   * 演示错误恢复机制
   */
  private async demonstrateErrorRecovery(): Promise<void> {
    console.log("🔄 5. 错误恢复机制演示");
    console.log("==================");

    // 测试回退值恢复
    const validationError = new ValidationError("输入验证失败");
    const fallbackResult = await this.recoveryManager.recover<string>(
      validationError,
      { userId: "user-123" }
    );

    if (fallbackResult) {
      console.log("回退值恢复:");
      console.log(`- 成功: ${fallbackResult.success}`);
      console.log(`- 数据: ${fallbackResult.data}`);
      console.log(`- 策略: ${fallbackResult.strategyUsed}`);
      console.log(`- 执行时间: ${fallbackResult.executionTime}ms`);
    }

    // 测试缓存恢复
    this.setupCacheData();
    const serviceError = new ExternalServiceError(
      "UserService",
      "getUser",
      "Service unavailable"
    );
    const cacheResult = await this.recoveryManager.recover<any>(serviceError, {
      userId: "user-123",
      operation: "getUser",
    });

    if (cacheResult) {
      console.log("\n缓存恢复:");
      console.log(`- 成功: ${cacheResult.success}`);
      console.log(`- 数据: ${JSON.stringify(cacheResult.data)}`);
      console.log(`- 策略: ${cacheResult.strategyUsed}`);
      console.log(`- 元数据: ${JSON.stringify(cacheResult.metadata, null, 2)}`);
    }

    console.log("");
  }

  /**
   * 演示重试机制
   */
  private async demonstrateRetryMechanism(): Promise<void> {
    console.log("🔁 6. 重试机制演示");
    console.log("===============");

    let attemptCount = 0;

    // 模拟会失败几次然后成功的操作
    const flakeyOperation = async (): Promise<string> => {
      attemptCount++;
      console.log(`尝试执行操作 - 第${attemptCount}次`);

      if (attemptCount < 3) {
        throw new ExternalServiceError(
          "FlakeyService",
          "getData",
          `Temporary failure (attempt ${attemptCount})`
        );
      }

      return `操作成功！(第${attemptCount}次尝试)`;
    };

    console.log("开始重试演示...");
    const result = await this.errorHandler.executeWithRetry(flakeyOperation, {
      operationType: "getData",
    });

    console.log("\n重试结果:");
    console.log(`- 成功: ${result.success}`);
    console.log(`- 数据: ${result.data}`);
    console.log(`- 总尝试次数: ${result.metadata?.attemptCount}`);

    if (result.error) {
      console.log(`- 最终错误: ${result.error.message}`);
    }

    console.log("");
  }

  /**
   * 演示补偿机制
   */
  private async demonstrateCompensationMechanism(): Promise<void> {
    console.log("⚖️ 7. 补偿机制演示");
    console.log("===============");

    // 创建补偿操作
    const compensationActions = [
      PredefinedCompensationActions.createDataRollbackAction(
        async (context) => {
          console.log("执行数据回滚操作...");
          return `数据已回滚: ${context.transactionId}`;
        }
      ),
      PredefinedCompensationActions.createMessageCompensationAction(
        async (context) => {
          console.log("发送补偿消息...");
          return `补偿消息已发送: ${context.messageId}`;
        }
      ),
      PredefinedCompensationActions.createResourceCleanupAction(
        async (context) => {
          console.log("清理分配的资源...");
          return `资源已清理: ${context.resourceId}`;
        }
      ),
    ];

    const compensationStrategy = new CompensationStrategy(compensationActions);
    this.recoveryManager.addStrategy(compensationStrategy);

    const concurrencyError = new ConcurrencyConflictError(
      "Order",
      "order-456",
      3,
      5
    );

    console.log("开始补偿机制演示...");
    const compensationResult = await this.recoveryManager.recover(
      concurrencyError,
      {
        transactionId: "tx-789",
        messageId: "msg-456",
        resourceId: "res-123",
      }
    );

    if (compensationResult) {
      console.log("\n补偿结果:");
      console.log(`- 成功: ${compensationResult.success}`);
      console.log(`- 策略: ${compensationResult.strategyUsed}`);
      console.log(`- 执行时间: ${compensationResult.executionTime}ms`);
      console.log(
        `- 元数据: ${JSON.stringify(compensationResult.metadata, null, 2)}`
      );
    }

    console.log("");
  }

  /**
   * 演示集成错误处理
   */
  private async demonstrateIntegratedErrorHandling(): Promise<void> {
    console.log("🔗 8. 集成错误处理演示");
    console.log("==================");

    // 模拟复杂的业务操作
    const complexOperation = async (shouldFail: boolean): Promise<string> => {
      if (shouldFail) {
        throw new BusinessRuleError(
          "订单总金额不能超过用户信用额度",
          "CREDIT_LIMIT_EXCEEDED",
          { orderAmount: 5000, creditLimit: 3000, userId: "user-123" },
          { operation: "createOrder", orderId: "order-789" }
        );
      }

      return "订单创建成功";
    };

    console.log("测试集成错误处理...");

    try {
      // 这个操作会失败
      await complexOperation(true);
    } catch (error) {
      console.log("\n捕获到错误，开始集成处理...");

      // 1. 错误处理
      const handlingResult = this.errorHandler.handle(error as Error, {
        userId: "user-123",
        operation: "createOrder",
      });

      console.log("错误处理结果:");
      console.log(`- 恢复操作: ${handlingResult.recoveryAction}`);
      console.log(`- 应该重试: ${handlingResult.shouldRetry}`);

      // 2. HTTP映射
      const httpResponse = this.errorHandler.mapToHttpResponse(error as Error);
      console.log("\nHTTP响应映射:");
      console.log(`- 状态码: ${httpResponse.status}`);
      console.log(`- 响应体: ${JSON.stringify(httpResponse.body, null, 2)}`);

      // 3. 错误恢复
      const recoveryResult = await this.recoveryManager.recover(
        error as Error,
        { userId: "user-123", operation: "createOrder" }
      );

      if (recoveryResult) {
        console.log("\n错误恢复结果:");
        console.log(`- 成功: ${recoveryResult.success}`);
        console.log(`- 策略: ${recoveryResult.strategyUsed}`);
        console.log(`- 数据: ${recoveryResult.data}`);
      } else {
        console.log("\n无可用的恢复策略");
      }
    }

    console.log("");
  }

  /**
   * 设置恢复策略
   */
  private setupRecoveryStrategies(): void {
    // 回退值策略
    const fallbackStrategy = new FallbackValueStrategy(
      "默认值",
      (error) => error instanceof ValidationError
    );
    this.recoveryManager.addStrategy(fallbackStrategy);

    // 缓存恢复策略
    const cacheStrategy = new CacheRecoveryStrategy(
      this.cache as any,
      (context) => `${context.operation}:${context.userId}`,
      300000 // 5分钟TTL
    );
    this.recoveryManager.addStrategy(cacheStrategy);

    // 降级服务策略
    const degradedStrategy = new DegradedServiceStrategy(
      async (context) => {
        return `降级服务响应: ${context?.operation || "unknown"}`;
      },
      (error) => error instanceof ExternalServiceError
    );
    this.recoveryManager.addStrategy(degradedStrategy);
  }

  /**
   * 设置缓存数据
   */
  private setupCacheData(): void {
    (this.cache as any).set("getUser:user-123", {
      value: { id: "user-123", name: "张三", email: "zhangsan@example.com" },
      timestamp: Date.now(),
      ttl: 300000,
    });
  }

  /**
   * 显示错误信息
   */
  private displayError(title: string, error: Error): void {
    console.log(`${title}:`);

    if (error instanceof DomainError || error instanceof ApplicationError) {
      const errorInfo = error.getFullErrorInfo();
      console.log(`- 错误码: ${errorInfo.errorCode}`);
      console.log(`- 消息: ${errorInfo.message}`);
      console.log(`- 严重程度: ${errorInfo.severity}`);
      console.log(`- 时间戳: ${errorInfo.timestamp}`);

      if (error instanceof DomainError) {
        console.log(`- 分类: ${errorInfo.category}`);
        console.log(`- 可重试: ${error.isRetryable()}`);
        console.log(`- 客户端错误: ${error.isClientError()}`);
      }

      console.log(`- 详情: ${JSON.stringify(errorInfo.details, null, 2)}`);
      console.log(`- 上下文: ${JSON.stringify(errorInfo.context, null, 2)}`);
    } else {
      console.log(`- 消息: ${error.message}`);
      console.log(`- 类型: ${error.constructor.name}`);
    }

    console.log("");
  }
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
  ErrorHandlingDemo.runDemo().catch(console.error);
}
