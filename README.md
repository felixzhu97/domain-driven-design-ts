# TypeScript 领域驱动设计 (DDD) 完整实践项目

这是一个使用 TypeScript 实现的完整领域驱动设计 (Domain-Driven Design) 示例项目，展示了现代软件架构最佳实践。

## 🏗️ 项目架构

本项目采用经典的四层 DDD 架构：

```
├── src/
│   ├── domain/              # 领域层 - 核心业务逻辑
│   │   ├── entities/        # 实体和聚合根
│   │   ├── value-objects/   # 值对象
│   │   ├── services/        # 领域服务
│   │   ├── events/          # 领域事件
│   │   └── repositories/    # 仓储接口
│   ├── application/         # 应用层 - 应用服务和业务流程
│   │   ├── commands/        # 命令处理 (CQRS)
│   │   ├── queries/         # 查询处理 (CQRS)
│   │   └── services/        # 应用服务
│   ├── infrastructure/      # 基础设施层 - 技术实现
│   │   ├── repositories/    # 仓储实现
│   │   ├── persistence/     # 数据持久化
│   │   └── events/          # 事件处理基础设施
│   ├── presentation/        # 表示层 - API和用户接口
│   │   ├── controllers/     # REST API 控制器
│   │   ├── dtos/            # 数据传输对象
│   │   └── demo/            # API演示
│   └── shared/              # 共享组件
│       ├── types/           # 类型定义
│       └── utils/           # 工具函数
```

## ✨ 核心特性

### 🎯 DDD 核心概念实现

- **聚合根 (Aggregate Root)**: User, Product, Order
- **实体 (Entity)**: OrderItem
- **值对象 (Value Object)**: Email, Money, Address, ProductCategory
- **领域服务 (Domain Service)**: OrderService, UserRegistrationService
- **领域事件 (Domain Event)**: UserEvents, ProductEvents, OrderEvents
- **仓储模式 (Repository Pattern)**: 分离接口定义和实现

### 🔄 CQRS 实现

- **命令处理**: CreateUserCommand, CreateProductCommand, CreateOrderCommand
- **查询处理**: GetUserByIdQuery, GetProductsQuery, GetOrdersQuery
- **命令查询分离**: 读写操作完全分离，支持不同的优化策略

### 🏛️ 分层架构

- **严格的依赖方向**: 内层不依赖外层，通过接口实现依赖反转
- **清晰的职责分离**: 每层都有明确的职责边界
- **可测试性**: 每层都可以独立测试

### 💾 基础设施实现

- **内存仓储**: 完整的内存数据存储实现，支持复杂查询
- **分页支持**: 完整的分页、排序、过滤功能
- **类型安全**: 严格的 TypeScript 类型检查

## 🛒 业务场景

本项目以电商系统为例，实现了完整的业务流程：

### 👥 用户管理

- 用户注册和认证
- 用户信息管理
- 地址管理
- 用户状态管理（激活/暂停）

### 📦 商品管理

- 商品创建和管理
- 分类管理
- 库存管理
- 价格管理
- 商品搜索和过滤

### 🛍️ 订单处理

- 订单创建
- 订单状态管理（待确认 → 已确认 → 已支付 → 已发货 → 已完成）
- 订单取消
- 库存扣减

### 📊 数据统计

- 用户统计
- 商品统计
- 订单统计
- 销售数据分析

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 运行演示

```bash
npm start
```

这将运行完整的业务流程演示，包括：

1. 用户管理功能演示
2. 商品管理功能演示
3. 订单业务流程演示
4. 统计分析功能演示
5. 事件处理机制演示
6. REST API 控制器演示

### 运行测试

```bash
npm test
```

### 编译项目

```bash
npm run build
```

## 📚 代码示例

### 创建用户

```typescript
// 1. 使用值对象确保数据完整性
const email = Email.create("user@example.com");
const address = Address.create({
  country: "中国",
  province: "北京市",
  city: "北京市",
  district: "朝阳区",
  street: "建国路88号",
  postalCode: "100025",
});

// 2. 使用实体创建用户
const user = User.create(email, "张三", "password123", address);

// 3. 通过仓储保存
await userRepository.save(user);
```

### 处理订单业务

```typescript
// 1. 使用命令模式
const command = new CreateOrderCommand({
  customerId: "user-123",
  orderItems: [{ productId: "product-456", quantity: 2 }],
});

// 2. 命令处理器处理业务逻辑
const result = await createOrderHandler.handle(command);

// 3. 使用领域服务处理复杂业务逻辑
const order = await orderService.createOrder({
  customerId: command.customerId,
  orderItems: validatedItems,
  shippingAddress: customerAddress,
});
```

### REST API 使用

```typescript
// 获取商品列表
const response = await productController.getProducts({
  page: 1,
  pageSize: 10,
  category: "数码产品",
  minPrice: 1000,
  maxPrice: 5000,
  sortBy: "price",
  sortOrder: "desc",
});
```

## 🧪 测试

项目包含完整的单元测试，覆盖：

- **实体测试**: User.test.ts
- **值对象测试**: Email.test.ts, Money.test.ts
- **领域服务测试**: 业务逻辑验证
- **仓储测试**: 数据访问逻辑测试

运行测试：

```bash
npm test
```

## 🔧 技术栈

- **TypeScript 5.x**: 类型安全的 JavaScript
- **Node.js**: 运行时环境
- **Jest**: 测试框架
- **ESLint**: 代码质量工具

## 📋 待办事项

- [ ] 实现真实数据库仓储（PostgreSQL/MongoDB）
- [ ] 添加 Web API 框架集成（Express/Fastify）
- [ ] 实现事件存储和事件溯源
- [ ] 添加缓存层（Redis）
- [ ] 实现消息队列集成
- [ ] 添加 API 文档生成（OpenAPI/Swagger）
- [ ] 实现认证和授权机制
- [ ] 添加日志记录和监控
- [ ] Docker 容器化部署

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- Eric Evans - Domain-Driven Design 概念创始人
- Vaughn Vernon - DDD 实践专家
- Martin Fowler - 企业应用架构模式

---

**注意**: 这是一个教学示例项目，展示 DDD 概念和最佳实践。在生产环境中使用时，请根据具体需求进行适当的调整和扩展。
