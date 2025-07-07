import { Product } from "../entities";
import { EntityId } from "../../shared/types";

export interface StockMovement {
  productId: EntityId;
  quantity: number;
  movementType: "IN" | "OUT" | "ADJUSTMENT";
  reason: string;
  timestamp: Date;
  referenceId?: string; // 订单ID或其他参考ID
}

export interface InventoryAlert {
  productId: EntityId;
  productName: string;
  currentStock: number;
  minimumStock: number;
  alertType: "LOW_STOCK" | "OUT_OF_STOCK" | "OVERSTOCKED";
  timestamp: Date;
}

export class InventoryService {
  /**
   * 检查低库存产品
   */
  public static checkLowStockProducts(
    products: Product[],
    minimumStockLevels: Map<EntityId, number>
  ): InventoryAlert[] {
    const alerts: InventoryAlert[] = [];

    for (const product of products) {
      const minimumStock = minimumStockLevels.get(product.id) || 10; // 默认最低库存10

      let alertType: InventoryAlert["alertType"] | null = null;

      if (product.stock === 0) {
        alertType = "OUT_OF_STOCK";
      } else if (product.stock <= minimumStock) {
        alertType = "LOW_STOCK";
      } else if (product.stock > minimumStock * 10) {
        // 库存过多警告
        alertType = "OVERSTOCKED";
      }

      if (alertType) {
        alerts.push({
          productId: product.id,
          productName: product.name,
          currentStock: product.stock,
          minimumStock,
          alertType,
          timestamp: new Date(),
        });
      }
    }

    return alerts;
  }

  /**
   * 批量更新库存
   */
  public static batchUpdateStock(
    products: Product[],
    stockUpdates: Array<{
      productId: EntityId;
      newStock: number;
      reason: string;
    }>
  ): StockMovement[] {
    const movements: StockMovement[] = [];

    for (const update of stockUpdates) {
      const product = products.find((p) => p.id === update.productId);
      if (!product) {
        throw new Error(`商品不存在: ${update.productId}`);
      }

      const oldStock = product.stock;
      const quantityChange = update.newStock - oldStock;

      if (quantityChange !== 0) {
        product.setStock(update.newStock, update.reason);

        movements.push({
          productId: product.id,
          quantity: Math.abs(quantityChange),
          movementType: quantityChange > 0 ? "IN" : "OUT",
          reason: update.reason,
          timestamp: new Date(),
        });
      }
    }

    return movements;
  }

  /**
   * 检查库存可用性
   */
  public static checkStockAvailability(
    products: Product[],
    requirements: Array<{
      productId: EntityId;
      requiredQuantity: number;
    }>
  ): Array<{
    productId: EntityId;
    available: boolean;
    currentStock: number;
    requiredQuantity: number;
    shortfall: number;
  }> {
    const results = [];

    for (const requirement of requirements) {
      const product = products.find((p) => p.id === requirement.productId);
      const currentStock = product ? product.stock : 0;
      const available = currentStock >= requirement.requiredQuantity;
      const shortfall = available
        ? 0
        : requirement.requiredQuantity - currentStock;

      results.push({
        productId: requirement.productId,
        available,
        currentStock,
        requiredQuantity: requirement.requiredQuantity,
        shortfall,
      });
    }

    return results;
  }

  /**
   * 预留库存
   */
  public static reserveStock(
    products: Product[],
    reservations: Array<{
      productId: EntityId;
      quantity: number;
      reservationId: string;
      reason: string;
    }>
  ): void {
    // 首先检查所有预留是否可行
    for (const reservation of reservations) {
      const product = products.find((p) => p.id === reservation.productId);
      if (!product) {
        throw new Error(`商品不存在: ${reservation.productId}`);
      }

      if (!product.canBePurchased(reservation.quantity)) {
        throw new Error(
          `商品 ${product.name} 库存不足，无法预留 ${reservation.quantity} 件`
        );
      }
    }

    // 执行预留（减少库存）
    for (const reservation of reservations) {
      const product = products.find((p) => p.id === reservation.productId)!;
      product.decreaseStock(
        reservation.quantity,
        `库存预留 - ${reservation.reason} (预留ID: ${reservation.reservationId})`
      );
    }
  }

  /**
   * 释放预留库存
   */
  public static releaseReservedStock(
    products: Product[],
    releases: Array<{
      productId: EntityId;
      quantity: number;
      reservationId: string;
      reason: string;
    }>
  ): void {
    for (const release of releases) {
      const product = products.find((p) => p.id === release.productId);
      if (!product) {
        throw new Error(`商品不存在: ${release.productId}`);
      }

      product.increaseStock(
        release.quantity,
        `释放预留库存 - ${release.reason} (预留ID: ${release.reservationId})`
      );
    }
  }

  /**
   * 生成库存报告
   */
  public static generateInventoryReport(
    products: Product[],
    movements: StockMovement[]
  ): {
    totalProducts: number;
    totalStockValue: number; // 需要产品价格信息
    lowStockCount: number;
    outOfStockCount: number;
    recentMovements: StockMovement[];
    topMovingProducts: Array<{
      productId: EntityId;
      totalMovements: number;
    }>;
  } {
    const lowStockCount = products.filter((p) => p.stock <= 10).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;

    // 最近7天的库存变动
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentMovements = movements.filter(
      (m) => m.timestamp >= sevenDaysAgo
    );

    // 统计最活跃的商品
    const movementCounts = new Map<EntityId, number>();
    for (const movement of recentMovements) {
      const count = movementCounts.get(movement.productId) || 0;
      movementCounts.set(movement.productId, count + movement.quantity);
    }

    const topMovingProducts = Array.from(movementCounts.entries())
      .map(([productId, totalMovements]) => ({ productId, totalMovements }))
      .sort((a, b) => b.totalMovements - a.totalMovements)
      .slice(0, 10);

    return {
      totalProducts: products.length,
      totalStockValue: 0, // 需要额外计算
      lowStockCount,
      outOfStockCount,
      recentMovements,
      topMovingProducts,
    };
  }

  /**
   * 自动补货建议
   */
  public static generateRestockSuggestions(
    products: Product[],
    minimumStockLevels: Map<EntityId, number>,
    averageSalesVelocity: Map<EntityId, number> // 每日平均销量
  ): Array<{
    productId: EntityId;
    productName: string;
    currentStock: number;
    suggestedOrderQuantity: number;
    priority: "HIGH" | "MEDIUM" | "LOW";
    daysUntilStockout: number;
  }> {
    const suggestions = [];

    for (const product of products) {
      const minimumStock = minimumStockLevels.get(product.id) || 10;
      const dailySales = averageSalesVelocity.get(product.id) || 1;
      const daysUntilStockout = Math.floor(product.stock / dailySales);

      if (product.stock <= minimumStock) {
        let priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";

        if (product.stock === 0) {
          priority = "HIGH";
        } else if (daysUntilStockout <= 3) {
          priority = "HIGH";
        } else if (daysUntilStockout <= 7) {
          priority = "MEDIUM";
        } else {
          priority = "LOW";
        }

        // 建议订购量：30天的销量
        const suggestedOrderQuantity = Math.max(
          minimumStock * 2, // 至少是最低库存的2倍
          Math.ceil(dailySales * 30) // 或者30天的销量
        );

        suggestions.push({
          productId: product.id,
          productName: product.name,
          currentStock: product.stock,
          suggestedOrderQuantity,
          priority,
          daysUntilStockout,
        });
      }
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}
