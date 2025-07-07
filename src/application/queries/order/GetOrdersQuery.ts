import { Query, PaginationParams, SortParams } from "../base/Query";
import { EntityId } from "../../../shared/types";
import { Money } from "../../../domain/value-objects";
import { OrderStatus } from "../../../domain/entities/Order";

export interface OrderFilters {
  customerId?: string;
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * 获取订单列表查询
 */
export class GetOrdersQuery extends Query {
  public readonly pagination?: PaginationParams | undefined;
  public readonly sort?: SortParams | undefined;
  public readonly filters?: OrderFilters | undefined;

  constructor(
    data: {
      pagination?: PaginationParams;
      sort?: SortParams;
      filters?: OrderFilters;
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

    // 验证金额范围
    if (this.filters?.minAmount !== undefined && this.filters.minAmount < 0) {
      errors.push("最小金额不能为负数");
    }
    if (this.filters?.maxAmount !== undefined && this.filters.maxAmount < 0) {
      errors.push("最大金额不能为负数");
    }
    if (
      this.filters?.minAmount !== undefined &&
      this.filters?.maxAmount !== undefined &&
      this.filters.minAmount > this.filters.maxAmount
    ) {
      errors.push("最小金额不能大于最大金额");
    }

    // 验证日期范围
    if (
      this.filters?.startDate &&
      this.filters?.endDate &&
      this.filters.startDate > this.filters.endDate
    ) {
      errors.push("开始日期不能大于结束日期");
    }

    return errors;
  }
}
