import { QueryHandler } from "../base/QueryHandler";
import { GetProductsQuery } from "./GetProductsQuery";
import { Product } from "../../../domain/entities/Product";
import { IProductRepository } from "../../../domain/repositories";

/**
 * 获取商品列表查询处理器
 */
export class GetProductsQueryHandler extends QueryHandler<
  GetProductsQuery,
  Product[]
> {
  constructor(private readonly productRepository: IProductRepository) {
    super();
  }

  protected async validate(
    query: GetProductsQuery
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors = query.validate();
    return { isValid: errors.length === 0, errors };
  }

  protected async execute(query: GetProductsQuery): Promise<Product[]> {
    // 获取所有产品
    const allProducts = await this.productRepository.findAll();

    // 应用过滤器
    let filteredProducts = allProducts;

    if (query.filters?.name) {
      filteredProducts = filteredProducts.filter((product) =>
        product.name.toLowerCase().includes(query.filters!.name!.toLowerCase())
      );
    }

    if (query.filters?.category) {
      filteredProducts = filteredProducts.filter((product) =>
        product.category.name
          .toLowerCase()
          .includes(query.filters!.category!.toLowerCase())
      );
    }

    if (query.filters?.minPrice !== undefined) {
      filteredProducts = filteredProducts.filter(
        (product) => product.price.amount >= query.filters!.minPrice!
      );
    }

    if (query.filters?.maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter(
        (product) => product.price.amount <= query.filters!.maxPrice!
      );
    }

    if (query.filters?.inStock !== undefined) {
      filteredProducts = filteredProducts.filter((product) =>
        query.filters!.inStock ? product.isInStock : !product.isInStock
      );
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
}
