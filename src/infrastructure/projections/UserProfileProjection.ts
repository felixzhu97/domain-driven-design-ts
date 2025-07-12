import {
  IEventProjection,
  StoredEvent,
  ProjectionStatus,
} from "../../shared/types/EventStore";

/**
 * 用户档案读模型
 */
export interface UserProfileReadModel {
  userId: string;
  email: string;
  name: string;
  vipLevel: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: Date;
  registrationDate: Date;
  isActive: boolean;
  addressCount: number;
  favoriteCategories: string[];
  averageOrderValue: number;
  lastLoginDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 用户统计读模型
 */
export interface UserStatisticsReadModel {
  totalUsers: number;
  activeUsers: number;
  vipUsers: number;
  newUsersThisMonth: number;
  averageOrdersPerUser: number;
  usersByVipLevel: Record<string, number>;
  usersByMonth: Record<string, number>;
  lastUpdated: Date;
}

/**
 * 用户档案投影
 */
export class UserProfileProjection implements IEventProjection {
  public readonly projectionName = "UserProfile";
  public readonly supportedEvents = [
    "UserRegistered",
    "UserProfileUpdated",
    "UserAddressAdded",
    "UserAddressUpdated",
    "UserDeactivated",
    "UserReactivated",
    "OrderCreated",
    "OrderPaid",
    "UserVipLevelUpdated",
  ];

  private userProfiles: Map<string, UserProfileReadModel> = new Map();
  private statistics: UserStatisticsReadModel = {
    totalUsers: 0,
    activeUsers: 0,
    vipUsers: 0,
    newUsersThisMonth: 0,
    averageOrdersPerUser: 0,
    usersByVipLevel: {},
    usersByMonth: {},
    lastUpdated: new Date(),
  };

  private status: ProjectionStatus = {
    projectionName: this.projectionName,
    lastProcessedEventId: "",
    lastProcessedVersion: 0,
    isRunning: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  /**
   * 处理事件
   */
  async project(event: StoredEvent): Promise<void> {
    try {
      console.log(`👤 处理用户事件: ${event.eventType} (${event.streamId})`);

      switch (event.eventType) {
        case "UserRegistered":
          await this.handleUserRegistered(event);
          break;
        case "UserProfileUpdated":
          await this.handleUserProfileUpdated(event);
          break;
        case "UserAddressAdded":
          await this.handleUserAddressAdded(event);
          break;
        case "UserAddressUpdated":
          await this.handleUserAddressUpdated(event);
          break;
        case "UserDeactivated":
          await this.handleUserDeactivated(event);
          break;
        case "UserReactivated":
          await this.handleUserReactivated(event);
          break;
        case "OrderCreated":
          await this.handleOrderCreated(event);
          break;
        case "OrderPaid":
          await this.handleOrderPaid(event);
          break;
        case "UserVipLevelUpdated":
          await this.handleUserVipLevelUpdated(event);
          break;
        default:
          console.warn(`未知用户事件类型: ${event.eventType}`);
      }

      // 更新统计信息
      this.updateStatistics();

      // 更新投影状态
      this.status.lastProcessedEventId = event.eventId;
      this.status.lastProcessedVersion = event.streamVersion;
      this.status.updatedAt = new Date();
    } catch (error) {
      console.error(`处理用户事件失败: ${event.eventType}`, error);
      throw error;
    }
  }

  /**
   * 处理用户注册事件
   */
  private async handleUserRegistered(event: StoredEvent): Promise<void> {
    const eventData = event.eventData as any;

    const userProfile: UserProfileReadModel = {
      userId: event.streamId,
      email: eventData.email || "",
      name: eventData.name || "",
      vipLevel: "普通会员",
      totalOrders: 0,
      totalSpent: 0,
      registrationDate: event.occurredOn,
      isActive: true,
      addressCount: 0,
      favoriteCategories: [],
      averageOrderValue: 0,
      createdAt: event.occurredOn,
      updatedAt: event.occurredOn,
    };

    this.userProfiles.set(event.streamId, userProfile);
  }

  /**
   * 处理用户资料更新事件
   */
  private async handleUserProfileUpdated(event: StoredEvent): Promise<void> {
    const userProfile = this.userProfiles.get(event.streamId);
    if (!userProfile) return;

    const eventData = event.eventData as any;

    if (eventData.name) userProfile.name = eventData.name;
    if (eventData.email) userProfile.email = eventData.email;

    userProfile.updatedAt = event.occurredOn;
  }

  /**
   * 处理用户地址添加事件
   */
  private async handleUserAddressAdded(event: StoredEvent): Promise<void> {
    const userProfile = this.userProfiles.get(event.streamId);
    if (!userProfile) return;

    userProfile.addressCount++;
    userProfile.updatedAt = event.occurredOn;
  }

  /**
   * 处理用户地址更新事件
   */
  private async handleUserAddressUpdated(event: StoredEvent): Promise<void> {
    const userProfile = this.userProfiles.get(event.streamId);
    if (!userProfile) return;

    userProfile.updatedAt = event.occurredOn;
  }

  /**
   * 处理用户停用事件
   */
  private async handleUserDeactivated(event: StoredEvent): Promise<void> {
    const userProfile = this.userProfiles.get(event.streamId);
    if (!userProfile) return;

    userProfile.isActive = false;
    userProfile.updatedAt = event.occurredOn;
  }

  /**
   * 处理用户重新激活事件
   */
  private async handleUserReactivated(event: StoredEvent): Promise<void> {
    const userProfile = this.userProfiles.get(event.streamId);
    if (!userProfile) return;

    userProfile.isActive = true;
    userProfile.updatedAt = event.occurredOn;
  }

  /**
   * 处理订单创建事件
   */
  private async handleOrderCreated(event: StoredEvent): Promise<void> {
    const eventData = event.eventData as any;
    const userProfile = this.userProfiles.get(eventData.customerId);
    if (!userProfile) return;

    userProfile.totalOrders++;
    userProfile.lastOrderDate = event.occurredOn;
    userProfile.updatedAt = event.occurredOn;
  }

  /**
   * 处理订单支付事件
   */
  private async handleOrderPaid(event: StoredEvent): Promise<void> {
    const eventData = event.eventData as any;
    const userProfile = this.userProfiles.get(eventData.customerId);
    if (!userProfile) return;

    const orderAmount = eventData.totalAmount || 0;
    userProfile.totalSpent += orderAmount;
    userProfile.averageOrderValue =
      userProfile.totalOrders > 0
        ? userProfile.totalSpent / userProfile.totalOrders
        : 0;
    userProfile.updatedAt = event.occurredOn;
  }

  /**
   * 处理用户VIP等级更新事件
   */
  private async handleUserVipLevelUpdated(event: StoredEvent): Promise<void> {
    const userProfile = this.userProfiles.get(event.streamId);
    if (!userProfile) return;

    const eventData = event.eventData as any;
    userProfile.vipLevel = eventData.newLevel || "普通会员";
    userProfile.updatedAt = event.occurredOn;
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(): void {
    const users = Array.from(this.userProfiles.values());

    this.statistics.totalUsers = users.length;
    this.statistics.activeUsers = users.filter((user) => user.isActive).length;
    this.statistics.vipUsers = users.filter(
      (user) => user.vipLevel !== "普通会员"
    ).length;

    // 计算本月新用户
    const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    this.statistics.newUsersThisMonth = users.filter(
      (user) =>
        user.registrationDate.toISOString().substring(0, 7) === thisMonth
    ).length;

    // 计算平均订单数
    const totalOrders = users.reduce((sum, user) => sum + user.totalOrders, 0);
    this.statistics.averageOrdersPerUser =
      users.length > 0 ? totalOrders / users.length : 0;

    // 按VIP等级统计
    this.statistics.usersByVipLevel = {};
    for (const user of users) {
      this.statistics.usersByVipLevel[user.vipLevel] =
        (this.statistics.usersByVipLevel[user.vipLevel] || 0) + 1;
    }

    // 按月份统计注册用户
    this.statistics.usersByMonth = {};
    for (const user of users) {
      const monthKey = user.registrationDate.toISOString().substring(0, 7);
      this.statistics.usersByMonth[monthKey] =
        (this.statistics.usersByMonth[monthKey] || 0) + 1;
    }

    this.statistics.lastUpdated = new Date();
  }

  /**
   * 重置投影
   */
  async reset(): Promise<void> {
    this.userProfiles.clear();
    this.statistics = {
      totalUsers: 0,
      activeUsers: 0,
      vipUsers: 0,
      newUsersThisMonth: 0,
      averageOrdersPerUser: 0,
      usersByVipLevel: {},
      usersByMonth: {},
      lastUpdated: new Date(),
    };

    this.status = {
      projectionName: this.projectionName,
      lastProcessedEventId: "",
      lastProcessedVersion: 0,
      isRunning: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`🔄 重置投影: ${this.projectionName}`);
  }

  /**
   * 获取投影状态
   */
  async getStatus(): Promise<ProjectionStatus> {
    return { ...this.status };
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<UserStatisticsReadModel> {
    return { ...this.statistics };
  }

  // 查询方法

  /**
   * 获取用户档案
   */
  async getUserProfile(userId: string): Promise<UserProfileReadModel | null> {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * 获取所有用户档案
   */
  async getAllUserProfiles(): Promise<UserProfileReadModel[]> {
    return Array.from(this.userProfiles.values());
  }

  /**
   * 分页查询用户档案
   */
  async getUserProfilesPaginated(
    page: number,
    pageSize: number,
    filters?: {
      isActive?: boolean;
      vipLevel?: string;
      minTotalSpent?: number;
      maxTotalSpent?: number;
    }
  ): Promise<{
    users: UserProfileReadModel[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    let users = Array.from(this.userProfiles.values());

    // 应用过滤器
    if (filters) {
      if (filters.isActive !== undefined) {
        users = users.filter((user) => user.isActive === filters.isActive);
      }
      if (filters.vipLevel) {
        users = users.filter((user) => user.vipLevel === filters.vipLevel);
      }
      if (filters.minTotalSpent !== undefined) {
        users = users.filter(
          (user) => user.totalSpent >= filters.minTotalSpent!
        );
      }
      if (filters.maxTotalSpent !== undefined) {
        users = users.filter(
          (user) => user.totalSpent <= filters.maxTotalSpent!
        );
      }
    }

    // 排序（按注册日期降序）
    users.sort(
      (a, b) => b.registrationDate.getTime() - a.registrationDate.getTime()
    );

    // 分页
    const total = users.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedUsers = users.slice(startIndex, endIndex);

    return {
      users: pagedUsers,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 搜索用户档案
   */
  async searchUserProfiles(query: {
    name?: string;
    email?: string;
    vipLevel?: string;
    isActive?: boolean;
    minTotalSpent?: number;
    maxTotalSpent?: number;
    minTotalOrders?: number;
    maxTotalOrders?: number;
  }): Promise<UserProfileReadModel[]> {
    let users = Array.from(this.userProfiles.values());

    if (query.name) {
      users = users.filter((user) =>
        user.name.toLowerCase().includes(query.name!.toLowerCase())
      );
    }

    if (query.email) {
      users = users.filter((user) =>
        user.email.toLowerCase().includes(query.email!.toLowerCase())
      );
    }

    if (query.vipLevel) {
      users = users.filter((user) => user.vipLevel === query.vipLevel);
    }

    if (query.isActive !== undefined) {
      users = users.filter((user) => user.isActive === query.isActive);
    }

    if (query.minTotalSpent !== undefined) {
      users = users.filter((user) => user.totalSpent >= query.minTotalSpent!);
    }

    if (query.maxTotalSpent !== undefined) {
      users = users.filter((user) => user.totalSpent <= query.maxTotalSpent!);
    }

    if (query.minTotalOrders !== undefined) {
      users = users.filter((user) => user.totalOrders >= query.minTotalOrders!);
    }

    if (query.maxTotalOrders !== undefined) {
      users = users.filter((user) => user.totalOrders <= query.maxTotalOrders!);
    }

    return users.sort(
      (a, b) => b.registrationDate.getTime() - a.registrationDate.getTime()
    );
  }

  /**
   * 获取VIP用户
   */
  async getVipUsers(): Promise<UserProfileReadModel[]> {
    return Array.from(this.userProfiles.values())
      .filter((user) => user.vipLevel !== "普通会员")
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }

  /**
   * 获取高价值客户（按消费金额排序）
   */
  async getHighValueCustomers(
    limit: number = 50
  ): Promise<UserProfileReadModel[]> {
    return Array.from(this.userProfiles.values())
      .filter((user) => user.isActive && user.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }

  /**
   * 获取活跃客户（按订单数排序）
   */
  async getActiveCustomers(
    limit: number = 50
  ): Promise<UserProfileReadModel[]> {
    return Array.from(this.userProfiles.values())
      .filter((user) => user.isActive && user.totalOrders > 0)
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, limit);
  }
}
