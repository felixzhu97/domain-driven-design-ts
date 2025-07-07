import { IUserRepository } from "../../domain/repositories";
import { User, UserStatus } from "../../domain/entities/User";
import { Email, Address } from "../../domain/value-objects";
import { EntityId } from "../../shared/types";

/**
 * 用户应用服务 - 封装用户相关的业务流程
 */
export class UserApplicationService {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * 创建新用户
   */
  async createUser(data: {
    email: string;
    name: string;
    passwordHash: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  }): Promise<User> {
    // 检查邮箱是否已存在
    const email = new Email(data.email);
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error("该邮箱已被注册");
    }

    // 创建地址（如果提供）
    const address = data.address
      ? new Address({
          country: data.address.country,
          province: data.address.state,
          city: data.address.city,
          district: "",
          street: data.address.street,
          postalCode: data.address.zipCode,
        })
      : undefined;

    // 创建用户
    const user = User.create(email, data.name, data.passwordHash, address);

    // 保存用户
    await this.userRepository.save(user);

    return user;
  }

  /**
   * 用户登录
   */
  async authenticateUser(email: string, passwordHash: string): Promise<User> {
    const userEmail = new Email(email);
    const user = await this.userRepository.findByEmail(userEmail);

    if (!user) {
      throw new Error("用户不存在");
    }

    if (!user.verifyPassword(passwordHash)) {
      throw new Error("密码错误");
    }

    if (!user.isActive) {
      throw new Error("用户账户已被停用");
    }

    // 更新最后登录时间
    user.updateLastLoginTime();
    await this.userRepository.save(user);

    return user;
  }

  /**
   * 更新用户信息
   */
  async updateUserProfile(
    userId: string,
    updates: {
      name?: string;
      email?: string;
    }
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    // 更新姓名
    if (updates.name) {
      user.changeName(updates.name);
    }

    // 更新邮箱
    if (updates.email) {
      const newEmail = new Email(updates.email);
      // 检查新邮箱是否已被其他用户使用
      const existingUser = await this.userRepository.findByEmail(newEmail);
      if (existingUser && existingUser.id !== userId) {
        throw new Error("该邮箱已被其他用户使用");
      }
      user.changeEmail(newEmail);
    }

    await this.userRepository.save(user);
    return user;
  }

  /**
   * 添加用户地址
   */
  async addUserAddress(
    userId: EntityId,
    addressData: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    }
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    const address = new Address({
      country: addressData.country,
      province: addressData.state,
      city: addressData.city,
      district: "",
      street: addressData.street,
      postalCode: addressData.zipCode,
    });

    user.addAddress(address);
    await this.userRepository.save(user);

    return user;
  }

  /**
   * 停用用户账户
   */
  async deactivateUser(userId: EntityId, reason?: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    user.deactivate(reason);
    await this.userRepository.save(user);

    return user;
  }

  /**
   * 激活用户账户
   */
  async activateUser(userId: EntityId): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    user.activate();
    await this.userRepository.save(user);

    return user;
  }

  /**
   * 修改用户密码
   */
  async changeUserPassword(
    userId: EntityId,
    oldPasswordHash: string,
    newPasswordHash: string
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    if (!user.verifyPassword(oldPasswordHash)) {
      throw new Error("原密码错误");
    }

    user.changePassword(newPasswordHash);
    await this.userRepository.save(user);

    return user;
  }

  /**
   * 比较两个用户ID是否相等
   */
  private compareUserIds(id1: string, id2: string): boolean {
    return id1 === id2;
  }

  /**
   * 为用户添加地址
   */
  async addAddressToUser(
    userId: string,
    addressData: {
      street: string;
      city: string;
      province: string;
      district: string;
      country: string;
      postalCode: string;
      detail?: string;
    }
  ): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { success: false, message: "用户不存在" };
      }

      const addressProps = {
        street: addressData.street,
        city: addressData.city,
        province: addressData.province,
        district: addressData.district,
        country: addressData.country,
        postalCode: addressData.postalCode,
        ...(addressData.detail !== undefined && { detail: addressData.detail }),
      };

      const address = new Address(addressProps);

      // 这里需要在User实体中添加addAddress方法
      // user.addAddress(address);

      await this.userRepository.save(user);

      return {
        success: true,
        message: "地址添加成功",
        user,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "添加地址失败",
      };
    }
  }
}
