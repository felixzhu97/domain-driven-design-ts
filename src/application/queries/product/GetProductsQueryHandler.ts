import { QueryHandler, IQueryHandler } from "../base/QueryHandler";
import {
  QueryResult,
  createQuerySuccessResult,
  createPageInfo,
} from "../base/Query";
import { GetProductsQuery } from "./GetProductsQuery";
import { Product } from "../../../domain/entities";
import { IProductRepository } from "../../../domain/repositories";

/**
 * 获取商品列表查询处理器
 */
export class GetProductsQueryHandler
  extends QueryHandler<GetProductsQuery, Product[]>
  implements IQueryHandler<GetProductsQuery, Product[]>
{
  constructor(private productRepository: IProductRepository) {
    super();
  }

  public async handle(
    query: GetProductsQuery
  ): Promise<QueryResult<Product[]>> {
    return this.processQuery(query);
  }

  protected validateQuery(query: GetProductsQuery): string[] {
    const errors: string[] = [];

    if (query.pagination) {
      if (query.pagination.page < 1) {
        errors.push("页码必须大于0");
      }
      if (query.pagination.pageSize < 1 || query.pagination.pageSize > 100) {
        errors.push("每页数量必须在1-100之间");
      }
    }

    if (query.filters?.minPrice && query.filters.minPrice < 0) {
      errors.push("最低价格不能为负数");
    }

    if (query.filters?.maxPrice && query.filters.maxPrice < 0) {
      errors.push("最高价格不能为负数");
    }

    if (
      query.filters?.minPrice &&
      query.filters?.maxPrice &&
      query.filters.minPrice > query.filters.maxPrice
    ) {
      errors.push("最低价格不能大于最高价格");
    }

    return errors;
  }

  protected async executeQuery(query: GetProductsQuery): Promise<Product[]> {
    // 获取所有商品
    const allProducts = await this.productRepository.findAll();

    // 应用过滤条件
    let filteredProducts = this.applyFilters(allProducts, query.filters);

    // 应用排序
    if (query.sort) {
      filteredProducts = this.applySort(filteredProducts, query.sort);
    }

    // 应用分页
    if (query.pagination) {
      const startIndex =
        (query.pagination.page - 1) * query.pagination.pageSize;
      const endIndex = startIndex + query.pagination.pageSize;
      filteredProducts = filteredProducts.slice(startIndex, endIndex);
    }

    return filteredProducts;
  }

  private applyFilters(
    products: Product[],
    filters?: GetProductsQuery["filters"]
  ): Product[] {
    if (!filters) {
      return products;
    }

    return products.filter((product) => {
      // 分类过滤
      if (filters.category && !product.category.equals(filters.category)) {
        return false;
      }

      // 价格范围过滤
      if (filters.minPrice && product.price.amount < filters.minPrice * 100) {
        return false;
      }

      if (filters.maxPrice && product.price.amount > filters.maxPrice * 100) {
        return false;
      }

      // 库存过滤
      if (
        filters.inStock !== undefined &&
        product.isInStock !== filters.inStock
      ) {
        return false;
      }

      // 状态过滤
      if (
        filters.isActive !== undefined &&
        product.isActive !== filters.isActive
      ) {
        return false;
      }

      // 搜索过滤
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        const nameMatch = product.name.toLowerCase().includes(searchTerm);
        const descMatch = product.description
          .toLowerCase()
          .includes(searchTerm);
        const skuMatch = product.sku.toLowerCase().includes(searchTerm);

        if (!nameMatch && !descMatch && !skuMatch) {
          return false;
        }
      }

      return true;
    });
  }

  private applySort(
    products: Product[],
    sort: GetProductsQuery["sort"]
  ): Product[] {
    if (!sort) {
      return products;
    }

    return products.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "price":
          comparison = a.price.amount - b.price.amount;
          break;
        case "stock":
          comparison = a.stock - b.stock;
          break;
        case "createdAt":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        default:
          return 0;
      }

      return sort.direction === "desc" ? -comparison : comparison;
    });
  }
}
