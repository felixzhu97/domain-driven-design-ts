import { EventEmitter } from "events";
import { EntityId } from "../../shared/types";

/**
 * 测试容器 - 管理测试环境和依赖注入
 */
export class TestContainer {
  private services: Map<string, any> = new Map();
  private singletons: Map<string, any> = new Map();
  private eventBus: EventEmitter = new EventEmitter();
  private isInitialized: boolean = false;

  /**
   * 初始化测试容器
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log("🚀 初始化测试容器...");

    // 注册核心服务
    this.registerCoreServices();

    // 注册仓储实现
    this.registerRepositories();

    // 注册应用服务
    this.registerApplicationServices();

    // 注册领域服务
    this.registerDomainServices();

    // 注册基础设施服务
    this.registerInfrastructureServices();

    this.isInitialized = true;
    console.log("✅ 测试容器初始化完成");
  }

  /**
   * 清理测试容器
   */
  public async cleanup(): Promise<void> {
    console.log("🧹 清理测试容器...");

    // 清理事件监听器
    this.eventBus.removeAllListeners();

    // 清理服务实例
    for (const [key, service] of this.singletons.entries()) {
      if (service && typeof service.dispose === "function") {
        await service.dispose();
      }
    }

    this.services.clear();
    this.singletons.clear();
    this.isInitialized = false;

    console.log("✅ 测试容器清理完成");
  }

  /**
   * 获取服务实例
   */
  public get<T>(serviceKey: string): T {
    if (this.singletons.has(serviceKey)) {
      return this.singletons.get(serviceKey);
    }

    const serviceFactory = this.services.get(serviceKey);
    if (!serviceFactory) {
      throw new Error(`服务未注册: ${serviceKey}`);
    }

    const instance = serviceFactory();
    this.singletons.set(serviceKey, instance);
    return instance;
  }

  /**
   * 注册服务
   */
  public register<T>(serviceKey: string, factory: () => T): void {
    this.services.set(serviceKey, factory);
  }

  /**
   * 注册单例服务
   */
  public registerSingleton<T>(serviceKey: string, instance: T): void {
    this.singletons.set(serviceKey, instance);
  }

  /**
   * 获取事件总线
   */
  public getEventBus(): EventEmitter {
    return this.eventBus;
  }

  /**
   * 重置容器状态
   */
  public async reset(): Promise<void> {
    await this.cleanup();
    await this.initialize();
  }

  /**
   * 注册核心服务
   */
  private registerCoreServices(): void {
    // 事件总线
    this.registerSingleton("EventBus", this.eventBus);

    // ID生成器
    this.register("IdGenerator", () => new IdGenerator());

    // 时间提供者
    this.register("TimeProvider", () => new TimeProvider());

    // 测试数据工厂
    this.register("TestDataFactory", () => new TestDataFactory());
  }

  /**
   * 注册仓储实现
   */
  private registerRepositories(): void {
    // 内存仓储实现
    this.register("OrderRepository", () => new InMemoryOrderRepository());
    this.register("PaymentRepository", () => new InMemoryPaymentRepository());
    this.register("CustomerRepository", () => new InMemoryCustomerRepository());
    this.register(
      "InventoryRepository",
      () => new InMemoryInventoryRepository()
    );
  }

  /**
   * 注册应用服务
   */
  private registerApplicationServices(): void {
    this.register("OrderApplicationService", () => {
      return new OrderApplicationService(
        this.get("OrderRepository"),
        this.get("PaymentRepository"),
        this.get("EventBus")
      );
    });

    this.register("PaymentApplicationService", () => {
      return new PaymentApplicationService(
        this.get("PaymentRepository"),
        this.get("EventBus")
      );
    });
  }

  /**
   * 注册领域服务
   */
  private registerDomainServices(): void {
    this.register("OrderPricingService", () => new OrderPricingService());
    this.register("InventoryService", () => new InventoryService());
    this.register(
      "PaymentValidationService",
      () => new PaymentValidationService()
    );
  }

  /**
   * 注册基础设施服务
   */
  private registerInfrastructureServices(): void {
    // 外部系统模拟
    this.register("PaymentGateway", () => new MockPaymentGateway());
    this.register("InventorySystem", () => new MockInventorySystem());
    this.register("NotificationService", () => new MockNotificationService());

    // 防腐层
    this.register("PaymentGatewayAdapter", () => {
      return new PaymentGatewayAdapter(this.get("PaymentGateway"));
    });
  }
}

/**
 * ID生成器
 */
export class IdGenerator {
  private counter: number = 1;

  public generate(): EntityId {
    return `test-${this.counter++}-${Date.now()}`;
  }

  public generateOrderId(): EntityId {
    return `order-${this.counter++}`;
  }

  public generatePaymentId(): EntityId {
    return `payment-${this.counter++}`;
  }

  public generateCustomerId(): EntityId {
    return `customer-${this.counter++}`;
  }
}

/**
 * 时间提供者
 */
export class TimeProvider {
  private mockTime: Date | null = null;

  public now(): Date {
    return this.mockTime || new Date();
  }

  public setMockTime(time: Date): void {
    this.mockTime = time;
  }

  public clearMockTime(): void {
    this.mockTime = null;
  }

  public addDays(days: number): Date {
    const date = this.now();
    date.setDate(date.getDate() + days);
    return date;
  }

  public addHours(hours: number): Date {
    const date = this.now();
    date.setHours(date.getHours() + hours);
    return date;
  }
}

/**
 * 测试数据工厂
 */
export class TestDataFactory {
  private idGenerator: IdGenerator;

  constructor() {
    this.idGenerator = new IdGenerator();
  }

  public createCustomer(overrides: Partial<any> = {}): any {
    return {
      id: this.idGenerator.generateCustomerId(),
      name: "测试客户",
      email: "test@example.com",
      phone: "13800138000",
      address: "测试地址",
      ...overrides,
    };
  }

  public createOrderData(overrides: Partial<any> = {}): any {
    return {
      customerId: this.idGenerator.generateCustomerId(),
      items: [
        {
          productId: "product-1",
          quantity: 2,
          unitPrice: 10000, // 100元，以分为单位
        },
        {
          productId: "product-2",
          quantity: 1,
          unitPrice: 5000, // 50元，以分为单位
        },
      ],
      description: "测试订单",
      ...overrides,
    };
  }

  public createPaymentData(overrides: Partial<any> = {}): any {
    return {
      orderId: this.idGenerator.generateOrderId(),
      customerId: this.idGenerator.generateCustomerId(),
      amount: 25000, // 250元，以分为单位
      paymentMethod: {
        type: "CREDIT_CARD",
        cardNumber: "4111111111111111",
        expiryDate: new Date(2025, 11, 31),
        cvv: "123",
      },
      description: "测试支付",
      ...overrides,
    };
  }

  public createInventoryData(overrides: Partial<any> = {}): any {
    return {
      productId: "product-1",
      quantity: 100,
      reservedQuantity: 0,
      location: "warehouse-1",
      ...overrides,
    };
  }
}

// 内存仓储实现
export class InMemoryOrderRepository {
  private orders: Map<EntityId, any> = new Map();

  async save(order: any): Promise<void> {
    this.orders.set(order.id, { ...order });
  }

  async findById(id: EntityId): Promise<any | null> {
    return this.orders.get(id) || null;
  }

  async findByCustomerId(customerId: EntityId): Promise<any[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.customerId === customerId
    );
  }

  async delete(id: EntityId): Promise<void> {
    this.orders.delete(id);
  }

  async clear(): Promise<void> {
    this.orders.clear();
  }

  getAll(): any[] {
    return Array.from(this.orders.values());
  }
}

export class InMemoryPaymentRepository {
  private payments: Map<EntityId, any> = new Map();

  async save(payment: any): Promise<void> {
    this.payments.set(payment.id, { ...payment });
  }

  async findById(id: EntityId): Promise<any | null> {
    return this.payments.get(id) || null;
  }

  async findByOrderId(orderId: EntityId): Promise<any[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.orderId === orderId
    );
  }

  async delete(id: EntityId): Promise<void> {
    this.payments.delete(id);
  }

  async clear(): Promise<void> {
    this.payments.clear();
  }

  getAll(): any[] {
    return Array.from(this.payments.values());
  }
}

export class InMemoryCustomerRepository {
  private customers: Map<EntityId, any> = new Map();

  async save(customer: any): Promise<void> {
    this.customers.set(customer.id, { ...customer });
  }

  async findById(id: EntityId): Promise<any | null> {
    return this.customers.get(id) || null;
  }

  async findByEmail(email: string): Promise<any | null> {
    return (
      Array.from(this.customers.values()).find(
        (customer) => customer.email === email
      ) || null
    );
  }

  async delete(id: EntityId): Promise<void> {
    this.customers.delete(id);
  }

  async clear(): Promise<void> {
    this.customers.clear();
  }

  getAll(): any[] {
    return Array.from(this.customers.values());
  }
}

export class InMemoryInventoryRepository {
  private inventory: Map<string, any> = new Map();

  async save(item: any): Promise<void> {
    this.inventory.set(item.productId, { ...item });
  }

  async findByProductId(productId: string): Promise<any | null> {
    return this.inventory.get(productId) || null;
  }

  async reserve(productId: string, quantity: number): Promise<boolean> {
    const item = this.inventory.get(productId);
    if (!item) return false;

    const available = item.quantity - item.reservedQuantity;
    if (available >= quantity) {
      item.reservedQuantity += quantity;
      return true;
    }
    return false;
  }

  async release(productId: string, quantity: number): Promise<void> {
    const item = this.inventory.get(productId);
    if (item) {
      item.reservedQuantity = Math.max(0, item.reservedQuantity - quantity);
    }
  }

  async clear(): Promise<void> {
    this.inventory.clear();
  }

  getAll(): any[] {
    return Array.from(this.inventory.values());
  }
}

// 应用服务模拟
export class OrderApplicationService {
  constructor(
    private orderRepository: InMemoryOrderRepository,
    private paymentRepository: InMemoryPaymentRepository,
    private eventBus: EventEmitter
  ) {}

  async createOrder(orderData: any): Promise<any> {
    const order = {
      id: `order-${Date.now()}`,
      ...orderData,
      status: "PENDING",
      createdAt: new Date(),
      totalAmount: this.calculateTotal(orderData.items),
    };

    await this.orderRepository.save(order);

    this.eventBus.emit("OrderCreated", {
      orderId: order.id,
      customerId: order.customerId,
      totalAmount: order.totalAmount,
    });

    return order;
  }

  async confirmOrder(orderId: EntityId): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error("订单不存在");
    }

    order.status = "CONFIRMED";
    await this.orderRepository.save(order);

    this.eventBus.emit("OrderConfirmed", {
      orderId: order.id,
      customerId: order.customerId,
    });
  }

  private calculateTotal(items: any[]): number {
    return items.reduce((total, item) => {
      return total + item.quantity * item.unitPrice;
    }, 0);
  }
}

export class PaymentApplicationService {
  constructor(
    private paymentRepository: InMemoryPaymentRepository,
    private eventBus: EventEmitter
  ) {}

  async processPayment(paymentData: any): Promise<any> {
    const payment = {
      id: `payment-${Date.now()}`,
      ...paymentData,
      status: "PROCESSING",
      createdAt: new Date(),
    };

    await this.paymentRepository.save(payment);

    // 模拟异步支付处理
    setTimeout(async () => {
      payment.status = "COMPLETED";
      payment.completedAt = new Date();
      await this.paymentRepository.save(payment);

      this.eventBus.emit("PaymentCompleted", {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
      });
    }, 100);

    return payment;
  }
}

// 领域服务模拟
export class OrderPricingService {
  calculatePrice(items: any[]): number {
    return items.reduce((total, item) => {
      return total + item.quantity * item.unitPrice;
    }, 0);
  }

  applyDiscount(amount: number, discountRate: number): number {
    return Math.round(amount * (1 - discountRate));
  }
}

export class InventoryService {
  constructor(private inventoryRepository?: InMemoryInventoryRepository) {}

  async checkAvailability(
    productId: string,
    quantity: number
  ): Promise<boolean> {
    if (!this.inventoryRepository) return true;

    const item = await this.inventoryRepository.findByProductId(productId);
    if (!item) return false;

    const available = item.quantity - item.reservedQuantity;
    return available >= quantity;
  }

  async reserveInventory(
    productId: string,
    quantity: number
  ): Promise<boolean> {
    if (!this.inventoryRepository) return true;
    return await this.inventoryRepository.reserve(productId, quantity);
  }
}

export class PaymentValidationService {
  validatePaymentMethod(paymentMethod: any): boolean {
    if (!paymentMethod.type) return false;

    switch (paymentMethod.type) {
      case "CREDIT_CARD":
        return this.validateCreditCard(paymentMethod);
      case "BANK_TRANSFER":
        return this.validateBankTransfer(paymentMethod);
      default:
        return false;
    }
  }

  private validateCreditCard(card: any): boolean {
    return !!(card.cardNumber && card.expiryDate && card.cvv);
  }

  private validateBankTransfer(transfer: any): boolean {
    return !!(transfer.accountNumber && transfer.bankCode);
  }
}

// 外部系统模拟
export class MockPaymentGateway {
  async processPayment(paymentData: any): Promise<any> {
    // 模拟网络延迟
    await this.delay(50);

    // 模拟支付成功率90%
    const success = Math.random() > 0.1;

    return {
      transactionId: `txn-${Date.now()}`,
      status: success ? "SUCCESS" : "FAILED",
      amount: paymentData.amount,
      processedAt: new Date(),
      gateway: "MOCK_GATEWAY",
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class MockInventorySystem {
  private inventory: Map<string, number> = new Map([
    ["product-1", 100],
    ["product-2", 50],
    ["product-3", 200],
  ]);

  async checkStock(productId: string): Promise<number> {
    await this.delay(20);
    return this.inventory.get(productId) || 0;
  }

  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    await this.delay(30);
    const current = this.inventory.get(productId) || 0;
    if (current >= quantity) {
      this.inventory.set(productId, current - quantity);
      return true;
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class MockNotificationService {
  private notifications: any[] = [];

  async sendNotification(notification: any): Promise<void> {
    await this.delay(10);
    this.notifications.push({
      ...notification,
      sentAt: new Date(),
    });
  }

  getNotifications(): any[] {
    return [...this.notifications];
  }

  clear(): void {
    this.notifications = [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class PaymentGatewayAdapter {
  constructor(private paymentGateway: MockPaymentGateway) {}

  async processPayment(paymentData: any): Promise<any> {
    // 数据转换：内部模型 -> 外部模型
    const externalData = this.transformToExternal(paymentData);

    // 调用外部系统
    const result = await this.paymentGateway.processPayment(externalData);

    // 数据转换：外部模型 -> 内部模型
    return this.transformToInternal(result);
  }

  private transformToExternal(internal: any): any {
    return {
      amount: internal.amount,
      currency: internal.currency || "CNY",
      reference: internal.orderId,
      paymentMethod: internal.paymentMethod,
    };
  }

  private transformToInternal(external: any): any {
    return {
      transactionId: external.transactionId,
      status: external.status,
      amount: external.amount,
      processedAt: external.processedAt,
      provider: external.gateway,
    };
  }
}
