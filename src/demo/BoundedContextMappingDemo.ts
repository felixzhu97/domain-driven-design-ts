import {
  BoundedContext,
  ContextMappingType,
  EndpointType,
  EventType,
  IntegrationPattern,
  ConsistencyModel,
} from "../domain/bounded-context/BoundedContext";
import {
  ContextMappingManager,
  MappingAnalysisResult,
  MappingTopology,
  ValidationResult,
  OptimizationResult,
  HealthStatus,
} from "../domain/bounded-context/ContextMappingManager";

/**
 * 界限上下文映射演示
 */
export class BoundedContextMappingDemo {
  private mappingManager: ContextMappingManager;

  constructor() {
    this.mappingManager = new ContextMappingManager();
  }

  /**
   * 运行完整演示
   */
  public async runDemo(): Promise<void> {
    console.log("🚀 开始界限上下文映射演示");
    console.log("=".repeat(50));

    try {
      // 1. 创建示例上下文
      await this.createSampleContexts();

      // 2. 建立映射关系
      await this.createMappingRelationships();

      // 3. 分析映射拓扑
      await this.analyzeTopology();

      // 4. 验证映射一致性
      await this.validateConsistency();

      // 5. 监控健康状况
      await this.monitorHealth();

      // 6. 优化映射配置
      await this.optimizeMappings();

      // 7. 展示不同映射类型的特点
      await this.demonstrateMappingTypes();

      console.log("\n✅ 界限上下文映射演示完成");
    } catch (error) {
      console.error("❌ 演示过程中发生错误:", error);
    }
  }

  /**
   * 创建示例上下文
   */
  private async createSampleContexts(): Promise<void> {
    console.log("\n📋 1. 创建示例界限上下文");
    console.log("-".repeat(30));

    const contexts = this.getSampleContexts();

    contexts.forEach((context) => {
      this.mappingManager.registerContext(context);
      console.log(`   ✓ 注册上下文: ${context.name} (${context.domain})`);
    });

    console.log(`\n   📊 总计创建 ${contexts.length} 个界限上下文`);
  }

  /**
   * 获取示例上下文
   */
  private getSampleContexts(): BoundedContext[] {
    return [
      {
        id: "order-management",
        name: "订单管理",
        description: "处理订单创建、修改和状态管理",
        team: "订单团队",
        domain: "销售域",
        capabilities: ["创建订单", "修改订单", "查询订单状态", "订单验证"],
        ubiquitousLanguage: {
          订单: "Order",
          订单项: "OrderItem",
          订单状态: "OrderStatus",
          客户: "Customer",
        },
        endpoints: [
          {
            id: "order-api",
            name: "订单API",
            type: EndpointType.REST_API,
            contract: {
              version: "1.0.0",
              schema: { type: "openapi", version: "3.0.0" },
              operations: [
                {
                  name: "createOrder",
                  method: "POST",
                  path: "/orders",
                  parameters: [
                    {
                      name: "customerId",
                      type: "string",
                      required: true,
                      description: "客户ID",
                    },
                    {
                      name: "items",
                      type: "array",
                      required: true,
                      description: "订单项列表",
                    },
                  ],
                  responseFormat: {
                    type: "object",
                    properties: { orderId: { type: "string" } },
                  },
                  errorCodes: ["400", "404", "500"],
                },
              ],
              supportedFormats: ["application/json"],
            },
            availability: {
              availability: 99.9,
              latency: 200,
              throughput: 1000,
              errorRate: 0.1,
            },
          },
        ],
        events: [
          {
            id: "order-created",
            name: "订单创建事件",
            type: EventType.DOMAIN_EVENT,
            schema: {
              type: "object",
              properties: {
                orderId: { type: "string" },
                customerId: { type: "string" },
                amount: { type: "number" },
                timestamp: { type: "string", format: "date-time" },
              },
            },
            published: true,
            subscribed: false,
          },
        ],
      },
      {
        id: "payment-processing",
        name: "支付处理",
        description: "处理支付请求和支付状态管理",
        team: "支付团队",
        domain: "财务域",
        capabilities: ["处理支付", "查询支付状态", "退款处理", "支付验证"],
        ubiquitousLanguage: {
          支付: "Payment",
          支付方式: "PaymentMethod",
          支付状态: "PaymentStatus",
          交易: "Transaction",
        },
        endpoints: [
          {
            id: "payment-api",
            name: "支付API",
            type: EndpointType.REST_API,
            contract: {
              version: "1.0.0",
              schema: { type: "openapi", version: "3.0.0" },
              operations: [
                {
                  name: "processPayment",
                  method: "POST",
                  path: "/payments",
                  parameters: [
                    {
                      name: "orderId",
                      type: "string",
                      required: true,
                      description: "订单ID",
                    },
                    {
                      name: "amount",
                      type: "number",
                      required: true,
                      description: "支付金额",
                    },
                  ],
                  responseFormat: {
                    type: "object",
                    properties: { paymentId: { type: "string" } },
                  },
                  errorCodes: ["400", "402", "500"],
                },
              ],
              supportedFormats: ["application/json"],
            },
            availability: {
              availability: 99.95,
              latency: 300,
              throughput: 800,
              errorRate: 0.2,
            },
          },
        ],
        events: [
          {
            id: "payment-completed",
            name: "支付完成事件",
            type: EventType.DOMAIN_EVENT,
            schema: {
              type: "object",
              properties: {
                paymentId: { type: "string" },
                orderId: { type: "string" },
                amount: { type: "number" },
                timestamp: { type: "string", format: "date-time" },
              },
            },
            published: true,
            subscribed: false,
          },
          {
            id: "order-created",
            name: "订单创建事件",
            type: EventType.DOMAIN_EVENT,
            schema: {
              type: "object",
              properties: {
                orderId: { type: "string" },
                customerId: { type: "string" },
                amount: { type: "number" },
              },
            },
            published: false,
            subscribed: true,
          },
        ],
      },
      {
        id: "inventory-management",
        name: "库存管理",
        description: "管理商品库存和库存预留",
        team: "库存团队",
        domain: "供应链域",
        capabilities: ["查询库存", "预留库存", "释放库存", "库存补充"],
        ubiquitousLanguage: {
          库存: "Inventory",
          商品: "Product",
          库存数量: "Quantity",
          预留: "Reservation",
        },
        endpoints: [
          {
            id: "inventory-api",
            name: "库存API",
            type: EndpointType.REST_API,
            contract: {
              version: "1.0.0",
              schema: { type: "openapi", version: "3.0.0" },
              operations: [
                {
                  name: "checkInventory",
                  method: "GET",
                  path: "/inventory/{productId}",
                  parameters: [
                    {
                      name: "productId",
                      type: "string",
                      required: true,
                      description: "商品ID",
                    },
                  ],
                  responseFormat: {
                    type: "object",
                    properties: { available: { type: "number" } },
                  },
                  errorCodes: ["404", "500"],
                },
              ],
              supportedFormats: ["application/json"],
            },
            availability: {
              availability: 99.8,
              latency: 150,
              throughput: 2000,
              errorRate: 0.3,
            },
          },
        ],
        events: [
          {
            id: "inventory-reserved",
            name: "库存预留事件",
            type: EventType.DOMAIN_EVENT,
            schema: {
              type: "object",
              properties: {
                productId: { type: "string" },
                quantity: { type: "number" },
                orderId: { type: "string" },
                timestamp: { type: "string", format: "date-time" },
              },
            },
            published: true,
            subscribed: false,
          },
        ],
      },
      {
        id: "user-management",
        name: "用户管理",
        description: "管理用户账户和认证信息",
        team: "用户团队",
        domain: "用户域",
        capabilities: ["用户注册", "用户认证", "用户信息管理", "权限管理"],
        ubiquitousLanguage: {
          用户: "User",
          账户: "Account",
          角色: "Role",
          权限: "Permission",
        },
        endpoints: [
          {
            id: "user-api",
            name: "用户API",
            type: EndpointType.REST_API,
            contract: {
              version: "1.0.0",
              schema: { type: "openapi", version: "3.0.0" },
              operations: [
                {
                  name: "getUserInfo",
                  method: "GET",
                  path: "/users/{userId}",
                  parameters: [
                    {
                      name: "userId",
                      type: "string",
                      required: true,
                      description: "用户ID",
                    },
                  ],
                  responseFormat: {
                    type: "object",
                    properties: { user: { type: "object" } },
                  },
                  errorCodes: ["404", "500"],
                },
              ],
              supportedFormats: ["application/json"],
            },
            availability: {
              availability: 99.9,
              latency: 100,
              throughput: 3000,
              errorRate: 0.1,
            },
          },
        ],
        events: [
          {
            id: "user-registered",
            name: "用户注册事件",
            type: EventType.DOMAIN_EVENT,
            schema: {
              type: "object",
              properties: {
                userId: { type: "string" },
                email: { type: "string" },
                timestamp: { type: "string", format: "date-time" },
              },
            },
            published: true,
            subscribed: false,
          },
        ],
      },
      {
        id: "notification-service",
        name: "通知服务",
        description: "发送各种类型的通知消息",
        team: "基础设施团队",
        domain: "基础设施域",
        capabilities: ["邮件通知", "短信通知", "推送通知", "通知模板管理"],
        ubiquitousLanguage: {
          通知: "Notification",
          消息: "Message",
          模板: "Template",
          渠道: "Channel",
        },
        endpoints: [
          {
            id: "notification-api",
            name: "通知API",
            type: EndpointType.REST_API,
            contract: {
              version: "1.0.0",
              schema: { type: "openapi", version: "3.0.0" },
              operations: [
                {
                  name: "sendNotification",
                  method: "POST",
                  path: "/notifications",
                  parameters: [
                    {
                      name: "recipient",
                      type: "string",
                      required: true,
                      description: "接收方",
                    },
                    {
                      name: "message",
                      type: "string",
                      required: true,
                      description: "消息内容",
                    },
                  ],
                  responseFormat: {
                    type: "object",
                    properties: { notificationId: { type: "string" } },
                  },
                  errorCodes: ["400", "500"],
                },
              ],
              supportedFormats: ["application/json"],
            },
            availability: {
              availability: 99.5,
              latency: 250,
              throughput: 1500,
              errorRate: 0.5,
            },
          },
        ],
        events: [
          {
            id: "notification-sent",
            name: "通知发送事件",
            type: EventType.DOMAIN_EVENT,
            schema: {
              type: "object",
              properties: {
                notificationId: { type: "string" },
                recipient: { type: "string" },
                channel: { type: "string" },
                timestamp: { type: "string", format: "date-time" },
              },
            },
            published: true,
            subscribed: false,
          },
        ],
      },
    ];
  }

  /**
   * 建立映射关系
   */
  private async createMappingRelationships(): Promise<void> {
    console.log("\n🔗 2. 建立映射关系");
    console.log("-".repeat(30));

    const mappings = [
      {
        upstream: "order-management",
        downstream: "payment-processing",
        type: ContextMappingType.CUSTOMER_SUPPLIER,
        name: "订单支付映射",
      },
      {
        upstream: "order-management",
        downstream: "inventory-management",
        type: ContextMappingType.CUSTOMER_SUPPLIER,
        name: "订单库存映射",
      },
      {
        upstream: "order-management",
        downstream: "user-management",
        type: ContextMappingType.ANTICORRUPTION_LAYER,
        name: "订单用户映射",
      },
      {
        upstream: "payment-processing",
        downstream: "notification-service",
        type: ContextMappingType.OPEN_HOST_SERVICE,
        name: "支付通知映射",
      },
      {
        upstream: "inventory-management",
        downstream: "notification-service",
        type: ContextMappingType.OPEN_HOST_SERVICE,
        name: "库存通知映射",
      },
      {
        upstream: "user-management",
        downstream: "notification-service",
        type: ContextMappingType.CONFORMIST,
        name: "用户通知映射",
      },
    ];

    for (const mapping of mappings) {
      try {
        const contextMapping = this.mappingManager.createMapping(
          mapping.upstream,
          mapping.downstream,
          mapping.type,
          mapping.name
        );
        console.log(`   ✓ 创建映射: ${mapping.name} (${mapping.type})`);
        this.printMappingDetails(contextMapping);
      } catch (error) {
        console.error(`   ❌ 创建映射失败: ${mapping.name}`, error);
      }
    }

    console.log(`\n   📊 总计创建 ${mappings.length} 个映射关系`);
  }

  /**
   * 分析映射拓扑
   */
  private async analyzeTopology(): Promise<void> {
    console.log("\n🕸️ 3. 分析映射拓扑");
    console.log("-".repeat(30));

    const topology = this.mappingManager.getTopology();
    this.printTopology(topology);
  }

  /**
   * 验证映射一致性
   */
  private async validateConsistency(): Promise<void> {
    console.log("\n✅ 4. 验证映射一致性");
    console.log("-".repeat(30));

    const validation = this.mappingManager.validateConsistency();
    this.printValidationResult(validation);
  }

  /**
   * 监控健康状况
   */
  private async monitorHealth(): Promise<void> {
    console.log("\n🏥 5. 监控健康状况");
    console.log("-".repeat(30));

    const health = this.mappingManager.getHealthStatus();
    this.printHealthStatus(health);
  }

  /**
   * 优化映射配置
   */
  private async optimizeMappings(): Promise<void> {
    console.log("\n⚡ 6. 优化映射配置");
    console.log("-".repeat(30));

    const topology = this.mappingManager.getTopology();

    for (const edge of topology.edges.slice(0, 2)) {
      // 只演示前2个映射
      try {
        const optimization = this.mappingManager.optimizeMapping(edge.id);
        this.printOptimizationResult(optimization);
      } catch (error) {
        console.error(`   ❌ 优化映射失败: ${edge.id}`, error);
      }
    }
  }

  /**
   * 展示不同映射类型的特点
   */
  private async demonstrateMappingTypes(): Promise<void> {
    console.log("\n🎯 7. 映射类型特点分析");
    console.log("-".repeat(30));

    this.printMappingTypeCharacteristics();
  }

  /**
   * 打印映射详情
   */
  private printMappingDetails(mapping: any): void {
    console.log(`      📋 映射详情:`);
    console.log(`         - 上游: ${mapping.upstream.name}`);
    console.log(`         - 下游: ${mapping.downstream.name}`);
    console.log(`         - 类型: ${mapping.type}`);
    console.log(`         - 集成模式: ${mapping.integrationStrategy.pattern}`);
    console.log(
      `         - 一致性: ${mapping.integrationStrategy.consistency}`
    );
    console.log(`         - 冲突解决: ${mapping.conflictResolution.strategy}`);
  }

  /**
   * 打印拓扑信息
   */
  private printTopology(topology: MappingTopology): void {
    console.log(`   📊 拓扑统计:`);
    console.log(`      - 节点数量: ${topology.metrics.nodeCount}`);
    console.log(`      - 边数量: ${topology.metrics.edgeCount}`);
    console.log(
      `      - 密度: ${(topology.metrics.density * 100).toFixed(2)}%`
    );
    console.log(
      `      - 平均强度: ${topology.metrics.averageStrength.toFixed(3)}`
    );

    console.log(`\n   🔗 映射关系:`);
    topology.edges.forEach((edge) => {
      const sourceNode = topology.nodes.find((n) => n.id === edge.source);
      const targetNode = topology.nodes.find((n) => n.id === edge.target);
      console.log(
        `      ${sourceNode?.name} → ${targetNode?.name} (${
          edge.type
        }, 强度: ${edge.strength.toFixed(3)})`
      );
    });

    if (topology.clusters.length > 0) {
      console.log(`\n   🏢 识别到 ${topology.clusters.length} 个集群:`);
      topology.clusters.forEach((cluster, index) => {
        console.log(
          `      集群 ${index + 1}: ${
            cluster.nodes.length
          } 个节点, 强度: ${cluster.strength.toFixed(3)}`
        );
      });
    }
  }

  /**
   * 打印验证结果
   */
  private printValidationResult(validation: ValidationResult): void {
    console.log(`   📋 验证结果: ${validation.valid ? "✅ 通过" : "❌ 失败"}`);

    if (validation.issues.length > 0) {
      console.log(`   ⚠️  发现 ${validation.issues.length} 个问题:`);
      validation.issues.forEach((issue, index) => {
        console.log(`      ${index + 1}. [${issue.severity}] ${issue.message}`);
        if (issue.details) {
          console.log(`         详情: ${JSON.stringify(issue.details)}`);
        }
      });
    } else {
      console.log(`   ✅ 所有映射关系都符合一致性要求`);
    }
  }

  /**
   * 打印健康状况
   */
  private printHealthStatus(health: HealthStatus): void {
    console.log(`   🏥 整体健康状况:`);
    console.log(`      - 健康分数: ${health.overall.score.toFixed(1)}/100`);
    console.log(`      - 健康状态: ${health.overall.status}`);
    console.log(
      `      - 最后更新: ${health.overall.lastUpdated.toISOString()}`
    );

    console.log(`\n   📊 各映射健康状况:`);
    health.byMapping.forEach((mapping) => {
      console.log(
        `      ${mapping.name}: ${mapping.score.toFixed(1)}/100 (${
          mapping.status
        })`
      );
      if (mapping.issues.length > 0) {
        console.log(`         问题: ${mapping.issues.join(", ")}`);
      }
    });

    if (health.trends.length > 0) {
      console.log(`\n   📈 健康趋势:`);
      health.trends.forEach((trend, index) => {
        console.log(
          `      ${index + 1}. ${trend.timestamp}: ${trend.value.toFixed(1)}`
        );
      });
    }
  }

  /**
   * 打印优化结果
   */
  private printOptimizationResult(optimization: OptimizationResult): void {
    console.log(`   🎯 映射优化: ${optimization.mapping.name}`);

    console.log(`      当前配置:`);
    Object.entries(optimization.currentConfig).forEach(([key, value]) => {
      console.log(`         ${key}: ${value}`);
    });

    console.log(`      优化配置:`);
    Object.entries(optimization.optimizedConfig).forEach(([key, value]) => {
      console.log(`         ${key}: ${value}`);
    });

    console.log(`      预期影响:`);
    Object.entries(optimization.expectedImpact).forEach(([key, value]) => {
      console.log(`         ${key}: ${value}`);
    });

    console.log(`      优化建议:`);
    optimization.recommendations.forEach((rec, index) => {
      console.log(`         ${index + 1}. ${rec}`);
    });
  }

  /**
   * 打印映射类型特点
   */
  private printMappingTypeCharacteristics(): void {
    const characteristics = [
      {
        type: ContextMappingType.SHARED_KERNEL,
        name: "共享内核",
        description: "两个上下文共享部分模型",
        advantages: ["快速开发", "数据一致性", "减少重复"],
        disadvantages: ["高耦合", "协调成本", "演化困难"],
        useCase: "紧密协作的团队，共享核心业务概念",
      },
      {
        type: ContextMappingType.CUSTOMER_SUPPLIER,
        name: "客户-供应商",
        description: "上游团队为下游团队提供服务",
        advantages: ["清晰职责", "可控依赖", "稳定接口"],
        disadvantages: ["协商成本", "版本管理", "需求传递"],
        useCase: "明确的供应关系，如订单系统使用用户服务",
      },
      {
        type: ContextMappingType.ANTICORRUPTION_LAYER,
        name: "防腐层",
        description: "下游通过适配层访问上游",
        advantages: ["模型隔离", "独立演化", "风险控制"],
        disadvantages: ["额外复杂性", "性能开销", "维护成本"],
        useCase: "集成遗留系统或第三方服务",
      },
      {
        type: ContextMappingType.OPEN_HOST_SERVICE,
        name: "开放主机服务",
        description: "上游提供标准化的开放服务",
        advantages: ["标准化", "可复用", "易集成"],
        disadvantages: ["通用性限制", "性能考虑", "版本兼容"],
        useCase: "通用服务，如通知服务、认证服务",
      },
      {
        type: ContextMappingType.CONFORMIST,
        name: "遵循者",
        description: "下游完全遵循上游的模型",
        advantages: ["简单实现", "快速集成", "低成本"],
        disadvantages: ["模型不匹配", "功能限制", "演化受限"],
        useCase: "无议价权的情况，如使用第三方API",
      },
    ];

    characteristics.forEach((char) => {
      console.log(`\n   📋 ${char.name} (${char.type})`);
      console.log(`      描述: ${char.description}`);
      console.log(`      优势: ${char.advantages.join(", ")}`);
      console.log(`      劣势: ${char.disadvantages.join(", ")}`);
      console.log(`      适用场景: ${char.useCase}`);
    });

    console.log(`\n   💡 选择建议:`);
    console.log(`      1. 优先选择防腐层，确保模型独立性`);
    console.log(`      2. 谨慎使用共享内核，避免过度耦合`);
    console.log(`      3. 标准化通用服务，提高复用性`);
    console.log(`      4. 根据团队关系选择合适的映射类型`);
    console.log(`      5. 定期评估和优化映射关系`);
  }

  /**
   * 演示映射分析
   */
  private async demonstrateMappingAnalysis(): Promise<void> {
    console.log("\n🔍 映射分析演示");
    console.log("-".repeat(30));

    const topology = this.mappingManager.getTopology();

    if (topology.edges.length > 0) {
      const sampleMappingId = topology.edges[0]?.id;

      if (sampleMappingId) {
        try {
          const analysis = this.mappingManager.analyzeMapping(sampleMappingId);
          this.printAnalysisResult(analysis);
        } catch (error) {
          console.error(`   ❌ 分析失败: ${sampleMappingId}`, error);
        }
      }
    } else {
      console.log("   ⚠️  没有可用的映射进行分析");
    }
  }

  /**
   * 打印分析结果
   */
  private printAnalysisResult(analysis: MappingAnalysisResult): void {
    console.log(`   📊 映射分析: ${analysis.mapping.name}`);

    console.log(`      性能指标:`);
    console.log(
      `         - 响应时间: ${analysis.analysis.performance.responseTime.toFixed(
        0
      )}ms`
    );
    console.log(
      `         - 吞吐量: ${analysis.analysis.performance.throughput.toFixed(
        0
      )} req/s`
    );
    console.log(
      `         - 延迟: ${analysis.analysis.performance.latency.toFixed(0)}ms`
    );

    console.log(`      可靠性指标:`);
    console.log(
      `         - 可用性: ${(
        analysis.analysis.reliability.availability * 100
      ).toFixed(2)}%`
    );
    console.log(
      `         - 错误率: ${(
        analysis.analysis.reliability.errorRate * 100
      ).toFixed(2)}%`
    );
    console.log(
      `         - 平均恢复时间: ${(
        analysis.analysis.reliability.mttr / 60
      ).toFixed(1)} 分钟`
    );

    console.log(`      业务指标:`);
    console.log(
      `         - 交易量: ${analysis.analysis.business.transactionCount.toLocaleString()}`
    );
    console.log(
      `         - 转化率: ${(
        analysis.analysis.business.conversionRate * 100
      ).toFixed(2)}%`
    );
    console.log(
      `         - 用户满意度: ${(
        analysis.analysis.business.userSatisfaction * 100
      ).toFixed(1)}%`
    );

    if (analysis.insights.length > 0) {
      console.log(`      🔍 洞察:`);
      analysis.insights.forEach((insight, index) => {
        console.log(
          `         ${index + 1}. [${insight.severity}] ${insight.title}`
        );
        console.log(`            ${insight.description}`);
        console.log(
          `            置信度: ${(insight.confidence * 100).toFixed(1)}%`
        );
      });
    }

    if (analysis.recommendations.length > 0) {
      console.log(`      💡 建议:`);
      analysis.recommendations.forEach((rec, index) => {
        console.log(`         ${index + 1}. ${rec}`);
      });
    }
  }
}

// 使用示例
export async function runBoundedContextMappingDemo(): Promise<void> {
  const demo = new BoundedContextMappingDemo();
  await demo.runDemo();
}

// 如果直接运行此文件
if (require.main === module) {
  runBoundedContextMappingDemo().catch(console.error);
}
