import { Query, PaginationParams, SortParams } from "../base/Query";
import { ProductCategory } from "../../../domain/value-objects";

/**
 * 获取商品列表查询
 */
export class GetProductsQuery extends Query {
  public readonly pagination: PaginationParams | undefined;
  public readonly sort: SortParams | undefined;
  public readonly filters: ProductFilters | undefined;

  constructor(
    data: {
      pagination?: PaginationParams;
      sort?: SortParams;
      filters?: ProductFilters;
    } = {}
  ) {
    super();
    this.pagination = data.pagination;
    this.sort = data.sort;
    this.filters = data.filters;
  }

  /**
   * 验证查询
   */
  validate(): string[] {
    const errors: string[] = [];

    // 验证分页参数
    if (this.pagination) {
      if (this.pagination.page < 1) {
        errors.push("页码必须大于等于1");
      }
      if (this.pagination.pageSize < 1 || this.pagination.pageSize > 100) {
        errors.push("每页大小必须在1-100之间");
      }
    }

    // 验证价格范围
    if (this.filters?.minPrice !== undefined && this.filters.minPrice < 0) {
      errors.push("最小价格不能为负数");
    }
    if (this.filters?.maxPrice !== undefined && this.filters.maxPrice < 0) {
      errors.push("最大价格不能为负数");
    }
    if (
      this.filters?.minPrice !== undefined &&
      this.filters?.maxPrice !== undefined &&
      this.filters.minPrice > this.filters.maxPrice
    ) {
      errors.push("最小价格不能大于最大价格");
    }

    return errors;
  }
}

/**
 * 商品过滤条件
 */
export interface ProductFilters {
  name?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}
