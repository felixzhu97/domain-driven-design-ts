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
}

/**
 * 商品过滤条件
 */
export interface ProductFilters {
  category?: ProductCategory;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isActive?: boolean;
  searchTerm?: string;
}
