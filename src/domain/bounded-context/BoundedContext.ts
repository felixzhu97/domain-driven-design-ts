import { EntityId } from "../../shared/types";

/**
 * 界限上下文接口
 */
export interface BoundedContext {
  readonly id: EntityId;
  readonly name: string;
  readonly description: string;
  readonly team: string;
  readonly domain: string;
  readonly capabilities: string[];
  readonly ubiquitousLanguage: Record<string, string>;
  readonly endpoints: ContextEndpoint[];
  readonly events: ContextEvent[];
}

/**
 * 上下文端点定义
 */
export interface ContextEndpoint {
  readonly id: string;
  readonly name: string;
  readonly type: EndpointType;
  readonly contract: EndpointContract;
  readonly availability: ServiceLevel;
}

/**
 * 端点类型
 */
export enum EndpointType {
  REST_API = "REST_API",
  GRAPHQL = "GRAPHQL",
  RPC = "RPC",
  MESSAGE_QUEUE = "MESSAGE_QUEUE",
  EVENT_STREAM = "EVENT_STREAM",
  DATABASE = "DATABASE",
  FILE_SYSTEM = "FILE_SYSTEM",
}

/**
 * 端点契约
 */
export interface EndpointContract {
  readonly version: string;
  readonly schema: Record<string, unknown>;
  readonly operations: Operation[];
  readonly supportedFormats: string[];
}

/**
 * 操作定义
 */
export interface Operation {
  readonly name: string;
  readonly method: string;
  readonly path?: string;
  readonly parameters: Parameter[];
  readonly responseFormat: Record<string, unknown>;
  readonly errorCodes: string[];
}

/**
 * 参数定义
 */
export interface Parameter {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
  readonly validation?: Record<string, unknown>;
}

/**
 * 服务级别
 */
export interface ServiceLevel {
  readonly availability: number; // 可用性百分比
  readonly latency: number; // 响应时间毫秒
  readonly throughput: number; // 吞吐量请求/秒
  readonly errorRate: number; // 错误率百分比
}

/**
 * 上下文事件
 */
export interface ContextEvent {
  readonly id: string;
  readonly name: string;
  readonly type: EventType;
  readonly schema: Record<string, unknown>;
  readonly published: boolean;
  readonly subscribed: boolean;
}

/**
 * 事件类型
 */
export enum EventType {
  DOMAIN_EVENT = "DOMAIN_EVENT",
  INTEGRATION_EVENT = "INTEGRATION_EVENT",
  NOTIFICATION_EVENT = "NOTIFICATION_EVENT",
  SYSTEM_EVENT = "SYSTEM_EVENT",
}

/**
 * 界限上下文映射关系类型
 */
export enum ContextMappingType {
  // 合作关系
  SHARED_KERNEL = "SHARED_KERNEL", // 共享内核
  PARTNERSHIP = "PARTNERSHIP", // 合作关系

  // 客户-供应商关系
  CUSTOMER_SUPPLIER = "CUSTOMER_SUPPLIER", // 客户-供应商
  CONFORMIST = "CONFORMIST", // 遵循者

  // 分离关系
  ANTICORRUPTION_LAYER = "ANTICORRUPTION_LAYER", // 防腐层
  OPEN_HOST_SERVICE = "OPEN_HOST_SERVICE", // 开放主机服务
  PUBLISHED_LANGUAGE = "PUBLISHED_LANGUAGE", // 发布语言

  // 大泥球
  BIG_BALL_OF_MUD = "BIG_BALL_OF_MUD", // 大泥球

  // 分离的方式
  SEPARATE_WAYS = "SEPARATE_WAYS", // 分离方式
}

/**
 * 上下文映射关系
 */
export interface ContextMapping {
  readonly id: EntityId;
  readonly name: string;
  readonly type: ContextMappingType;
  readonly upstream: BoundedContext;
  readonly downstream: BoundedContext;
  readonly relationship: MappingRelationship;
  readonly integrationStrategy: IntegrationStrategy;
  readonly communicationProtocol: CommunicationProtocol;
  readonly dataTransformation: DataTransformation;
  readonly conflictResolution: ConflictResolution;
  readonly governance: GovernanceModel;
  readonly monitoring: MappingMonitoring;
}

/**
 * 映射关系详情
 */
export interface MappingRelationship {
  readonly direction: RelationshipDirection;
  readonly dependency: DependencyLevel;
  readonly ownership: OwnershipModel;
  readonly negotiation: NegotiationModel;
  readonly evolution: EvolutionStrategy;
}

/**
 * 关系方向
 */
export enum RelationshipDirection {
  UPSTREAM_TO_DOWNSTREAM = "UPSTREAM_TO_DOWNSTREAM", // 上游到下游
  DOWNSTREAM_TO_UPSTREAM = "DOWNSTREAM_TO_UPSTREAM", // 下游到上游
  BIDIRECTIONAL = "BIDIRECTIONAL", // 双向
  SYMMETRIC = "SYMMETRIC", // 对称
}

/**
 * 依赖级别
 */
export enum DependencyLevel {
  TIGHT = "TIGHT", // 紧耦合
  LOOSE = "LOOSE", // 松耦合
  DECOUPLED = "DECOUPLED", // 解耦
  INDEPENDENT = "INDEPENDENT", // 独立
}

/**
 * 所有权模型
 */
export interface OwnershipModel {
  readonly primary: string; // 主要负责团队
  readonly secondary: string[]; // 次要负责团队
  readonly shared: boolean; // 是否共享所有权
  readonly governance: string; // 治理方式
}

/**
 * 协商模型
 */
export interface NegotiationModel {
  readonly required: boolean; // 是否需要协商
  readonly frequency: string; // 协商频率
  readonly participants: string[]; // 参与方
  readonly decisionMaking: string; // 决策方式
}

/**
 * 演化策略
 */
export interface EvolutionStrategy {
  readonly versioning: VersioningStrategy;
  readonly compatibility: CompatibilityStrategy;
  readonly migration: MigrationStrategy;
  readonly deprecation: DeprecationStrategy;
}

/**
 * 版本管理策略
 */
export interface VersioningStrategy {
  readonly scheme: string; // 版本方案
  readonly backward: boolean; // 向后兼容
  readonly forward: boolean; // 向前兼容
  readonly timeline: string; // 时间线
}

/**
 * 兼容性策略
 */
export interface CompatibilityStrategy {
  readonly level: CompatibilityLevel;
  readonly testing: string[];
  readonly validation: string[];
}

/**
 * 兼容性级别
 */
export enum CompatibilityLevel {
  STRICT = "STRICT", // 严格兼容
  SEMANTIC = "SEMANTIC", // 语义兼容
  FUNCTIONAL = "FUNCTIONAL", // 功能兼容
  PARTIAL = "PARTIAL", // 部分兼容
}

/**
 * 迁移策略
 */
export interface MigrationStrategy {
  readonly approach: MigrationApproach;
  readonly timeline: string;
  readonly rollback: RollbackStrategy;
  readonly testing: TestingStrategy;
}

/**
 * 迁移方法
 */
export enum MigrationApproach {
  BIG_BANG = "BIG_BANG", // 大爆炸
  GRADUAL = "GRADUAL", // 渐进式
  PARALLEL_RUN = "PARALLEL_RUN", // 并行运行
  BLUE_GREEN = "BLUE_GREEN", // 蓝绿部署
}

/**
 * 回滚策略
 */
export interface RollbackStrategy {
  readonly automatic: boolean;
  readonly conditions: string[];
  readonly procedures: string[];
  readonly timeline: string;
}

/**
 * 测试策略
 */
export interface TestingStrategy {
  readonly levels: TestingLevel[];
  readonly coverage: number;
  readonly automation: boolean;
  readonly environments: string[];
}

/**
 * 测试级别
 */
export enum TestingLevel {
  UNIT = "UNIT",
  INTEGRATION = "INTEGRATION",
  CONTRACT = "CONTRACT",
  END_TO_END = "END_TO_END",
  PERFORMANCE = "PERFORMANCE",
  SECURITY = "SECURITY",
}

/**
 * 废弃策略
 */
export interface DeprecationStrategy {
  readonly notice: string;
  readonly timeline: string;
  readonly alternatives: string[];
  readonly support: string;
}

/**
 * 集成策略
 */
export interface IntegrationStrategy {
  readonly pattern: IntegrationPattern;
  readonly frequency: IntegrationFrequency;
  readonly consistency: ConsistencyModel;
  readonly resilience: ResilienceStrategy;
}

/**
 * 集成模式
 */
export enum IntegrationPattern {
  SYNCHRONOUS = "SYNCHRONOUS", // 同步
  ASYNCHRONOUS = "ASYNCHRONOUS", // 异步
  BATCH = "BATCH", // 批处理
  STREAMING = "STREAMING", // 流处理
  EVENT_DRIVEN = "EVENT_DRIVEN", // 事件驱动
  SAGA = "SAGA", // Saga模式
}

/**
 * 集成频率
 */
export enum IntegrationFrequency {
  REAL_TIME = "REAL_TIME", // 实时
  NEAR_REAL_TIME = "NEAR_REAL_TIME", // 近实时
  PERIODIC = "PERIODIC", // 周期性
  ON_DEMAND = "ON_DEMAND", // 按需
  SCHEDULED = "SCHEDULED", // 定时
}

/**
 * 一致性模型
 */
export enum ConsistencyModel {
  STRONG = "STRONG", // 强一致性
  EVENTUAL = "EVENTUAL", // 最终一致性
  WEAK = "WEAK", // 弱一致性
  CAUSAL = "CAUSAL", // 因果一致性
}

/**
 * 韧性策略
 */
export interface ResilienceStrategy {
  readonly timeout: number;
  readonly retry: RetryStrategy;
  readonly circuitBreaker: CircuitBreakerStrategy;
  readonly fallback: FallbackStrategy;
  readonly bulkhead: BulkheadStrategy;
}

/**
 * 重试策略
 */
export interface RetryStrategy {
  readonly maxAttempts: number;
  readonly backoff: BackoffStrategy;
  readonly conditions: string[];
}

/**
 * 退避策略
 */
export interface BackoffStrategy {
  readonly type: BackoffType;
  readonly initialDelay: number;
  readonly maxDelay: number;
  readonly multiplier: number;
  readonly jitter: boolean;
}

/**
 * 退避类型
 */
export enum BackoffType {
  FIXED = "FIXED",
  LINEAR = "LINEAR",
  EXPONENTIAL = "EXPONENTIAL",
  RANDOM = "RANDOM",
}

/**
 * 断路器策略
 */
export interface CircuitBreakerStrategy {
  readonly enabled: boolean;
  readonly failureThreshold: number;
  readonly timeout: number;
  readonly halfOpenMaxCalls: number;
}

/**
 * 降级策略
 */
export interface FallbackStrategy {
  readonly enabled: boolean;
  readonly strategy: FallbackType;
  readonly configuration: Record<string, unknown>;
}

/**
 * 降级类型
 */
export enum FallbackType {
  STATIC_RESPONSE = "STATIC_RESPONSE",
  CACHE = "CACHE",
  ALTERNATIVE_SERVICE = "ALTERNATIVE_SERVICE",
  GRACEFUL_DEGRADATION = "GRACEFUL_DEGRADATION",
}

/**
 * 舱壁策略
 */
export interface BulkheadStrategy {
  readonly enabled: boolean;
  readonly maxConcurrency: number;
  readonly queueSize: number;
  readonly isolation: IsolationType;
}

/**
 * 隔离类型
 */
export enum IsolationType {
  THREAD_POOL = "THREAD_POOL",
  SEMAPHORE = "SEMAPHORE",
  ACTOR = "ACTOR",
  PROCESS = "PROCESS",
}

/**
 * 通信协议
 */
export interface CommunicationProtocol {
  readonly type: ProtocolType;
  readonly configuration: ProtocolConfiguration;
  readonly security: SecurityConfiguration;
  readonly monitoring: ProtocolMonitoring;
}

/**
 * 协议类型
 */
export enum ProtocolType {
  HTTP = "HTTP",
  HTTPS = "HTTPS",
  GRPC = "GRPC",
  WEBSOCKET = "WEBSOCKET",
  MQTT = "MQTT",
  AMQP = "AMQP",
  KAFKA = "KAFKA",
  NATS = "NATS",
}

/**
 * 协议配置
 */
export interface ProtocolConfiguration {
  readonly version: string;
  readonly compression: boolean;
  readonly serialization: SerializationType;
  readonly headers: Record<string, string>;
  readonly parameters: Record<string, unknown>;
}

/**
 * 序列化类型
 */
export enum SerializationType {
  JSON = "JSON",
  XML = "XML",
  PROTOBUF = "PROTOBUF",
  AVRO = "AVRO",
  MSGPACK = "MSGPACK",
  BINARY = "BINARY",
}

/**
 * 安全配置
 */
export interface SecurityConfiguration {
  readonly authentication: AuthenticationMethod;
  readonly authorization: AuthorizationMethod;
  readonly encryption: EncryptionMethod;
  readonly certificates: CertificateConfiguration;
}

/**
 * 认证方法
 */
export enum AuthenticationMethod {
  NONE = "NONE",
  BASIC = "BASIC",
  BEARER = "BEARER",
  API_KEY = "API_KEY",
  OAUTH2 = "OAUTH2",
  JWT = "JWT",
  MUTUAL_TLS = "MUTUAL_TLS",
}

/**
 * 授权方法
 */
export enum AuthorizationMethod {
  NONE = "NONE",
  RBAC = "RBAC",
  ABAC = "ABAC",
  ACL = "ACL",
  SCOPE = "SCOPE",
}

/**
 * 加密方法
 */
export interface EncryptionMethod {
  readonly transport: TransportEncryption;
  readonly data: DataEncryption;
  readonly keyManagement: KeyManagement;
}

/**
 * 传输加密
 */
export interface TransportEncryption {
  readonly enabled: boolean;
  readonly protocol: string;
  readonly cipherSuites: string[];
  readonly minVersion: string;
}

/**
 * 数据加密
 */
export interface DataEncryption {
  readonly enabled: boolean;
  readonly algorithm: string;
  readonly keySize: number;
  readonly mode: string;
}

/**
 * 密钥管理
 */
export interface KeyManagement {
  readonly provider: string;
  readonly rotation: boolean;
  readonly rotationInterval: string;
  readonly storage: string;
}

/**
 * 证书配置
 */
export interface CertificateConfiguration {
  readonly clientCert: string;
  readonly serverCert: string;
  readonly caCert: string;
  readonly validation: CertificateValidation;
}

/**
 * 证书验证
 */
export interface CertificateValidation {
  readonly enabled: boolean;
  readonly checkExpiration: boolean;
  readonly checkRevocation: boolean;
  readonly allowSelfSigned: boolean;
}

/**
 * 协议监控
 */
export interface ProtocolMonitoring {
  readonly metrics: ProtocolMetrics;
  readonly logging: ProtocolLogging;
  readonly tracing: ProtocolTracing;
}

/**
 * 协议指标
 */
export interface ProtocolMetrics {
  readonly requestCount: boolean;
  readonly responseTime: boolean;
  readonly errorRate: boolean;
  readonly throughput: boolean;
  readonly connectionPool: boolean;
}

/**
 * 协议日志
 */
export interface ProtocolLogging {
  readonly enabled: boolean;
  readonly level: LogLevel;
  readonly includeHeaders: boolean;
  readonly includeBody: boolean;
  readonly sanitization: string[];
}

/**
 * 日志级别
 */
export enum LogLevel {
  TRACE = "TRACE",
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

/**
 * 协议追踪
 */
export interface ProtocolTracing {
  readonly enabled: boolean;
  readonly samplingRate: number;
  readonly propagation: TracingPropagation;
  readonly tags: Record<string, string>;
}

/**
 * 追踪传播
 */
export interface TracingPropagation {
  readonly format: TracingFormat;
  readonly headers: string[];
  readonly baggage: boolean;
}

/**
 * 追踪格式
 */
export enum TracingFormat {
  JAEGER = "JAEGER",
  ZIPKIN = "ZIPKIN",
  OPENTRACING = "OPENTRACING",
  OPENTELEMETRY = "OPENTELEMETRY",
}

/**
 * 数据转换
 */
export interface DataTransformation {
  readonly mappings: DataMapping[];
  readonly validations: DataValidation[];
  readonly transformations: DataTransformationRule[];
  readonly errorHandling: TransformationErrorHandling;
}

/**
 * 数据映射
 */
export interface DataMapping {
  readonly source: FieldMapping;
  readonly target: FieldMapping;
  readonly transformation: string;
  readonly required: boolean;
  readonly defaultValue?: unknown;
}

/**
 * 字段映射
 */
export interface FieldMapping {
  readonly context: string;
  readonly field: string;
  readonly type: string;
  readonly path: string;
  readonly format?: string;
}

/**
 * 数据验证
 */
export interface DataValidation {
  readonly field: string;
  readonly rules: ValidationRule[];
  readonly message: string;
  readonly severity: ValidationSeverity;
}

/**
 * 验证规则
 */
export interface ValidationRule {
  readonly type: ValidationType;
  readonly parameters: Record<string, unknown>;
  readonly condition?: string;
}

/**
 * 验证类型
 */
export enum ValidationType {
  REQUIRED = "REQUIRED",
  TYPE = "TYPE",
  FORMAT = "FORMAT",
  RANGE = "RANGE",
  LENGTH = "LENGTH",
  PATTERN = "PATTERN",
  CUSTOM = "CUSTOM",
}

/**
 * 验证严重性
 */
export enum ValidationSeverity {
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFO = "INFO",
}

/**
 * 数据转换规则
 */
export interface DataTransformationRule {
  readonly id: string;
  readonly name: string;
  readonly type: TransformationType;
  readonly configuration: Record<string, unknown>;
  readonly conditions: string[];
}

/**
 * 转换类型
 */
export enum TransformationType {
  MAP = "MAP",
  FILTER = "FILTER",
  AGGREGATE = "AGGREGATE",
  SPLIT = "SPLIT",
  MERGE = "MERGE",
  ENRICH = "ENRICH",
  NORMALIZE = "NORMALIZE",
  DENORMALIZE = "DENORMALIZE",
}

/**
 * 转换错误处理
 */
export interface TransformationErrorHandling {
  readonly strategy: ErrorHandlingStrategy;
  readonly retries: number;
  readonly fallback: string;
  readonly logging: boolean;
  readonly notification: boolean;
}

/**
 * 错误处理策略
 */
export enum ErrorHandlingStrategy {
  FAIL_FAST = "FAIL_FAST",
  CONTINUE = "CONTINUE",
  RETRY = "RETRY",
  FALLBACK = "FALLBACK",
  PARTIAL = "PARTIAL",
}

/**
 * 冲突解决
 */
export interface ConflictResolution {
  readonly strategy: ConflictStrategy;
  readonly rules: ConflictRule[];
  readonly escalation: EscalationStrategy;
  readonly automation: ConflictAutomation;
}

/**
 * 冲突策略
 */
export enum ConflictStrategy {
  UPSTREAM_WINS = "UPSTREAM_WINS",
  DOWNSTREAM_WINS = "DOWNSTREAM_WINS",
  MERGE = "MERGE",
  MANUAL = "MANUAL",
  VERSIONED = "VERSIONED",
}

/**
 * 冲突规则
 */
export interface ConflictRule {
  readonly condition: string;
  readonly resolution: string;
  readonly priority: number;
  readonly automatic: boolean;
}

/**
 * 升级策略
 */
export interface EscalationStrategy {
  readonly levels: EscalationLevel[];
  readonly timeout: number;
  readonly notification: NotificationStrategy;
}

/**
 * 升级级别
 */
export interface EscalationLevel {
  readonly level: number;
  readonly responsible: string[];
  readonly timeout: number;
  readonly actions: string[];
}

/**
 * 通知策略
 */
export interface NotificationStrategy {
  readonly channels: NotificationChannel[];
  readonly frequency: NotificationFrequency;
  readonly template: string;
}

/**
 * 通知渠道
 */
export enum NotificationChannel {
  EMAIL = "EMAIL",
  SLACK = "SLACK",
  SMS = "SMS",
  WEBHOOK = "WEBHOOK",
  DASHBOARD = "DASHBOARD",
}

/**
 * 通知频率
 */
export enum NotificationFrequency {
  IMMEDIATE = "IMMEDIATE",
  HOURLY = "HOURLY",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
}

/**
 * 冲突自动化
 */
export interface ConflictAutomation {
  readonly enabled: boolean;
  readonly rules: AutomationRule[];
  readonly confidence: number;
  readonly fallback: string;
}

/**
 * 自动化规则
 */
export interface AutomationRule {
  readonly condition: string;
  readonly action: string;
  readonly confidence: number;
  readonly validation: string;
}

/**
 * 治理模型
 */
export interface GovernanceModel {
  readonly framework: GovernanceFramework;
  readonly policies: GovernancePolicy[];
  readonly compliance: ComplianceRequirement[];
  readonly audit: AuditConfiguration;
}

/**
 * 治理框架
 */
export interface GovernanceFramework {
  readonly name: string;
  readonly version: string;
  readonly principles: string[];
  readonly standards: string[];
  readonly guidelines: string[];
}

/**
 * 治理策略
 */
export interface GovernancePolicy {
  readonly id: string;
  readonly name: string;
  readonly type: PolicyType;
  readonly scope: PolicyScope;
  readonly rules: PolicyRule[];
  readonly enforcement: PolicyEnforcement;
}

/**
 * 策略类型
 */
export enum PolicyType {
  TECHNICAL = "TECHNICAL",
  BUSINESS = "BUSINESS",
  SECURITY = "SECURITY",
  COMPLIANCE = "COMPLIANCE",
  OPERATIONAL = "OPERATIONAL",
}

/**
 * 策略范围
 */
export enum PolicyScope {
  GLOBAL = "GLOBAL",
  DOMAIN = "DOMAIN",
  CONTEXT = "CONTEXT",
  MAPPING = "MAPPING",
  ENDPOINT = "ENDPOINT",
}

/**
 * 策略规则
 */
export interface PolicyRule {
  readonly id: string;
  readonly condition: string;
  readonly action: string;
  readonly severity: PolicySeverity;
  readonly exemptions: string[];
}

/**
 * 策略严重性
 */
export enum PolicySeverity {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  INFO = "INFO",
}

/**
 * 策略执行
 */
export interface PolicyEnforcement {
  readonly mode: EnforcementMode;
  readonly automated: boolean;
  readonly reporting: boolean;
  readonly remediation: string;
}

/**
 * 执行模式
 */
export enum EnforcementMode {
  STRICT = "STRICT",
  ADVISORY = "ADVISORY",
  MONITORING = "MONITORING",
  DISABLED = "DISABLED",
}

/**
 * 合规要求
 */
export interface ComplianceRequirement {
  readonly id: string;
  readonly name: string;
  readonly framework: string;
  readonly requirements: string[];
  readonly controls: ComplianceControl[];
  readonly validation: ComplianceValidation;
}

/**
 * 合规控制
 */
export interface ComplianceControl {
  readonly id: string;
  readonly description: string;
  readonly type: ControlType;
  readonly implementation: string;
  readonly testing: string;
}

/**
 * 控制类型
 */
export enum ControlType {
  PREVENTIVE = "PREVENTIVE",
  DETECTIVE = "DETECTIVE",
  CORRECTIVE = "CORRECTIVE",
  COMPENSATING = "COMPENSATING",
}

/**
 * 合规验证
 */
export interface ComplianceValidation {
  readonly frequency: ValidationFrequency;
  readonly methods: ValidationMethod[];
  readonly reporting: ValidationReporting;
  readonly remediation: ValidationRemediation;
}

/**
 * 验证频率
 */
export enum ValidationFrequency {
  CONTINUOUS = "CONTINUOUS",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  ANNUALLY = "ANNUALLY",
}

/**
 * 验证方法
 */
export enum ValidationMethod {
  AUTOMATED = "AUTOMATED",
  MANUAL = "MANUAL",
  HYBRID = "HYBRID",
  THIRD_PARTY = "THIRD_PARTY",
}

/**
 * 验证报告
 */
export interface ValidationReporting {
  readonly format: ReportFormat;
  readonly frequency: ReportFrequency;
  readonly distribution: string[];
  readonly retention: string;
}

/**
 * 报告格式
 */
export enum ReportFormat {
  JSON = "JSON",
  XML = "XML",
  PDF = "PDF",
  HTML = "HTML",
  CSV = "CSV",
}

/**
 * 报告频率
 */
export enum ReportFrequency {
  REAL_TIME = "REAL_TIME",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
}

/**
 * 验证修复
 */
export interface ValidationRemediation {
  readonly automated: boolean;
  readonly procedures: string[];
  readonly escalation: string[];
  readonly timeline: string;
}

/**
 * 审计配置
 */
export interface AuditConfiguration {
  readonly enabled: boolean;
  readonly scope: AuditScope;
  readonly frequency: AuditFrequency;
  readonly retention: string;
  readonly reporting: AuditReporting;
}

/**
 * 审计范围
 */
export enum AuditScope {
  FULL = "FULL",
  INCREMENTAL = "INCREMENTAL",
  SELECTIVE = "SELECTIVE",
  EXCEPTION = "EXCEPTION",
}

/**
 * 审计频率
 */
export enum AuditFrequency {
  CONTINUOUS = "CONTINUOUS",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
}

/**
 * 审计报告
 */
export interface AuditReporting {
  readonly format: ReportFormat;
  readonly distribution: string[];
  readonly classification: string;
  readonly encryption: boolean;
}

/**
 * 映射监控
 */
export interface MappingMonitoring {
  readonly metrics: MappingMetrics;
  readonly alerting: MappingAlerting;
  readonly dashboard: MappingDashboard;
  readonly analytics: MappingAnalytics;
}

/**
 * 映射指标
 */
export interface MappingMetrics {
  readonly performance: PerformanceMetrics;
  readonly reliability: ReliabilityMetrics;
  readonly business: BusinessMetrics;
  readonly technical: TechnicalMetrics;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  readonly responseTime: MetricConfig;
  readonly throughput: MetricConfig;
  readonly latency: MetricConfig;
  readonly utilization: MetricConfig;
}

/**
 * 指标配置
 */
export interface MetricConfig {
  readonly enabled: boolean;
  readonly thresholds: MetricThreshold[];
  readonly aggregation: AggregationType;
  readonly retention: string;
}

/**
 * 指标阈值
 */
export interface MetricThreshold {
  readonly level: ThresholdLevel;
  readonly value: number;
  readonly operator: ThresholdOperator;
  readonly duration: string;
}

/**
 * 阈值级别
 */
export enum ThresholdLevel {
  CRITICAL = "CRITICAL",
  WARNING = "WARNING",
  INFO = "INFO",
}

/**
 * 阈值操作符
 */
export enum ThresholdOperator {
  GREATER_THAN = "GREATER_THAN",
  LESS_THAN = "LESS_THAN",
  EQUAL = "EQUAL",
  NOT_EQUAL = "NOT_EQUAL",
  GREATER_EQUAL = "GREATER_EQUAL",
  LESS_EQUAL = "LESS_EQUAL",
}

/**
 * 聚合类型
 */
export enum AggregationType {
  SUM = "SUM",
  AVERAGE = "AVERAGE",
  MIN = "MIN",
  MAX = "MAX",
  COUNT = "COUNT",
  PERCENTILE = "PERCENTILE",
}

/**
 * 可靠性指标
 */
export interface ReliabilityMetrics {
  readonly availability: MetricConfig;
  readonly errorRate: MetricConfig;
  readonly failureRate: MetricConfig;
  readonly recoveryTime: MetricConfig;
}

/**
 * 业务指标
 */
export interface BusinessMetrics {
  readonly transactionVolume: MetricConfig;
  readonly conversionRate: MetricConfig;
  readonly customerSatisfaction: MetricConfig;
  readonly businessValue: MetricConfig;
}

/**
 * 技术指标
 */
export interface TechnicalMetrics {
  readonly codeQuality: MetricConfig;
  readonly testCoverage: MetricConfig;
  readonly deploymentFrequency: MetricConfig;
  readonly leadTime: MetricConfig;
}

/**
 * 映射告警
 */
export interface MappingAlerting {
  readonly rules: AlertRule[];
  readonly channels: AlertChannel[];
  readonly escalation: AlertEscalation;
  readonly suppression: AlertSuppression;
}

/**
 * 告警规则
 */
export interface AlertRule {
  readonly id: string;
  readonly name: string;
  readonly condition: string;
  readonly severity: AlertSeverity;
  readonly channels: string[];
  readonly throttling: AlertThrottling;
}

/**
 * 告警严重性
 */
export enum AlertSeverity {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  INFO = "INFO",
}

/**
 * 告警渠道
 */
export interface AlertChannel {
  readonly id: string;
  readonly name: string;
  readonly type: AlertChannelType;
  readonly configuration: Record<string, unknown>;
  readonly enabled: boolean;
}

/**
 * 告警渠道类型
 */
export enum AlertChannelType {
  EMAIL = "EMAIL",
  SLACK = "SLACK",
  WEBHOOK = "WEBHOOK",
  SMS = "SMS",
  PAGER = "PAGER",
  DASHBOARD = "DASHBOARD",
}

/**
 * 告警限流
 */
export interface AlertThrottling {
  readonly enabled: boolean;
  readonly window: string;
  readonly maxAlerts: number;
  readonly grouping: string[];
}

/**
 * 告警升级
 */
export interface AlertEscalation {
  readonly enabled: boolean;
  readonly levels: AlertEscalationLevel[];
  readonly timeout: string;
}

/**
 * 告警升级级别
 */
export interface AlertEscalationLevel {
  readonly level: number;
  readonly delay: string;
  readonly channels: string[];
  readonly actions: string[];
}

/**
 * 告警抑制
 */
export interface AlertSuppression {
  readonly enabled: boolean;
  readonly rules: SuppressionRule[];
  readonly schedule: SuppressionSchedule;
}

/**
 * 抑制规则
 */
export interface SuppressionRule {
  readonly condition: string;
  readonly duration: string;
  readonly reason: string;
  readonly automatic: boolean;
}

/**
 * 抑制计划
 */
export interface SuppressionSchedule {
  readonly timezone: string;
  readonly windows: SuppressionWindow[];
  readonly holidays: string[];
}

/**
 * 抑制窗口
 */
export interface SuppressionWindow {
  readonly start: string;
  readonly end: string;
  readonly days: string[];
  readonly recurring: boolean;
}

/**
 * 映射仪表板
 */
export interface MappingDashboard {
  readonly layout: DashboardLayout;
  readonly widgets: DashboardWidget[];
  readonly filters: DashboardFilter[];
  readonly sharing: DashboardSharing;
}

/**
 * 仪表板布局
 */
export interface DashboardLayout {
  readonly type: LayoutType;
  readonly columns: number;
  readonly rows: number;
  readonly responsive: boolean;
}

/**
 * 布局类型
 */
export enum LayoutType {
  GRID = "GRID",
  FLOW = "FLOW",
  TABS = "TABS",
  ACCORDION = "ACCORDION",
}

/**
 * 仪表板组件
 */
export interface DashboardWidget {
  readonly id: string;
  readonly name: string;
  readonly type: WidgetType;
  readonly position: WidgetPosition;
  readonly configuration: WidgetConfiguration;
  readonly datasource: string;
}

/**
 * 组件类型
 */
export enum WidgetType {
  CHART = "CHART",
  TABLE = "TABLE",
  METRIC = "METRIC",
  TEXT = "TEXT",
  MAP = "MAP",
  DIAGRAM = "DIAGRAM",
}

/**
 * 组件位置
 */
export interface WidgetPosition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * 组件配置
 */
export interface WidgetConfiguration {
  readonly query: string;
  readonly visualization: VisualizationConfig;
  readonly refresh: RefreshConfig;
  readonly interactions: InteractionConfig;
}

/**
 * 可视化配置
 */
export interface VisualizationConfig {
  readonly type: VisualizationType;
  readonly options: Record<string, unknown>;
  readonly styling: StylingConfig;
}

/**
 * 可视化类型
 */
export enum VisualizationType {
  LINE = "LINE",
  BAR = "BAR",
  PIE = "PIE",
  SCATTER = "SCATTER",
  HEATMAP = "HEATMAP",
  GAUGE = "GAUGE",
}

/**
 * 样式配置
 */
export interface StylingConfig {
  readonly colors: string[];
  readonly theme: string;
  readonly font: FontConfig;
  readonly spacing: SpacingConfig;
}

/**
 * 字体配置
 */
export interface FontConfig {
  readonly family: string;
  readonly size: number;
  readonly weight: string;
  readonly color: string;
}

/**
 * 间距配置
 */
export interface SpacingConfig {
  readonly margin: number;
  readonly padding: number;
  readonly gap: number;
}

/**
 * 刷新配置
 */
export interface RefreshConfig {
  readonly enabled: boolean;
  readonly interval: string;
  readonly onVisible: boolean;
  readonly onDataChange: boolean;
}

/**
 * 交互配置
 */
export interface InteractionConfig {
  readonly clickable: boolean;
  readonly hoverable: boolean;
  readonly selectable: boolean;
  readonly drilldown: boolean;
}

/**
 * 仪表板过滤器
 */
export interface DashboardFilter {
  readonly id: string;
  readonly name: string;
  readonly type: FilterType;
  readonly values: FilterValue[];
  readonly multi: boolean;
}

/**
 * 过滤器类型
 */
export enum FilterType {
  DROPDOWN = "DROPDOWN",
  TEXT = "TEXT",
  DATE = "DATE",
  RANGE = "RANGE",
  CHECKBOX = "CHECKBOX",
  RADIO = "RADIO",
}

/**
 * 过滤器值
 */
export interface FilterValue {
  readonly value: unknown;
  readonly label: string;
  readonly selected: boolean;
}

/**
 * 仪表板共享
 */
export interface DashboardSharing {
  readonly enabled: boolean;
  readonly public: boolean;
  readonly permissions: SharingPermission[];
  readonly embedding: EmbeddingConfig;
}

/**
 * 共享权限
 */
export interface SharingPermission {
  readonly user: string;
  readonly role: SharingRole;
  readonly permissions: string[];
}

/**
 * 共享角色
 */
export enum SharingRole {
  VIEWER = "VIEWER",
  EDITOR = "EDITOR",
  ADMIN = "ADMIN",
}

/**
 * 嵌入配置
 */
export interface EmbeddingConfig {
  readonly enabled: boolean;
  readonly allowedDomains: string[];
  readonly authentication: boolean;
  readonly customization: EmbeddingCustomization;
}

/**
 * 嵌入自定义
 */
export interface EmbeddingCustomization {
  readonly theme: string;
  readonly branding: boolean;
  readonly navigation: boolean;
  readonly toolbar: boolean;
}

/**
 * 映射分析
 */
export interface MappingAnalytics {
  readonly reports: AnalyticsReport[];
  readonly insights: AnalyticsInsight[];
  readonly predictions: AnalyticsPrediction[];
  readonly optimization: AnalyticsOptimization;
}

/**
 * 分析报告
 */
export interface AnalyticsReport {
  readonly id: string;
  readonly name: string;
  readonly type: ReportType;
  readonly schedule: ReportSchedule;
  readonly configuration: ReportConfiguration;
}

/**
 * 报告类型
 */
export enum ReportType {
  PERFORMANCE = "PERFORMANCE",
  RELIABILITY = "RELIABILITY",
  BUSINESS = "BUSINESS",
  TECHNICAL = "TECHNICAL",
  COMPLIANCE = "COMPLIANCE",
}

/**
 * 报告计划
 */
export interface ReportSchedule {
  readonly frequency: ReportFrequency;
  readonly time: string;
  readonly timezone: string;
  readonly recipients: string[];
}

/**
 * 报告配置
 */
export interface ReportConfiguration {
  readonly period: string;
  readonly metrics: string[];
  readonly format: ReportFormat;
  readonly template: string;
}

/**
 * 分析洞察
 */
export interface AnalyticsInsight {
  readonly id: string;
  readonly type: InsightType;
  readonly title: string;
  readonly description: string;
  readonly severity: InsightSeverity;
  readonly confidence: number;
  readonly recommendations: string[];
}

/**
 * 洞察类型
 */
export enum InsightType {
  ANOMALY = "ANOMALY",
  TREND = "TREND",
  PATTERN = "PATTERN",
  CORRELATION = "CORRELATION",
  OPTIMIZATION = "OPTIMIZATION",
}

/**
 * 洞察严重性
 */
export enum InsightSeverity {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  INFO = "INFO",
}

/**
 * 分析预测
 */
export interface AnalyticsPrediction {
  readonly id: string;
  readonly metric: string;
  readonly horizon: string;
  readonly confidence: number;
  readonly model: PredictionModel;
  readonly forecast: ForecastData[];
}

/**
 * 预测模型
 */
export interface PredictionModel {
  readonly type: ModelType;
  readonly algorithm: string;
  readonly parameters: Record<string, unknown>;
  readonly accuracy: number;
}

/**
 * 模型类型
 */
export enum ModelType {
  LINEAR = "LINEAR",
  POLYNOMIAL = "POLYNOMIAL",
  EXPONENTIAL = "EXPONENTIAL",
  LSTM = "LSTM",
  ARIMA = "ARIMA",
  PROPHET = "PROPHET",
}

/**
 * 预测数据
 */
export interface ForecastData {
  readonly timestamp: string;
  readonly value: number;
  readonly confidence: ConfidenceInterval;
}

/**
 * 置信区间
 */
export interface ConfidenceInterval {
  readonly lower: number;
  readonly upper: number;
  readonly level: number;
}

/**
 * 分析优化
 */
export interface AnalyticsOptimization {
  readonly enabled: boolean;
  readonly algorithms: OptimizationAlgorithm[];
  readonly objectives: OptimizationObjective[];
  readonly constraints: OptimizationConstraint[];
}

/**
 * 优化算法
 */
export interface OptimizationAlgorithm {
  readonly name: string;
  readonly type: AlgorithmType;
  readonly parameters: Record<string, unknown>;
  readonly enabled: boolean;
}

/**
 * 算法类型
 */
export enum AlgorithmType {
  GENETIC = "GENETIC",
  PARTICLE_SWARM = "PARTICLE_SWARM",
  SIMULATED_ANNEALING = "SIMULATED_ANNEALING",
  GRADIENT_DESCENT = "GRADIENT_DESCENT",
  BAYESIAN = "BAYESIAN",
}

/**
 * 优化目标
 */
export interface OptimizationObjective {
  readonly name: string;
  readonly type: ObjectiveType;
  readonly weight: number;
  readonly target: number;
}

/**
 * 目标类型
 */
export enum ObjectiveType {
  MINIMIZE = "MINIMIZE",
  MAXIMIZE = "MAXIMIZE",
  TARGET = "TARGET",
}

/**
 * 优化约束
 */
export interface OptimizationConstraint {
  readonly name: string;
  readonly type: ConstraintType;
  readonly condition: string;
  readonly penalty: number;
}

/**
 * 约束类型
 */
export enum ConstraintType {
  EQUALITY = "EQUALITY",
  INEQUALITY = "INEQUALITY",
  BOUNDARY = "BOUNDARY",
  RESOURCE = "RESOURCE",
}
