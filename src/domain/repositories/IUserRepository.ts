import { User } from "../entities";
import { Email } from "../value-objects";
import { EntityId } from "../../shared/types";
import { IRepository } from "./IRepository";

export interface IUserRepository extends IRepository<User> {
  /**
   * 根据邮箱查找用户
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * 根据邮箱字符串查找用户
   */
  findByEmailString(email: string): Promise<User | null>;

  /**
   * 根据用户名查找用户
   */
  findByName(name: string): Promise<User | null>;

  /**
   * 查找活跃用户
   */
  findActiveUsers(): Promise<User[]>;

  /**
   * 查找停用用户
   */
  findInactiveUsers(): Promise<User[]>;

  /**
   * 分页查找用户
   */
  findWithPagination(
    page: number,
    limit: number
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * 根据注册时间范围查找用户
   */
  findByRegistrationDateRange(startDate: Date, endDate: Date): Promise<User[]>;

  /**
   * 搜索用户（根据名称或邮箱）
   */
  search(query: string): Promise<User[]>;

  /**
   * 获取用户统计信息
   */
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    suspendedUsers: number;
    newUsersThisMonth: number;
  }>;
}
