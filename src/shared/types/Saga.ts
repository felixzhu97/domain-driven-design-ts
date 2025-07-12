/**
 * Saga状态枚举
 */
export enum SagaStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  COMPENSATING = "COMPENSATING",
  COMPENSATED = "COMPENSATED",
  CANCELLED = "CANCELLED",
}

/**
 * Saga步骤状态枚举
 */
export enum SagaStepStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  COMPENSATING = "COMPENSATING",
  COMPENSATED = "COMPENSATED",
  SKIPPED = "SKIPPED",
}

/**
 * Saga步骤结果
 */
export interface SagaStepResult {
  success: boolean;
  error?: string;
  data?: any;
  compensationData?: any;
}

/**
 * Saga步骤接口
 */
export interface ISagaStep {
  /**
   * 步骤名称
   */
  readonly stepName: string;

  /**
   * 步骤描述
   */
  readonly description?: string;

  /**
   * 执行步骤
   */
  execute(context: SagaContext): Promise<SagaStepResult>;

  /**
   * 补偿步骤
   */
  compensate(context: SagaContext): Promise<SagaStepResult>;

  /**
   * 是否可以跳过
   */
  canSkip?(context: SagaContext): Promise<boolean>;

  /**
   * 是否可以重试
   */
  canRetry?(context: SagaContext): Promise<boolean>;

  /**
   * 获取重试延迟（毫秒）
   */
  getRetryDelay?(attempt: number): number;
}

/**
 * Saga上下文
 */
export interface SagaContext {
  sagaId: string;
  sagaType: string;
  correlationId: string;
  data: Record<string, any>;
  stepResults: Record<string, SagaStepResult>;
  currentStep: number;
  totalSteps: number;
  retryCount: number;
  maxRetries: number;
  startedAt: Date;
  updatedAt: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Saga步骤执行历史
 */
export interface SagaStepHistory {
  stepName: string;
  status: SagaStepStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  attempt: number;
  error?: string;
  result?: SagaStepResult;
}

/**
 * Saga实例
 */
export interface SagaInstance {
  sagaId: string;
  sagaType: string;
  correlationId: string;
  status: SagaStatus;
  context: SagaContext;
  steps: ISagaStep[];
  stepHistory: SagaStepHistory[];
  currentStepIndex: number;
  completedSteps: number;
  failedSteps: number;
  compensatedSteps: number;
  totalSteps: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  createdBy?: string;
  updatedBy?: string;
  version: number;
}

/**
 * Saga配置
 */
export interface SagaConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  enableCompensation: boolean;
  enablePersistence: boolean;
  enableLogging: boolean;
  enableMetrics: boolean;
}

/**
 * Saga接口
 */
export interface ISaga {
  /**
   * Saga类型
   */
  readonly sagaType: string;

  /**
   * Saga描述
   */
  readonly description?: string;

  /**
   * 获取Saga步骤
   */
  getSteps(): ISagaStep[];

  /**
   * 创建Saga上下文
   */
  createContext(
    correlationId: string,
    data: Record<string, any>,
    userId?: string
  ): SagaContext;

  /**
   * 验证Saga数据
   */
  validateData?(data: Record<string, any>): Promise<boolean>;

  /**
   * 获取Saga配置
   */
  getConfig?(): SagaConfig;

  /**
   * Saga完成时的回调
   */
  onCompleted?(context: SagaContext): Promise<void>;

  /**
   * Saga失败时的回调
   */
  onFailed?(context: SagaContext, error: string): Promise<void>;

  /**
   * Saga补偿完成时的回调
   */
  onCompensated?(context: SagaContext): Promise<void>;
}

/**
 * Saga管理器接口
 */
export interface ISagaManager {
  /**
   * 注册Saga
   */
  registerSaga(saga: ISaga): void;

  /**
   * 启动Saga
   */
  startSaga(
    sagaType: string,
    correlationId: string,
    data: Record<string, any>,
    userId?: string
  ): Promise<string>;

  /**
   * 恢复Saga
   */
  resumeSaga(sagaId: string): Promise<void>;

  /**
   * 取消Saga
   */
  cancelSaga(sagaId: string, reason?: string): Promise<void>;

  /**
   * 获取Saga实例
   */
  getSaga(sagaId: string): Promise<SagaInstance | null>;

  /**
   * 获取Saga列表
   */
  getSagas(filter?: {
    sagaType?: string;
    status?: SagaStatus;
    correlationId?: string;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<SagaInstance[]>;

  /**
   * 获取Saga统计
   */
  getStatistics(): Promise<{
    totalSagas: number;
    runningStagas: number;
    completedSagas: number;
    failedSagas: number;
    compensatedSagas: number;
    averageExecutionTime: number;
    sagasByType: Record<string, number>;
    sagasByStatus: Record<string, number>;
  }>;

  /**
   * 启动管理器
   */
  start(): Promise<void>;

  /**
   * 停止管理器
   */
  stop(): Promise<void>;
}

/**
 * Saga存储接口
 */
export interface ISagaStore {
  /**
   * 保存Saga实例
   */
  saveSaga(saga: SagaInstance): Promise<void>;

  /**
   * 获取Saga实例
   */
  getSaga(sagaId: string): Promise<SagaInstance | null>;

  /**
   * 更新Saga状态
   */
  updateSagaStatus(sagaId: string, status: SagaStatus): Promise<void>;

  /**
   * 更新Saga上下文
   */
  updateSagaContext(sagaId: string, context: SagaContext): Promise<void>;

  /**
   * 添加步骤历史
   */
  addStepHistory(sagaId: string, stepHistory: SagaStepHistory): Promise<void>;

  /**
   * 获取待处理的Saga
   */
  getPendingSagas(): Promise<SagaInstance[]>;

  /**
   * 获取超时的Saga
   */
  getTimeoutSagas(timeout: number): Promise<SagaInstance[]>;

  /**
   * 删除Saga
   */
  deleteSaga(sagaId: string): Promise<void>;

  /**
   * 查询Saga
   */
  querySagas(filter: {
    sagaType?: string;
    status?: SagaStatus;
    correlationId?: string;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<SagaInstance[]>;

  /**
   * 获取Saga统计信息
   */
  getStatistics(): Promise<{
    totalSagas: number;
    sagasByStatus: Record<string, number>;
    sagasByType: Record<string, number>;
    averageExecutionTime: number;
  }>;
}

/**
 * Saga事件
 */
export interface SagaEvent {
  eventId: string;
  sagaId: string;
  sagaType: string;
  eventType: string;
  eventData: any;
  occurredAt: Date;
  correlationId: string;
  stepName?: string;
  userId?: string;
}

/**
 * Saga异常
 */
export class SagaError extends Error {
  constructor(
    message: string,
    public readonly sagaId: string,
    public readonly stepName?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "SagaError";
  }
}

/**
 * Saga步骤异常
 */
export class SagaStepError extends SagaError {
  constructor(
    message: string,
    sagaId: string,
    stepName: string,
    public readonly retryable: boolean = false,
    cause?: Error
  ) {
    super(message, sagaId, stepName, cause);
    this.name = "SagaStepError";
  }
}

/**
 * Saga超时异常
 */
export class SagaTimeoutError extends SagaError {
  constructor(
    sagaId: string,
    public readonly timeoutMs: number,
    stepName?: string
  ) {
    super(`Saga ${sagaId} timed out after ${timeoutMs}ms`, sagaId, stepName);
    this.name = "SagaTimeoutError";
  }
}

/**
 * Saga取消异常
 */
export class SagaCancellationError extends SagaError {
  constructor(
    sagaId: string,
    public readonly reason: string,
    stepName?: string
  ) {
    super(`Saga ${sagaId} was cancelled: ${reason}`, sagaId, stepName);
    this.name = "SagaCancellationError";
  }
}
