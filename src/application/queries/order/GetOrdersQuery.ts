import { Query } from "../base/Query";
import { EntityId } from "../../../shared/types";
import { Money } from "../../../domain/value-objects";

export interface OrderFilters {
  customerId?: EntityId;
  status?: string;
  minAmount?: Money;
  maxAmount?: Money;
  startDate?: Date;
  endDate?: Date;
  orderNumber?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SortParams {
  field:
    | "orderNumber"
    | "totalAmount"
    | "createdAt"
    | "confirmedAt"
    | "shippedAt";
  direction: "asc" | "desc";
}

/**
 * 获取订单列表查询
 */
export class GetOrdersQuery extends Query {
  public readonly pagination?: PaginationParams;
  public readonly sort?: SortParams;
  public readonly filters?: OrderFilters;

  constructor(data: {
    pagination?: PaginationParams;
    sort?: SortParams;
    filters?: OrderFilters;
  }) {
    super();
    this.pagination = data.pagination;
    this.sort = data.sort;
    this.filters = data.filters;
  }

  validate(): string[] {
    const errors: string[] = [];

    if (this.pagination) {
      if (this.pagination.page < 1) {
        errors.push("页码必须大于等于1");
      }
      if (this.pagination.pageSize < 1 || this.pagination.pageSize > 100) {
        errors.push("每页大小必须在1到100之间");
      }
    }

    if (this.filters) {
      if (this.filters.startDate && this.filters.endDate) {
        if (this.filters.startDate > this.filters.endDate) {
          errors.push("开始日期不能晚于结束日期");
        }
      }

      if (this.filters.minAmount && this.filters.maxAmount) {
        if (this.filters.minAmount.amount > this.filters.maxAmount.amount) {
          errors.push("最小金额不能大于最大金额");
        }
      }
    }

    return errors;
  }
}
