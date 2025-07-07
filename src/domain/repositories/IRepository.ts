import { EntityId } from "../../shared/types";

export interface IRepository<T> {
  /**
   * 根据ID查找实体
   */
  findById(id: EntityId): Promise<T | null>;

  /**
   * 查找所有实体
   */
  findAll(): Promise<T[]>;

  /**
   * 保存实体
   */
  save(entity: T): Promise<void>;

  /**
   * 删除实体
   */
  delete(id: EntityId): Promise<void>;

  /**
   * 检查实体是否存在
   */
  exists(id: EntityId): Promise<boolean>;
}
