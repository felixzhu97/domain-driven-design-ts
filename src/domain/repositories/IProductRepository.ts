import { Product } from "../entities";
import { ProductCategory, Money } from "../value-objects";
import { EntityId } from "../../shared/types";
import { IRepository } from "./IRepository";

export interface ProductSearchCriteria {
  category?: ProductCategory;
  minPrice?: Money;
  maxPrice?: Money;
  inStock?: boolean;
  active?: boolean;
  nameContains?: string;
}

export interface ProductSortOptions {
  field: "name" | "price" | "stock" | "createdAt" | "updatedAt";
  direction: "asc" | "desc";
}

export interface IProductRepository extends IRepository<Product> {
  /**
   * 根据SKU查找商品
   */
  findBySku(sku: string): Promise<Product | null>;

  /**
   * 根据分类查找商品
   */
  findByCategory(category: ProductCategory): Promise<Product[]>;

  /**
   * 根据价格范围查找商品
   */
  findByPriceRange(minPrice: Money, maxPrice: Money): Promise<Product[]>;

  /**
   * 查找有库存的商品
   */
  findInStock(): Promise<Product[]>;

  /**
   * 查找缺货商品
   */
  findOutOfStock(): Promise<Product[]>;

  /**
   * 查找低库存商品
   */
  findLowStock(threshold: number): Promise<Product[]>;

  /**
   * 查找活跃商品
   */
  findActiveProducts(): Promise<Product[]>;

  /**
   * 根据名称搜索商品
   */
  searchByName(name: string): Promise<Product[]>;

  /**
   * 高级搜索
   */
  search(criteria: ProductSearchCriteria): Promise<Product[]>;

  /**
   * 分页查找商品
   */
  findWithPagination(
    page: number,
    limit: number,
    criteria?: ProductSearchCriteria,
    sort?: ProductSortOptions
  ): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * 获取最新商品
   */
  findLatestProducts(limit: number): Promise<Product[]>;

  /**
   * 获取推荐商品
   */
  findRecommendedProducts(limit: number): Promise<Product[]>;

  /**
   * 根据多个ID批量查找商品
   */
  findByIds(ids: EntityId[]): Promise<Product[]>;

  /**
   * 获取商品统计信息
   */
  getProductStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    outOfStockProducts: number;
    totalStockValue: number;
    averagePrice: number;
  }>;

  /**
   * 获取分类统计
   */
  getCategoryStats(): Promise<
    Array<{
      category: string;
      count: number;
      averagePrice: number;
    }>
  >;
}
