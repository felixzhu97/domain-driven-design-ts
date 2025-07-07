import { OrderStatus } from "../../domain/entities/Order";

/**
 * 创建订单请求DTO
 */
export interface CreateOrderRequestDto {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

/**
 * 订单项DTO
 */
export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: {
    amount: number;
    currency: string;
  };
  totalPrice: {
    amount: number;
    currency: string;
  };
}

/**
 * 订单响应DTO
 */
export interface OrderResponseDto {
  id: string;
  customerId: string;
  items: OrderItemDto[];
  totalAmount: {
    amount: number;
    currency: string;
  };
  status: OrderStatus;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingNumber?: string;
  createdAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

/**
 * 订单列表响应DTO
 */
export interface OrderListResponseDto {
  orders: OrderResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 订单搜索请求DTO
 */
export interface OrderSearchRequestDto {
  customerId?: string;
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "totalAmount" | "status";
  sortOrder?: "asc" | "desc";
}

/**
 * 订单统计响应DTO
 */
export interface OrderStatsResponseDto {
  totalOrders: number;
  totalAmount: {
    amount: number;
    currency: string;
  };
  averageOrderValue: {
    amount: number;
    currency: string;
  };
  statusBreakdown: Record<OrderStatus, number>;
}

/**
 * 发货请求DTO
 */
export interface ShipOrderRequestDto {
  trackingNumber?: string;
}
