import { BaseController, HttpResponse } from "./BaseController";
import {
  MemoryOrderRepository,
  MemoryProductRepository,
  MemoryUserRepository,
} from "../../infrastructure/repositories";
import { OrderService } from "../../domain/services";
import { Money, Address } from "../../domain/value-objects";
import { OrderItem } from "../../domain/entities";

/**
 * 订单控制器
 */
export class OrderController extends BaseController {
  private orderRepository = new MemoryOrderRepository();
  private productRepository = new MemoryProductRepository();
  private userRepository = new MemoryUserRepository();
  private orderService = new OrderService();

  /**
   * 创建订单
   * POST /api/orders
   */
  public async createOrder(request: CreateOrderRequest): Promise<HttpResponse> {
    try {
      // 验证必填字段
      const requiredFields = ["customerId", "orderItems"];
      const validationErrors = this.validateRequired(request, requiredFields);

      if (validationErrors.length > 0) {
        return this.badRequest("请求参数验证失败", validationErrors);
      }

      // 验证订单项
      if (!request.orderItems || request.orderItems.length === 0) {
        return this.badRequest("订单项不能为空");
      }

      // 检查客户是否存在
      const customer = await this.userRepository.findById(request.customerId);
      if (!customer) {
        return this.badRequest("客户不存在");
      }

      // 验证订单项和准备数据
      const orderItems: OrderItem[] = [];
      let totalAmount = Money.zero();

      for (const item of request.orderItems) {
        const product = await this.productRepository.findById(item.productId);
        if (!product) {
          return this.badRequest(`商品 ${item.productId} 不存在`);
        }

        if (!product.isAvailable || !product.isInStock) {
          return this.badRequest(`商品 ${product.name} 不可用或无库存`);
        }

        if (product.stock < item.quantity) {
          return this.badRequest(
            `商品 ${product.name} 库存不足，当前库存：${product.stock}`
          );
        }

        const unitPrice = product.price;
        const orderItem = OrderItem.create({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
        });

        orderItems.push(orderItem);
        totalAmount = totalAmount.add(unitPrice.multiply(item.quantity));
      }

      // 创建配送地址
      let shippingAddress: Address;
      if (request.shippingAddress) {
        shippingAddress = Address.create({
          country: request.shippingAddress.country,
          province: request.shippingAddress.province,
          city: request.shippingAddress.city,
          district: request.shippingAddress.district || "",
          street: request.shippingAddress.street,
          postalCode: request.shippingAddress.postalCode,
          detail: request.shippingAddress.detail || "",
        });
      } else {
        // 使用客户默认地址
        if (customer.addresses.length === 0) {
          return this.badRequest("需要提供配送地址或客户必须有默认地址");
        }
        shippingAddress = customer.addresses[0];
      }

      // 创建订单
      const order = await this.orderService.createOrder({
        customerId: request.customerId,
        orderItems,
        shippingAddress,
        note: request.note,
      });

      // 扣减库存
      for (const item of request.orderItems) {
        const product = await this.productRepository.findById(item.productId);
        if (product) {
          product.decreaseStock(item.quantity);
          await this.productRepository.save(product);
        }
      }

      // 保存订单
      await this.orderRepository.save(order);

      return this.created(this.mapOrderToResponse(order), "订单创建成功");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 根据ID获取订单
   * GET /api/orders/:id
   */
  public async getOrderById(orderId: string): Promise<HttpResponse> {
    try {
      if (!orderId || orderId.trim() === "") {
        return this.badRequest("订单ID不能为空");
      }

      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        return this.notFound("订单不存在");
      }

      return this.ok(this.mapOrderToResponse(order), "订单详情获取成功");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 获取订单列表
   * GET /api/orders
   */
  public async getOrders(
    request: GetOrdersRequest = {}
  ): Promise<HttpResponse> {
    try {
      const page = Math.max(1, request.page || 1);
      const pageSize = Math.min(50, Math.max(1, request.pageSize || 10));

      // 构建过滤条件
      const criteria: any = {};
      if (request.customerId) {
        criteria.customerId = request.customerId;
      }
      if (request.status) {
        criteria.status = request.status;
      }
      if (request.startDate) {
        criteria.startDate = new Date(request.startDate);
      }
      if (request.endDate) {
        criteria.endDate = new Date(request.endDate);
      }

      // 构建排序条件
      let sort: any = undefined;
      if (request.sortBy) {
        sort = {
          field: request.sortBy,
          direction: request.sortOrder || "desc",
        };
      }

      const result = await this.orderRepository.findWithPagination(
        page,
        pageSize,
        criteria,
        sort
      );

      return this.paginated(
        result.orders.map((order) => this.mapOrderToResponse(order)),
        result.total,
        result.page,
        result.limit,
        "订单列表获取成功"
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 确认订单
   * POST /api/orders/:id/confirm
   */
  public async confirmOrder(orderId: string): Promise<HttpResponse> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        return this.notFound("订单不存在");
      }

      if (!order.canBeConfirmed) {
        return this.badRequest("订单当前状态不允许确认");
      }

      order.confirm();
      await this.orderRepository.save(order);

      return this.ok(this.mapOrderToResponse(order), "订单确认成功");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 取消订单
   * POST /api/orders/:id/cancel
   */
  public async cancelOrder(
    orderId: string,
    reason?: string
  ): Promise<HttpResponse> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        return this.notFound("订单不存在");
      }

      if (!order.canBeCancelled) {
        return this.badRequest("订单当前状态不允许取消");
      }

      order.cancel(reason);
      await this.orderRepository.save(order);

      return this.ok(this.mapOrderToResponse(order), "订单取消成功");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 获取订单统计
   * GET /api/orders/stats
   */
  public async getOrderStats(): Promise<HttpResponse> {
    try {
      const stats = await this.orderRepository.getOrderStats();
      return this.ok(stats, "订单统计信息获取成功");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 将订单实体映射为响应对象
   */
  private mapOrderToResponse(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      status: order.status,
      totalAmount: {
        amount: order.totalAmount.amount,
        currency: order.totalAmount.currency,
        displayValue: order.totalAmount.toString(),
      },
      orderItems: order.orderItems.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: {
          amount: item.unitPrice.amount,
          currency: item.unitPrice.currency,
          displayValue: item.unitPrice.toString(),
        },
        subtotal: {
          amount: item.subtotal.amount,
          currency: item.subtotal.currency,
          displayValue: item.subtotal.toString(),
        },
      })),
      shippingAddress: {
        country: order.shippingAddress.country,
        province: order.shippingAddress.province,
        city: order.shippingAddress.city,
        district: order.shippingAddress.district,
        street: order.shippingAddress.street,
        postalCode: order.shippingAddress.postalCode,
        detail: order.shippingAddress.detail,
      },
      note: order.note,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      confirmedAt: order.confirmedAt,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
    };
  }
}

/**
 * 创建订单请求接口
 */
export interface CreateOrderRequest {
  customerId: string;
  orderItems: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress?: {
    country: string;
    province: string;
    city: string;
    district?: string;
    street: string;
    postalCode: string;
    detail?: string;
  };
  note?: string;
}

/**
 * 获取订单列表请求接口
 */
export interface GetOrdersRequest {
  page?: number;
  pageSize?: number;
  customerId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "orderNumber" | "totalAmount" | "createdAt";
  sortOrder?: "asc" | "desc";
}
