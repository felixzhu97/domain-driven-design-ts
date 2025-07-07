/**
 * 创建商品请求DTO
 */
export interface CreateProductRequestDto {
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  stockQuantity: number;
  tags?: string[];
}

/**
 * 更新商品请求DTO
 */
export interface UpdateProductRequestDto {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  stockQuantity?: number;
  tags?: string[];
}

/**
 * 商品搜索请求DTO
 */
export interface ProductSearchRequestDto {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "price" | "createdAt";
  sortOrder?: "asc" | "desc";
}

/**
 * 商品响应DTO
 */
export interface ProductResponseDto {
  id: string;
  name: string;
  description: string;
  price: {
    amount: number;
    currency: string;
  };
  category: string;
  stockQuantity: number;
  isAvailable: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 商品列表响应DTO
 */
export interface ProductListResponseDto {
  products: ProductResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 商品统计响应DTO
 */
export interface ProductStatsResponseDto {
  totalProducts: number;
  availableProducts: number;
  outOfStockProducts: number;
  totalStockValue: {
    amount: number;
    currency: string;
  };
  categoriesCount: number;
  averagePrice: {
    amount: number;
    currency: string;
  };
}
