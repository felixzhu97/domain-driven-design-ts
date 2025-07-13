# 快速开始指南

## 安装依赖

```bash
npm install
```

## 运行演示

```bash
# 编译TypeScript
npm run build

# 运行演示
npm run dev
```

## 演示内容

演示将展示以下 DDD 概念：

### 1. 值对象演示

- Email 邮箱地址验证
- Money 货币计算（支持多币种）
- Address 地址信息管理
- ProductCategory 商品分类

### 2. 实体演示

- User 用户实体（聚合根）
- Product 商品实体（聚合根）
- Order 订单实体（聚合根）
- OrderItem 订单项实体

### 3. 领域服务演示

- UserRegistrationService 用户注册服务
- OrderService 订单业务服务
- InventoryService 库存管理服务
- PriceCalculationService 价格计算服务

### 4. 完整业务流程

演示一个完整的电商购买流程：

1. 用户注册
2. 商品上架
3. 创建订单
4. 确认订单（库存扣减）
5. 支付订单
6. 订单发货
7. 确认收货
8. 查看领域事件

## 核心特性

✅ **类型安全**: 完全使用 TypeScript 实现
✅ **SOLID 原则**: 遵循面向对象设计原则
✅ **DDD 模式**: 完整的领域驱动设计实现
✅ **事件驱动**: 领域事件系统
✅ **仓储模式**: 数据访问抽象
✅ **值对象**: 不可变的业务值
✅ **聚合根**: 一致性边界管理
✅ **领域服务**: 跨实体业务逻辑

## 项目结构

```
src/
├── domain/              # 领域层
│   ├── entities/        # 实体和聚合根
│   ├── value-objects/   # 值对象
│   ├── services/        # 领域服务
│   ├── events/          # 领域事件
│   └── repositories/    # 仓储接口
├── application/         # 应用层（可扩展）
├── infrastructure/      # 基础设施层（可扩展）
├── presentation/        # 表示层（可扩展）
├── shared/             # 共享组件
└── demo/               # 演示代码
```

## 扩展建议

1. **应用层**: 实现 CQRS 命令和查询处理器
2. **基础设施层**: 添加具体的仓储实现（数据库）
3. **表示层**: 添加 REST API 或 GraphQL 接口
4. **测试**: 扩展单元测试和集成测试
5. **事件存储**: 实现事件溯源功能

## 学习资源

- 《领域驱动设计》- Eric Evans
- 《实现领域驱动设计》- Vaughn Vernon
- DDD 官方网站: https://domainlanguage.com/
