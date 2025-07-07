import { User } from "../../../domain/entities";
import { Email } from "../../../domain/value-objects";
import { IUserRepository } from "../../../domain/repositories";
import { MemoryRepository } from "./MemoryRepository";

/**
 * 内存用户仓储实现
 */
export class MemoryUserRepository
  extends MemoryRepository<User>
  implements IUserRepository
{
  public async findByEmail(email: Email): Promise<User | null> {
    return this.findFirstByCondition((user) => user.email.equals(email));
  }

  public async findByEmailString(email: string): Promise<User | null> {
    return this.findFirstByCondition((user) => user.email.value === email);
  }

  public async findByName(name: string): Promise<User | null> {
    return this.findFirstByCondition((user) => user.name === name);
  }

  public async findActiveUsers(): Promise<User[]> {
    return this.findByCondition((user) => user.isActive);
  }

  public async findInactiveUsers(): Promise<User[]> {
    return this.findByCondition((user) => !user.isActive);
  }

  public async findWithPagination(
    page: number,
    limit: number
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    const allUsers = await this.findAll();
    const result = this.paginate(allUsers, page, limit);

    return {
      users: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  public async findByRegistrationDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<User[]> {
    return this.findByCondition((user) => {
      const registrationDate = user.createdAt;
      return registrationDate >= startDate && registrationDate <= endDate;
    });
  }

  public async search(query: string): Promise<User[]> {
    const searchTerm = query.toLowerCase();
    return this.findByCondition((user) => {
      const nameMatch = user.name.toLowerCase().includes(searchTerm);
      const emailMatch = user.email.value.toLowerCase().includes(searchTerm);
      return nameMatch || emailMatch;
    });
  }

  public async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    suspendedUsers: number;
    newUsersThisMonth: number;
  }> {
    const allUsers = await this.findAll();
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((user) => user.isActive).length;
    const inactiveUsers = allUsers.filter((user) => !user.isActive).length;
    const suspendedUsers = allUsers.filter((user) => user.isSuspended).length;
    const newUsersThisMonth = allUsers.filter(
      (user) => user.createdAt >= thisMonthStart
    ).length;

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      newUsersThisMonth,
    };
  }

  /**
   * 根据邮箱域名查找用户
   */
  public async findByEmailDomain(domain: string): Promise<User[]> {
    return this.findByCondition((user) =>
      user.email.value.endsWith(`@${domain}`)
    );
  }

  /**
   * 查找最近注册的用户
   */
  public async findRecentUsers(days: number): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.findByCondition((user) => user.createdAt >= cutoffDate).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * 查找有地址的用户
   */
  public async findUsersWithAddresses(): Promise<User[]> {
    return this.findByCondition((user) => user.addresses.length > 0);
  }
}
