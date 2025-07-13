/**
 * 支付网关防腐层适配器
 */

import { Money } from "../../domain/value-objects";
import {
  PaymentMethod,
  PaymentType,
} from "../../domain/value-objects/PaymentMethod";
import { Payment, PaymentStatus } from "../../domain/entities/Payment";
import { EntityId } from "../../shared/types";
import {
  AntiCorruptionLayerAdapter,
  AntiCorruptionLayerConfig,
  DataTransformer,
  ExternalSystemResponse,
} from "./AntiCorruptionLayer";
import {
  ThirdPartyPaymentGateway,
  ThirdPartyPaymentRequest,
  ThirdPartyPaymentResponse,
  ThirdPartyPaymentQueryResponse,
  ThirdPartyRefundRequest,
  ThirdPartyRefundResponse,
  MockPaymentGateway,
} from "../external-systems/ExternalSystemMocks";

/**
 * 内部支付数据模型
 */
export interface InternalPaymentData {
  readonly orderId: EntityId;
  readonly customerId: EntityId;
  readonly amount: Money;
  readonly paymentMethod: PaymentMethod;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * 内部支付结果模型
 */
export interface InternalPaymentResult {
  readonly transactionId: string;
  readonly orderId: EntityId;
  readonly status: PaymentStatus;
  readonly amount: Money;
  readonly paymentUrl?: string;
  readonly qrCode?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * 内部退款数据模型
 */
export interface InternalRefundData {
  readonly transactionId: string;
  readonly refundId: string;
  readonly amount: Money;
  readonly reason: string;
}

/**
 * 内部退款结果模型
 */
export interface InternalRefundResult {
  readonly refundId: string;
  readonly transactionId: string;
  readonly amount: Money;
  readonly status: "PROCESSING" | "SUCCESS" | "FAILED";
  readonly processedAt?: Date;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * 支付数据转换器
 */
export class PaymentDataTransformer
  implements DataTransformer<InternalPaymentData, ThirdPartyPaymentRequest>
{
  private readonly merchantId: string;

  constructor(merchantId: string) {
    this.merchantId = merchantId;
  }

  toExternal(internal: InternalPaymentData): ThirdPartyPaymentRequest {
    return {
      merchant_id: this.merchantId,
      out_trade_no: internal.orderId,
      total_amount: internal.amount.amount,
      currency: internal.amount.currency,
      subject: internal.description || "订单支付",
      body: internal.description,
      payment_method: this.mapPaymentMethod(internal.paymentMethod.type),
      user_id: internal.customerId,
      timeout_express: "30m",
      metadata: internal.metadata,
    };
  }

  fromExternal(external: ThirdPartyPaymentResponse): InternalPaymentData {
    throw new Error(
      "Cannot convert external payment response to internal payment data"
    );
  }

  validateExternal(external: unknown): external is ThirdPartyPaymentRequest {
    const req = external as ThirdPartyPaymentRequest;
    return !!(
      req &&
      typeof req.merchant_id === "string" &&
      typeof req.out_trade_no === "string" &&
      typeof req.total_amount === "number" &&
      typeof req.currency === "string" &&
      typeof req.subject === "string" &&
      typeof req.payment_method === "string"
    );
  }

  validateInternal(internal: unknown): internal is InternalPaymentData {
    const data = internal as InternalPaymentData;
    return !!(
      data &&
      data.orderId &&
      data.customerId &&
      data.amount &&
      data.paymentMethod
    );
  }

  private mapPaymentMethod(type: PaymentType): string {
    switch (type) {
      case PaymentType.CREDIT_CARD:
        return "credit_card";
      case PaymentType.DEBIT_CARD:
        return "debit_card";
      case PaymentType.BANK_TRANSFER:
        return "bank_transfer";
      case PaymentType.DIGITAL_WALLET:
        return "digital_wallet";
      case PaymentType.CASH_ON_DELIVERY:
        return "cash_on_delivery";
      case PaymentType.CRYPTOCURRENCY:
        return "cryptocurrency";
      default:
        return "unknown";
    }
  }
}

/**
 * 支付结果转换器
 */
export class PaymentResultTransformer
  implements DataTransformer<InternalPaymentResult, ThirdPartyPaymentResponse>
{
  toExternal(internal: InternalPaymentResult): ThirdPartyPaymentResponse {
    return {
      trade_no: internal.transactionId,
      out_trade_no: internal.orderId,
      status: this.mapInternalToExternalStatus(internal.status),
      total_amount: internal.amount.amount,
      currency: internal.amount.currency,
      payment_url: internal.paymentUrl,
      qr_code: internal.qrCode,
      created_time: internal.createdAt.toISOString(),
      updated_time: internal.updatedAt.toISOString(),
      error_code: internal.error?.code,
      error_msg: internal.error?.message,
    };
  }

  fromExternal(external: ThirdPartyPaymentResponse): InternalPaymentResult {
    return {
      transactionId: external.trade_no,
      orderId: external.out_trade_no,
      status: this.mapExternalToInternalStatus(external.status),
      amount: Money.fromCents(external.total_amount, external.currency as any),
      paymentUrl: external.payment_url,
      qrCode: external.qr_code,
      createdAt: new Date(external.created_time),
      updatedAt: new Date(external.updated_time),
      error: external.error_code
        ? {
            code: external.error_code,
            message: external.error_msg || "Unknown error",
          }
        : undefined,
    };
  }

  validateExternal(external: unknown): external is ThirdPartyPaymentResponse {
    const resp = external as ThirdPartyPaymentResponse;
    return !!(
      resp &&
      typeof resp.trade_no === "string" &&
      typeof resp.out_trade_no === "string" &&
      typeof resp.status === "string" &&
      typeof resp.total_amount === "number" &&
      typeof resp.currency === "string" &&
      typeof resp.created_time === "string" &&
      typeof resp.updated_time === "string"
    );
  }

  validateInternal(internal: unknown): internal is InternalPaymentResult {
    const result = internal as InternalPaymentResult;
    return !!(
      result &&
      result.transactionId &&
      result.orderId &&
      result.status &&
      result.amount &&
      result.createdAt &&
      result.updatedAt
    );
  }

  private mapExternalToInternalStatus(status: string): PaymentStatus {
    switch (status) {
      case "CREATED":
        return PaymentStatus.PENDING;
      case "PROCESSING":
        return PaymentStatus.PROCESSING;
      case "SUCCESS":
        return PaymentStatus.SUCCEEDED;
      case "FAILED":
        return PaymentStatus.FAILED;
      case "CANCELLED":
        return PaymentStatus.CANCELLED;
      default:
        return PaymentStatus.FAILED;
    }
  }

  private mapInternalToExternalStatus(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.PENDING:
        return "CREATED";
      case PaymentStatus.PROCESSING:
        return "PROCESSING";
      case PaymentStatus.SUCCEEDED:
        return "SUCCESS";
      case PaymentStatus.FAILED:
        return "FAILED";
      case PaymentStatus.CANCELLED:
        return "CANCELLED";
      case PaymentStatus.TIMEOUT:
        return "FAILED";
      default:
        return "FAILED";
    }
  }
}

/**
 * 退款数据转换器
 */
export class RefundDataTransformer
  implements DataTransformer<InternalRefundData, ThirdPartyRefundRequest>
{
  toExternal(internal: InternalRefundData): ThirdPartyRefundRequest {
    return {
      trade_no: internal.transactionId,
      out_refund_no: internal.refundId,
      refund_amount: internal.amount.amount,
      refund_reason: internal.reason,
    };
  }

  fromExternal(external: ThirdPartyRefundRequest): InternalRefundData {
    return {
      transactionId: external.trade_no,
      refundId: external.out_refund_no,
      amount: Money.fromCents(external.refund_amount, "CNY"), // 假设默认为CNY
      reason: external.refund_reason,
    };
  }

  validateExternal(external: unknown): external is ThirdPartyRefundRequest {
    const req = external as ThirdPartyRefundRequest;
    return !!(
      req &&
      typeof req.trade_no === "string" &&
      typeof req.out_refund_no === "string" &&
      typeof req.refund_amount === "number" &&
      typeof req.refund_reason === "string"
    );
  }

  validateInternal(internal: unknown): internal is InternalRefundData {
    const data = internal as InternalRefundData;
    return !!(
      data &&
      data.transactionId &&
      data.refundId &&
      data.amount &&
      data.reason
    );
  }
}

/**
 * 退款结果转换器
 */
export class RefundResultTransformer
  implements DataTransformer<InternalRefundResult, ThirdPartyRefundResponse>
{
  toExternal(internal: InternalRefundResult): ThirdPartyRefundResponse {
    return {
      refund_id: internal.refundId,
      trade_no: internal.transactionId,
      out_refund_no: internal.refundId,
      refund_amount: internal.amount.amount,
      status: internal.status,
      refund_time: internal.processedAt?.toISOString(),
      error_code: internal.error?.code,
      error_msg: internal.error?.message,
    };
  }

  fromExternal(external: ThirdPartyRefundResponse): InternalRefundResult {
    return {
      refundId: external.refund_id,
      transactionId: external.trade_no,
      amount: Money.fromCents(external.refund_amount, "CNY"), // 假设默认为CNY
      status: external.status,
      processedAt: external.refund_time
        ? new Date(external.refund_time)
        : undefined,
      error: external.error_code
        ? {
            code: external.error_code,
            message: external.error_msg || "Unknown error",
          }
        : undefined,
    };
  }

  validateExternal(external: unknown): external is ThirdPartyRefundResponse {
    const resp = external as ThirdPartyRefundResponse;
    return !!(
      resp &&
      typeof resp.refund_id === "string" &&
      typeof resp.trade_no === "string" &&
      typeof resp.out_refund_no === "string" &&
      typeof resp.refund_amount === "number" &&
      typeof resp.status === "string"
    );
  }

  validateInternal(internal: unknown): internal is InternalRefundResult {
    const result = internal as InternalRefundResult;
    return !!(
      result &&
      result.refundId &&
      result.transactionId &&
      result.amount &&
      result.status
    );
  }
}

/**
 * 支付网关防腐层适配器
 */
export class PaymentGatewayAdapter extends AntiCorruptionLayerAdapter<
  InternalPaymentData,
  ThirdPartyPaymentRequest
> {
  private readonly gateway: ThirdPartyPaymentGateway;
  private readonly paymentResultTransformer: PaymentResultTransformer;
  private readonly refundDataTransformer: RefundDataTransformer;
  private readonly refundResultTransformer: RefundResultTransformer;

  constructor(
    config: AntiCorruptionLayerConfig,
    gateway: ThirdPartyPaymentGateway = new MockPaymentGateway()
  ) {
    super(
      config,
      new PaymentDataTransformer(
        config.authentication.credentials.merchantId || "MERCHANT_001"
      )
    );
    this.gateway = gateway;
    this.paymentResultTransformer = new PaymentResultTransformer();
    this.refundDataTransformer = new RefundDataTransformer();
    this.refundResultTransformer = new RefundResultTransformer();
  }

  /**
   * 创建支付
   */
  async createPayment(
    paymentData: InternalPaymentData
  ): Promise<ExternalSystemResponse<InternalPaymentResult>> {
    const externalRequest = this.transformer.toExternal(paymentData);

    return this.executeExternalCall(
      "createPayment",
      async () => {
        const response = await this.gateway.createPayment(externalRequest);
        return this.paymentResultTransformer.fromExternal(response);
      },
      `payment:${paymentData.orderId}`
    );
  }

  /**
   * 查询支付状态
   */
  async queryPayment(
    transactionId: string
  ): Promise<ExternalSystemResponse<InternalPaymentResult>> {
    return this.executeExternalCall(
      "queryPayment",
      async () => {
        const response = await this.gateway.queryPayment(transactionId);
        return this.paymentResultTransformer.fromExternal({
          trade_no: response.trade_no,
          out_trade_no: response.out_trade_no,
          status: response.status,
          total_amount: response.total_amount,
          currency: response.currency,
          payment_url: undefined,
          qr_code: undefined,
          created_time: response.created_time,
          updated_time: response.updated_time,
          error_code: response.error_code,
          error_msg: response.error_msg,
        });
      },
      `payment_query:${transactionId}`
    );
  }

  /**
   * 退款
   */
  async refundPayment(
    refundData: InternalRefundData
  ): Promise<ExternalSystemResponse<InternalRefundResult>> {
    const externalRequest = this.refundDataTransformer.toExternal(refundData);

    return this.executeExternalCall(
      "refundPayment",
      async () => {
        const response = await this.gateway.refundPayment(externalRequest);
        return this.refundResultTransformer.fromExternal(response);
      },
      `refund:${refundData.refundId}`
    );
  }

  /**
   * 取消支付
   */
  async cancelPayment(
    transactionId: string
  ): Promise<ExternalSystemResponse<boolean>> {
    return this.executeExternalCall(
      "cancelPayment",
      async () => {
        const response = await this.gateway.cancelPayment(transactionId);
        return response.status === "CANCELLED";
      },
      `cancel:${transactionId}`
    );
  }

  protected getErrorCode(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return "UNKNOWN_ERROR";
  }

  protected getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return "Unknown error occurred";
  }

  protected getErrorDetails(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return { error };
  }
}

/**
 * 支付网关防腐层配置工厂
 */
export class PaymentGatewayConfigFactory {
  static createConfig(merchantId: string): AntiCorruptionLayerConfig {
    return {
      externalSystemName: "PaymentGateway",
      baseUrl: "https://api.payment-gateway.com",
      authentication: {
        type: "API_KEY",
        credentials: {
          merchantId,
          apiKey: "mock-api-key",
        },
      },
      timeout: {
        connect: 5000,
        read: 10000,
        write: 10000,
      },
      retryPolicy: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: [
          "NETWORK_ERROR",
          "TIMEOUT",
          "SERVER_ERROR",
          "RATE_LIMIT_EXCEEDED",
        ],
      },
      cache: {
        enabled: true,
        ttl: 300, // 5分钟
        maxSize: 1000,
      },
      monitoring: {
        enabled: true,
        metricsCollectionInterval: 60, // 1分钟
        alertThresholds: {
          errorRate: 0.1, // 10%
          latency: 5000, // 5秒
        },
      },
    };
  }
}
