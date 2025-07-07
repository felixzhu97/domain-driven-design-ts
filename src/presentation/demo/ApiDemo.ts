import { UserController, ProductController } from "../controllers";

/**
 * API演示类
 * 展示如何使用控制器
 */
export class ApiDemo {
  private userController = new UserController();
  private productController = new ProductController();

  /**
   * 运行API演示
   */
  public async runDemo(): Promise<void> {
    console.log("🚀 开始API演示");
    console.log("==============");

    try {
      await this.demoUserApi();
      await this.demoProductApi();

      console.log("\n✅ API演示完成！");
    } catch (error) {
      console.error("❌ API演示失败:", error);
    }
  }

  /**
   * 演示用户API
   */
  private async demoUserApi(): Promise<void> {
    console.log("\n👥 用户API演示");
    console.log("================");

    // 1. 创建用户
    console.log("1. 创建用户");
    const createUserResponse = await this.userController.createUser({
      email: "demo@example.com",
      name: "演示用户",
      password: "Password123",
      address: {
        country: "中国",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        street: "中关村大街1号",
        postalCode: "100000",
      },
    });

    console.log(`   状态码: ${createUserResponse.statusCode}`);
    console.log(`   消息: ${createUserResponse.message}`);

    if (createUserResponse.statusCode === 201 && createUserResponse.data) {
      const userId = createUserResponse.data.id;
      console.log(`   用户ID: ${userId}`);

      // 2. 获取用户详情
      console.log("\n2. 获取用户详情");
      const getUserResponse = await this.userController.getUserById(userId);
      console.log(`   状态码: ${getUserResponse.statusCode}`);
      console.log(`   用户名: ${getUserResponse.data?.name}`);
      console.log(`   邮箱: ${getUserResponse.data?.email}`);

      // 3. 获取用户列表
      console.log("\n3. 获取用户列表");
      const getUsersResponse = await this.userController.getUsers({
        page: 1,
        pageSize: 10,
      });
      console.log(`   状态码: ${getUsersResponse.statusCode}`);
      console.log(`   用户数量: ${getUsersResponse.data?.length || 0}`);

      // 4. 搜索用户
      console.log("\n4. 搜索用户");
      const searchResponse = await this.userController.searchUsers("演示");
      console.log(`   状态码: ${searchResponse.statusCode}`);
      console.log(`   搜索结果: ${searchResponse.data?.length || 0} 个用户`);
    }

    // 5. 获取用户统计
    console.log("\n5. 获取用户统计");
    const statsResponse = await this.userController.getUserStats();
    console.log(`   状态码: ${statsResponse.statusCode}`);
    if (statsResponse.data) {
      console.log(`   总用户数: ${statsResponse.data.totalUsers}`);
      console.log(`   活跃用户: ${statsResponse.data.activeUsers}`);
    }
  }

  /**
   * 演示商品API
   */
  private async demoProductApi(): Promise<void> {
    console.log("\n📦 商品API演示");
    console.log("================");

    // 1. 创建商品
    console.log("1. 创建商品");
    const createProductResponse = await this.productController.createProduct({
      name: "MacBook Pro 16寸",
      description: "专业级笔记本电脑，适合开发和设计工作",
      price: 16999.0,
      category: "ELECTRONICS",
      sku: "MBP-16-001",
      initialStock: 20,
      weight: 2100, // 2.1kg
    });

    console.log(`   状态码: ${createProductResponse.statusCode}`);
    console.log(`   消息: ${createProductResponse.message}`);

    if (
      createProductResponse.statusCode === 201 &&
      createProductResponse.data
    ) {
      const productId = createProductResponse.data.id;
      console.log(`   商品ID: ${productId}`);

      // 2. 获取商品详情
      console.log("\n2. 获取商品详情");
      const getProductResponse = await this.productController.getProductById(
        productId
      );
      console.log(`   状态码: ${getProductResponse.statusCode}`);
      console.log(`   商品名: ${getProductResponse.data?.name}`);
      console.log(`   价格: ${getProductResponse.data?.price.displayValue}`);
      console.log(`   库存: ${getProductResponse.data?.stock}`);

      // 3. 根据SKU获取商品
      console.log("\n3. 根据SKU获取商品");
      const getBySkuResponse = await this.productController.getProductBySku(
        "MBP-16-001"
      );
      console.log(`   状态码: ${getBySkuResponse.statusCode}`);
      console.log(`   SKU: ${getBySkuResponse.data?.sku}`);
    }

    // 4. 创建第二个商品
    await this.productController.createProduct({
      name: "无线鼠标",
      description: "人体工学设计，支持无线连接",
      price: 199.0,
      category: "ELECTRONICS",
      sku: "MOUSE-001",
      initialStock: 100,
      weight: 120,
    });

    // 5. 获取商品列表
    console.log("\n4. 获取商品列表");
    const getProductsResponse = await this.productController.getProducts({
      page: 1,
      pageSize: 10,
      sortBy: "price",
      sortOrder: "desc",
    });
    console.log(`   状态码: ${getProductsResponse.statusCode}`);
    console.log(`   商品数量: ${getProductsResponse.data?.length || 0}`);

    // 6. 搜索商品
    console.log("\n5. 搜索商品");
    const searchResponse = await this.productController.searchProducts({
      nameContains: "MacBook",
      category: "ELECTRONICS",
      minPrice: 10000,
    });
    console.log(`   状态码: ${searchResponse.statusCode}`);
    console.log(`   搜索结果: ${searchResponse.data?.length || 0} 个商品`);

    // 7. 获取商品统计
    console.log("\n6. 获取商品统计");
    const statsResponse = await this.productController.getProductStats();
    console.log(`   状态码: ${statsResponse.statusCode}`);
    if (statsResponse.data) {
      console.log(`   商品总数: ${statsResponse.data.totalProducts}`);
      console.log(`   活跃商品: ${statsResponse.data.activeProducts}`);
      console.log(`   平均价格: ¥${statsResponse.data.averagePrice}`);
    }
  }
}

// 如果直接运行此文件，则执行演示
if (require.main === module) {
  const demo = new ApiDemo();
  demo.runDemo();
}
