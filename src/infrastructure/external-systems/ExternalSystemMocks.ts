/**
 * 外部系统模拟实现
 *
 * 模拟第三方支付网关、物流系统、库存系统等外部服务
 */

import { Money } from "../../domain/value-objects";
import { EntityId } from "../../shared/types";

/**
 * 第三方支付网关模拟
 */
export interface ThirdPartyPaymentGateway {
  createPayment(
    request: ThirdPartyPaymentRequest
  ): Promise<ThirdPartyPaymentResponse>;
  queryPayment(transactionId: string): Promise<ThirdPartyPaymentQueryResponse>;
  refundPayment(
    request: ThirdPartyRefundRequest
  ): Promise<ThirdPartyRefundResponse>;
  cancelPayment(transactionId: string): Promise<ThirdPartyCancelResponse>;
}

export interface ThirdPartyPaymentRequest {
  merchant_id: string;
  out_trade_no: string; // 商户订单号
  total_amount: number; // 以分为单位
  currency: string;
  subject: string;
  body?: string;
  payment_method: string;
  notify_url?: string;
  return_url?: string;
  timeout_express?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ThirdPartyPaymentResponse {
  trade_no: string; // 第三方交易号
  out_trade_no: string; // 商户订单号
  status: "CREATED" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED";
  total_amount: number;
  currency: string;
  payment_url?: string;
  qr_code?: string;
  created_time: string;
  updated_time: string;
  error_code?: string;
  error_msg?: string;
  metadata?: Record<string, unknown>;
}

export interface ThirdPartyPaymentQueryResponse {
  trade_no: string;
  out_trade_no: string;
  status: "CREATED" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED";
  total_amount: number;
  currency: string;
  paid_amount?: number;
  payment_method: string;
  transaction_id?: string;
  created_time: string;
  updated_time: string;
  paid_time?: string;
  error_code?: string;
  error_msg?: string;
}

export interface ThirdPartyRefundRequest {
  trade_no: string;
  out_refund_no: string;
  refund_amount: number;
  refund_reason: string;
  notify_url?: string;
}

export interface ThirdPartyRefundResponse {
  refund_id: string;
  trade_no: string;
  out_refund_no: string;
  refund_amount: number;
  status: "PROCESSING" | "SUCCESS" | "FAILED";
  refund_time?: string;
  error_code?: string;
  error_msg?: string;
}

export interface ThirdPartyCancelResponse {
  trade_no: string;
  status: "CANCELLED" | "FAILED";
  cancelled_time?: string;
  error_code?: string;
  error_msg?: string;
}

/**
 * 支付网关模拟实现
 */
export class MockPaymentGateway implements ThirdPartyPaymentGateway {
  private payments: Map<string, ThirdPartyPaymentQueryResponse> = new Map();
  private refunds: Map<string, ThirdPartyRefundResponse> = new Map();
  private nextTradeNo = 1;

  async createPayment(
    request: ThirdPartyPaymentRequest
  ): Promise<ThirdPartyPaymentResponse> {
    // 模拟网络延迟
    await this.delay(200 + Math.random() * 300);

    // 模拟偶发错误
    if (Math.random() < 0.1) {
      throw new Error("NETWORK_ERROR");
    }

    const tradeNo = `TXN_${this.nextTradeNo++}_${Date.now()}`;
    const now = new Date().toISOString();

    const payment: ThirdPartyPaymentQueryResponse = {
      trade_no: tradeNo,
      out_trade_no: request.out_trade_no,
      status: "CREATED",
      total_amount: request.total_amount,
      currency: request.currency,
      payment_method: request.payment_method,
      created_time: now,
      updated_time: now,
    };

    this.payments.set(tradeNo, payment);

    // 异步处理支付（模拟）
    this.processPaymentAsync(tradeNo);

    return {
      trade_no: tradeNo,
      out_trade_no: request.out_trade_no,
      status: "CREATED",
      total_amount: request.total_amount,
      currency: request.currency,
      payment_url: `https://mock-gateway.com/pay/${tradeNo}`,
      qr_code: `QR_CODE_${tradeNo}`,
      created_time: now,
      updated_time: now,
    };
  }

  async queryPayment(
    transactionId: string
  ): Promise<ThirdPartyPaymentQueryResponse> {
    await this.delay(100 + Math.random() * 200);

    const payment = this.payments.get(transactionId);
    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    return { ...payment };
  }

  async refundPayment(
    request: ThirdPartyRefundRequest
  ): Promise<ThirdPartyRefundResponse> {
    await this.delay(300 + Math.random() * 500);

    const payment = this.payments.get(request.trade_no);
    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    if (payment.status !== "SUCCESS") {
      throw new Error("PAYMENT_NOT_PAID");
    }

    const refundId = `REF_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const refund: ThirdPartyRefundResponse = {
      refund_id: refundId,
      trade_no: request.trade_no,
      out_refund_no: request.out_refund_no,
      refund_amount: request.refund_amount,
      status: "PROCESSING",
    };

    this.refunds.set(refundId, refund);

    // 异步处理退款
    this.processRefundAsync(refundId);

    return refund;
  }

  async cancelPayment(
    transactionId: string
  ): Promise<ThirdPartyCancelResponse> {
    await this.delay(150 + Math.random() * 250);

    const payment = this.payments.get(transactionId);
    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    if (payment.status === "SUCCESS") {
      throw new Error("PAYMENT_ALREADY_PAID");
    }

    payment.status = "CANCELLED";
    payment.updated_time = new Date().toISOString();

    return {
      trade_no: transactionId,
      status: "CANCELLED",
      cancelled_time: new Date().toISOString(),
    };
  }

  private async processPaymentAsync(tradeNo: string): Promise<void> {
    // 模拟支付处理时间
    await this.delay(2000 + Math.random() * 3000);

    const payment = this.payments.get(tradeNo);
    if (!payment) return;

    // 模拟支付结果（90%成功率）
    const success = Math.random() < 0.9;

    payment.status = success ? "SUCCESS" : "FAILED";
    payment.updated_time = new Date().toISOString();

    if (success) {
      payment.paid_amount = payment.total_amount;
      payment.paid_time = new Date().toISOString();
      payment.transaction_id = `TXN_${Date.now()}`;
    } else {
      payment.error_code = "PAYMENT_FAILED";
      payment.error_msg = "Payment processing failed";
    }
  }

  private async processRefundAsync(refundId: string): Promise<void> {
    await this.delay(1000 + Math.random() * 2000);

    const refund = this.refunds.get(refundId);
    if (!refund) return;

    // 模拟退款结果（95%成功率）
    const success = Math.random() < 0.95;

    refund.status = success ? "SUCCESS" : "FAILED";

    if (success) {
      refund.refund_time = new Date().toISOString();
    } else {
      refund.error_code = "REFUND_FAILED";
      refund.error_msg = "Refund processing failed";
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 物流系统模拟
 */
export interface ThirdPartyLogisticsSystem {
  createShipment(
    request: ThirdPartyShipmentRequest
  ): Promise<ThirdPartyShipmentResponse>;
  queryShipment(
    trackingNumber: string
  ): Promise<ThirdPartyShipmentQueryResponse>;
  cancelShipment(
    trackingNumber: string
  ): Promise<ThirdPartyShipmentCancelResponse>;
}

export interface ThirdPartyShipmentRequest {
  order_id: string;
  sender: {
    name: string;
    phone: string;
    address: string;
    city: string;
    province: string;
    country: string;
    postal_code: string;
  };
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
    province: string;
    country: string;
    postal_code: string;
  };
  package_info: {
    weight: number; // 重量(克)
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    description: string;
    value: number; // 价值(分)
  };
  service_type: "STANDARD" | "EXPRESS" | "OVERNIGHT";
  insurance?: boolean;
  signature_required?: boolean;
  delivery_instructions?: string;
}

export interface ThirdPartyShipmentResponse {
  tracking_number: string;
  order_id: string;
  status: "CREATED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  estimated_delivery: string;
  shipping_cost: number;
  created_time: string;
  carrier: string;
  service_type: string;
}

export interface ThirdPartyShipmentQueryResponse {
  tracking_number: string;
  order_id: string;
  status: "CREATED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  current_location?: string;
  estimated_delivery: string;
  actual_delivery?: string;
  shipping_cost: number;
  created_time: string;
  updated_time: string;
  carrier: string;
  service_type: string;
  tracking_events: Array<{
    status: string;
    description: string;
    location: string;
    timestamp: string;
  }>;
}

export interface ThirdPartyShipmentCancelResponse {
  tracking_number: string;
  status: "CANCELLED" | "CANNOT_CANCEL";
  cancelled_time?: string;
  refund_amount?: number;
  error_code?: string;
  error_msg?: string;
}

/**
 * 物流系统模拟实现
 */
export class MockLogisticsSystem implements ThirdPartyLogisticsSystem {
  private shipments: Map<string, ThirdPartyShipmentQueryResponse> = new Map();
  private nextTrackingNumber = 1;

  async createShipment(
    request: ThirdPartyShipmentRequest
  ): Promise<ThirdPartyShipmentResponse> {
    await this.delay(500 + Math.random() * 1000);

    const trackingNumber = `TRK${this.nextTrackingNumber++}${Date.now()}`;
    const now = new Date().toISOString();

    // 根据服务类型计算预计送达时间
    const deliveryDays = this.getDeliveryDays(request.service_type);
    const estimatedDelivery = new Date(
      Date.now() + deliveryDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const shipment: ThirdPartyShipmentQueryResponse = {
      tracking_number: trackingNumber,
      order_id: request.order_id,
      status: "CREATED",
      estimated_delivery: estimatedDelivery,
      shipping_cost: this.calculateShippingCost(request),
      created_time: now,
      updated_time: now,
      carrier: "Mock Express",
      service_type: request.service_type,
      tracking_events: [
        {
          status: "CREATED",
          description: "Shipment created",
          location: "Origin facility",
          timestamp: now,
        },
      ],
    };

    this.shipments.set(trackingNumber, shipment);

    // 异步处理物流状态更新
    this.processShipmentAsync(trackingNumber);

    return {
      tracking_number: trackingNumber,
      order_id: request.order_id,
      status: "CREATED",
      estimated_delivery: estimatedDelivery,
      shipping_cost: shipment.shipping_cost,
      created_time: now,
      carrier: "Mock Express",
      service_type: request.service_type,
    };
  }

  async queryShipment(
    trackingNumber: string
  ): Promise<ThirdPartyShipmentQueryResponse> {
    await this.delay(200 + Math.random() * 300);

    const shipment = this.shipments.get(trackingNumber);
    if (!shipment) {
      throw new Error("SHIPMENT_NOT_FOUND");
    }

    return { ...shipment };
  }

  async cancelShipment(
    trackingNumber: string
  ): Promise<ThirdPartyShipmentCancelResponse> {
    await this.delay(300 + Math.random() * 500);

    const shipment = this.shipments.get(trackingNumber);
    if (!shipment) {
      throw new Error("SHIPMENT_NOT_FOUND");
    }

    if (shipment.status === "DELIVERED") {
      return {
        tracking_number: trackingNumber,
        status: "CANNOT_CANCEL",
        error_code: "ALREADY_DELIVERED",
        error_msg: "Cannot cancel delivered shipment",
      };
    }

    if (shipment.status !== "CREATED") {
      return {
        tracking_number: trackingNumber,
        status: "CANNOT_CANCEL",
        error_code: "SHIPMENT_IN_TRANSIT",
        error_msg: "Cannot cancel shipment in transit",
      };
    }

    shipment.status = "CANCELLED";
    shipment.updated_time = new Date().toISOString();

    return {
      tracking_number: trackingNumber,
      status: "CANCELLED",
      cancelled_time: new Date().toISOString(),
      refund_amount: shipment.shipping_cost,
    };
  }

  private getDeliveryDays(serviceType: string): number {
    switch (serviceType) {
      case "OVERNIGHT":
        return 1;
      case "EXPRESS":
        return 2;
      case "STANDARD":
      default:
        return 5;
    }
  }

  private calculateShippingCost(request: ThirdPartyShipmentRequest): number {
    const { weight, dimensions } = request.package_info;
    const volumeWeight =
      (dimensions.length * dimensions.width * dimensions.height) / 5000;
    const chargeableWeight = Math.max(weight, volumeWeight);

    let baseCost = Math.ceil(chargeableWeight / 1000) * 1000; // 基础费用(分)

    // 服务类型加成
    switch (request.service_type) {
      case "OVERNIGHT":
        baseCost *= 3;
        break;
      case "EXPRESS":
        baseCost *= 2;
        break;
      case "STANDARD":
      default:
        baseCost *= 1;
        break;
    }

    // 保险费用
    if (request.insurance) {
      baseCost += Math.ceil(request.package_info.value * 0.01);
    }

    return baseCost;
  }

  private async processShipmentAsync(trackingNumber: string): Promise<void> {
    const shipment = this.shipments.get(trackingNumber);
    if (!shipment) return;

    const statuses = ["PICKED_UP", "IN_TRANSIT", "DELIVERED"];

    for (const status of statuses) {
      // 模拟物流更新间隔
      await this.delay(3000 + Math.random() * 5000);

      if (shipment.status === "CANCELLED") break;

      shipment.status = status as any;
      shipment.updated_time = new Date().toISOString();

      // 添加跟踪事件
      shipment.tracking_events.push({
        status,
        description: this.getStatusDescription(status),
        location: this.getRandomLocation(),
        timestamp: new Date().toISOString(),
      });

      if (status === "DELIVERED") {
        shipment.actual_delivery = new Date().toISOString();
        shipment.current_location = "Delivered";
      }
    }
  }

  private getStatusDescription(status: string): string {
    switch (status) {
      case "PICKED_UP":
        return "Package picked up from sender";
      case "IN_TRANSIT":
        return "Package in transit";
      case "DELIVERED":
        return "Package delivered successfully";
      default:
        return status;
    }
  }

  private getRandomLocation(): string {
    const locations = [
      "北京分拣中心",
      "上海转运中心",
      "广州配送站",
      "深圳仓库",
      "杭州分拣中心",
      "成都转运中心",
      "配送中",
      "客户签收",
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
