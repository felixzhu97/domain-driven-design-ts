import { EntityId } from "../../../shared/types";
import { Entity } from "../../../domain/entities/Entity";
import { IRepository } from "../../../domain/repositories/IRepository";
import { IdGenerator } from "../../../shared/utils/IdGenerator";

/**
 * 内存仓储基类
 * 提供通用的内存存储功能
 */
export abstract class MemoryRepository<T extends Entity>
  implements IRepository<T>
{
  protected readonly entities: Map<EntityId, T> = new Map();

  public async save(entity: T): Promise<void> {
    this.entities.set(entity.id, entity);
  }

  public async findById(id: EntityId): Promise<T | null> {
    return this.entities.get(id) || null;
  }

  public async findAll(): Promise<T[]> {
    return Array.from(this.entities.values());
  }

  public async delete(id: EntityId): Promise<void> {
    this.entities.delete(id);
  }

  public async exists(id: EntityId): Promise<boolean> {
    return this.entities.has(id);
  }

  public async count(): Promise<number> {
    return this.entities.size;
  }

  public async clear(): Promise<void> {
    this.entities.clear();
  }

  /**
   * 生成新的实体ID
   */
  protected generateId(): EntityId {
    return IdGenerator.generate();
  }

  /**
   * 根据条件查找实体
   */
  protected findByCondition(predicate: (entity: T) => boolean): T[] {
    return Array.from(this.entities.values()).filter(predicate);
  }

  /**
   * 根据条件查找第一个实体
   */
  protected findFirstByCondition(predicate: (entity: T) => boolean): T | null {
    const entities = this.findByCondition(predicate);
    return entities.length > 0 ? entities[0] || null : null;
  }

  /**
   * 分页查询
   */
  protected paginate(
    entities: T[],
    page: number,
    limit: number
  ): {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const total = entities.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = entities.slice(startIndex, endIndex);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 排序
   */
  protected sort<K extends keyof T>(
    entities: T[],
    field: K,
    direction: "asc" | "desc" = "asc"
  ): T[] {
    return entities.sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];

      if (aValue < bValue) {
        return direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }
}
