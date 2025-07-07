import { BaseController, HttpResponse } from "./BaseController";
import {
  CreateProductCommand,
  CreateProductCommandHandler,
} from "../../application/commands";
import {
  GetProductsQuery,
  GetProductsQueryHandler,
} from "../../application/queries";
import { MemoryProductRepository } from "../../infrastructure/repositories";
import { Money, ProductCategory } from "../../domain/value-objects";

/**
 * 商品控制器
 */
export class ProductController extends BaseController {
  private productRepository = new MemoryProductRepository();
  private createProductHandler: CreateProductCommandHandler;
  private getProductsHandler: GetProductsQueryHandler;

  constructor() {
    super();
    // 临时使用any类型来绕过接口不完整的问题
    this.createProductHandler = new CreateProductCommandHandler(
      this.productRepository as any
    );
    this.getProductsHandler = new GetProductsQueryHandler(
      this.productRepository as any
    );
  }

  /**
   * 创建商品
   * POST /api/products
   */
  public async createProduct(
    request: CreateProductRequest
  ): Promise<HttpResponse> {
    try {
      // 验证必填字段
      const requiredFields = [
        "name",
        "description",
        "price",
        "category",
        "sku",
      ];
      const validationErrors = this.validateRequired(request, requiredFields);

      if (validationErrors.length > 0) {
        return this.badRequest("请求参数验证失败", validationErrors);
      }

      // 验证价格
      const priceErrors = this.validateNumber(request.price, "价格", 0.01);
      if (priceErrors.length > 0) {
        return this.badRequest("价格验证失败", priceErrors);
      }

      // 验证库存
      const stockErrors = this.validateNumber(
        request.initialStock || 0,
        "初始库存",
        0
      );
      if (stockErrors.length > 0) {
        return this.badRequest("库存验证失败", stockErrors);
      }

      // 创建价格对象
      const price = Money.fromYuan(request.price);

      // 创建分类对象
      const category = ProductCategory.create(request.category);

      // 创建命令
      const commandData: any = {
        name: request.name,
        description: request.description,
        price,
        category,
        sku: request.sku,
        initialStock: request.initialStock || 0,
      };
      if (request.weight !== undefined) {
        commandData.weight = request.weight;
      }
      const command = new CreateProductCommand(commandData);

      // 执行命令
      const result = await this.createProductHandler.handle(command);

      return this.fromCommandResult(result, "商品创建成功");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 获取商品列表
   * GET /api/products
   */
  public async getProducts(
    request: GetProductsRequest = {}
  ): Promise<HttpResponse> {
    try {
      const page = Math.max(1, request.page || 1);
      const pageSize = Math.min(50, Math.max(1, request.pageSize || 10));

      // 构建过滤条件
      const filters: any = {};
      if (request.category) {
        filters.category = ProductCategory.create(request.category);
      }
      if (request.minPrice !== undefined) {
        filters.minPrice = request.minPrice;
      }
      if (request.maxPrice !== undefined) {
        filters.maxPrice = request.maxPrice;
      }
      if (request.inStock !== undefined) {
        filters.inStock = request.inStock;
      }
      if (request.searchTerm) {
        filters.searchTerm = request.searchTerm;
      }

      // 构建排序条件
      let sort: any = undefined;
      if (request.sortBy) {
        sort = {
          field: request.sortBy,
          direction: request.sortOrder || "asc",
        };
      }

      // 创建查询
      const queryData: any = {
        pagination: { page, pageSize },
      };
      if (sort) {
        queryData.sort = sort;
      }
      if (Object.keys(filters).length > 0) {
        queryData.filters = filters;
      }
      const query = new GetProductsQuery(queryData);

      // 执行查询
      const result = await this.getProductsHandler.handle(query);

      if (!result.success) {
        return this.badRequest(result.error || "商品查询失败");
      }

      const products = result.data || [];
      return this.ok(
        products.map((product) => this.mapProductToResponse(product)),
        "商品列表获取成功"
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 根据ID获取商品详情
   * GET /api/products/:id
   */
  public async getProductById(productId: string): Promise<HttpResponse> {
    try {
      if (!productId || productId.trim() === "") {
        return this.badRequest("商品ID不能为空");
      }

      const product = await this.productRepository.findById(productId);

      if (!product) {
        return this.notFound("商品不存在");
      }

      return this.ok(this.mapProductToResponse(product), "商品详情获取成功");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 根据SKU获取商品
   * GET /api/products/sku/:sku
   */
  public async getProductBySku(sku: string): Promise<HttpResponse> {
    try {
      if (!sku || sku.trim() === "") {
        return this.badRequest("商品SKU不能为空");
      }

      const product = await this.productRepository.findBySku(sku.toUpperCase());

      if (!product) {
        return this.notFound("商品不存在");
      }

      return this.ok(this.mapProductToResponse(product), "商品详情获取成功");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 搜索商品
   * GET /api/products/search
   */
  public async searchProducts(
    request: SearchProductsRequest
  ): Promise<HttpResponse> {
    try {
      const filters: any = {};

      if (request.nameContains) {
        filters.nameContains = request.nameContains;
      }

      if (request.category) {
        filters.category = ProductCategory.create(request.category);
      }

      if (request.minPrice !== undefined) {
        filters.minPrice = Money.fromYuan(request.minPrice);
      }

      if (request.maxPrice !== undefined) {
        filters.maxPrice = Money.fromYuan(request.maxPrice);
      }

      if (request.inStock !== undefined) {
        filters.inStock = request.inStock;
      }

      if (request.active !== undefined) {
        filters.active = request.active;
      }

      const products = await this.productRepository.search(filters);

      return this.ok(
        products.map((product) => this.mapProductToResponse(product)),
        `找到 ${products.length} 个商品`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 获取商品统计信息
   * GET /api/products/stats
   */
  public async getProductStats(): Promise<HttpResponse> {
    try {
      const stats = await this.productRepository.getProductStats();
      return this.ok(stats, "商品统计信息获取成功");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 将商品实体映射为响应对象
   */
  private mapProductToResponse(product: any) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: {
        amount: product.price.amount,
        currency: product.price.currency,
        displayValue: product.price.toString(),
      },
      category: {
        name: product.category.name,
        parent: product.category.parent,
      },
      sku: product.sku,
      stock: product.stock,
      status: product.status,
      isActive: product.isActive,
      isInStock: product.isInStock,
      isAvailable: product.isAvailable,
      images: product.images,
      weight: product.weight,
      dimensions: product.dimensions,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}

/**
 * 创建商品请求接口
 */
export interface CreateProductRequest {
  name: string;
  description: string;
  price: number; // 以元为单位
  category: string;
  sku: string;
  initialStock?: number;
  weight?: number;
}

/**
 * 获取商品列表请求接口
 */
export interface GetProductsRequest {
  page?: number;
  pageSize?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  searchTerm?: string;
  sortBy?: "name" | "price" | "stock" | "createdAt";
  sortOrder?: "asc" | "desc";
}

/**
 * 搜索商品请求接口
 */
export interface SearchProductsRequest {
  nameContains?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  active?: boolean;
}
