import { Product } from "../../../domain/entities";
import { ProductCategory, Money } from "../../../domain/value-objects";
import {
  IProductRepository,
  ProductSearchCriteria,
} from "../../../domain/repositories";
import { MemoryRepository } from "./MemoryRepository";
import { EntityId } from "../../../shared/types";

/**
 * 内存商品仓储实现
 */
export class MemoryProductRepository
  extends MemoryRepository<Product>
  implements IProductRepository
{
  public async findByCategory(category: ProductCategory): Promise<Product[]> {
    return this.findByCondition((product) => product.category.equals(category));
  }

  public async findBySku(sku: string): Promise<Product | null> {
    return this.findFirstByCondition((product) => product.sku === sku);
  }

  public async findByPriceRange(
    minPrice: Money,
    maxPrice: Money
  ): Promise<Product[]> {
    return this.findByCondition((product) => {
      return (
        product.price.amount >= minPrice.amount &&
        product.price.amount <= maxPrice.amount
      );
    });
  }

  public async findInStock(): Promise<Product[]> {
    return this.findByCondition((product) => product.isInStock);
  }

  public async findOutOfStock(): Promise<Product[]> {
    return this.findByCondition((product) => !product.isInStock);
  }

  public async findLowStock(threshold: number): Promise<Product[]> {
    return this.findByCondition(
      (product) => product.stock > 0 && product.stock <= threshold
    );
  }

  public async findActiveProducts(): Promise<Product[]> {
    return this.findByCondition((product) => product.isActive);
  }

  public async searchByName(name: string): Promise<Product[]> {
    const searchTerm = name.toLowerCase();
    return this.findByCondition((product) =>
      product.name.toLowerCase().includes(searchTerm)
    );
  }

  public async search(criteria: ProductSearchCriteria): Promise<Product[]> {
    return this.findByCondition((product) => {
      if (criteria.category && !product.category.equals(criteria.category)) {
        return false;
      }
      if (
        criteria.minPrice &&
        product.price.amount < criteria.minPrice.amount
      ) {
        return false;
      }
      if (
        criteria.maxPrice &&
        product.price.amount > criteria.maxPrice.amount
      ) {
        return false;
      }
      if (
        criteria.inStock !== undefined &&
        product.isInStock !== criteria.inStock
      ) {
        return false;
      }
      if (
        criteria.active !== undefined &&
        product.isActive !== criteria.active
      ) {
        return false;
      }
      if (criteria.nameContains) {
        const nameMatch = product.name
          .toLowerCase()
          .includes(criteria.nameContains.toLowerCase());
        const descMatch = product.description
          .toLowerCase()
          .includes(criteria.nameContains.toLowerCase());
        const skuMatch = product.sku
          .toLowerCase()
          .includes(criteria.nameContains.toLowerCase());
        if (!nameMatch && !descMatch && !skuMatch) return false;
      }
      return true;
    });
  }

  public async findWithPagination(
    page: number,
    limit: number,
    criteria?: ProductSearchCriteria,
    sort?: any
  ): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    let products = await this.findAll();

    // 应用搜索条件
    if (criteria) {
      products = await this.search(criteria);
    }

    // 应用排序
    if (sort) {
      products = this.sortProducts(products, sort.field, sort.direction);
    }

    const result = this.paginate(products, page, limit);

    return {
      products: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  public async findLatestProducts(limit: number): Promise<Product[]> {
    const products = await this.findAll();
    return products
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  public async findRecommendedProducts(limit: number): Promise<Product[]> {
    // 简化实现：返回活跃且有库存的商品
    const products = await this.findByCondition(
      (product) => product.isActive && product.isInStock
    );
    return products.slice(0, limit);
  }

  public async findByIds(ids: EntityId[]): Promise<Product[]> {
    const products: Product[] = [];
    for (const id of ids) {
      const product = await this.findById(id);
      if (product) {
        products.push(product);
      }
    }
    return products;
  }

  public async getProductStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    outOfStockProducts: number;
    totalStockValue: number;
    averagePrice: number;
  }> {
    const allProducts = await this.findAll();

    const totalProducts = allProducts.length;
    const activeProducts = allProducts.filter((p) => p.isActive).length;
    const inactiveProducts = allProducts.filter((p) => !p.isActive).length;
    const outOfStockProducts = allProducts.filter((p) => !p.isInStock).length;

    // 计算平均价格 (转换为元)
    const totalPriceAmount = allProducts.reduce(
      (sum, p) => sum + p.price.amount,
      0
    );
    const averagePrice =
      totalProducts > 0
        ? Math.round(totalPriceAmount / totalProducts) / 100
        : 0;

    // 计算库存总价值 (转换为元)
    const totalStockValue =
      allProducts.reduce((sum, p) => {
        return sum + p.price.amount * p.stock;
      }, 0) / 100;

    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      outOfStockProducts,
      totalStockValue,
      averagePrice,
    };
  }

  public async getCategoryStats(): Promise<
    Array<{
      category: string;
      count: number;
      averagePrice: number;
    }>
  > {
    const allProducts = await this.findAll();
    const categoryMap = new Map<
      string,
      { products: Product[]; totalPrice: number }
    >();

    // 按分类分组
    for (const product of allProducts) {
      const categoryName = product.category.name;
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { products: [], totalPrice: 0 });
      }
      const categoryData = categoryMap.get(categoryName)!;
      categoryData.products.push(product);
      categoryData.totalPrice += product.price.amount;
    }

    // 生成统计结果
    const stats: Array<{
      category: string;
      count: number;
      averagePrice: number;
    }> = [];
    for (const [categoryName, data] of categoryMap) {
      stats.push({
        category: categoryName,
        count: data.products.length,
        averagePrice: Math.round(data.totalPrice / data.products.length) / 100,
      });
    }

    return stats;
  }

  /**
   * 对商品进行排序
   */
  private sortProducts(
    products: Product[],
    field: string,
    direction: "asc" | "desc"
  ): Product[] {
    return products.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (field) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "price":
          aValue = a.price.amount;
          bValue = b.price.amount;
          break;
        case "stock":
          aValue = a.stock;
          bValue = b.stock;
          break;
        case "createdAt":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "updatedAt":
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * 查找低库存商品
   */
  public async findLowStockProducts(
    threshold: number = 10
  ): Promise<Product[]> {
    return this.findByCondition(
      (product) => product.stock > 0 && product.stock <= threshold
    );
  }

  /**
   * 查找热销商品（根据库存变化）
   */
  public async findTopSellingProducts(limit: number = 10): Promise<Product[]> {
    const products = await this.findAll();

    // 这里简化处理，实际应该根据销售数据排序
    // 暂时按照库存从少到多排序（假设库存少的卖得好）
    return products
      .filter((p) => p.isActive)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, limit);
  }

  /**
   * 查找新商品
   */
  public async findNewProducts(days: number = 30): Promise<Product[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.findByCondition(
      (product) => product.createdAt >= cutoffDate
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
