/**
 * 用户聚合工厂
 * 处理用户聚合的创建、重建和验证逻辑
 */

import { User, UserProps, UserStatus } from "../entities/User";
import { Email } from "../value-objects/Email";
import { EntityId } from "../../shared/types";
import {
  UserCreatedEvent,
  UserEmailChangedEvent,
  UserDeactivatedEvent,
} from "../events/UserEvents";
import {
  AbstractAggregateFactory,
  FactoryOptions,
  FactoryResult,
  FactoryValidationError,
} from "./DomainFactory";
import { v4 as uuidv4 } from "uuid";

/**
 * 用户创建数据接口
 */
export interface CreateUserData {
  readonly id?: string;
  readonly name: string;
  readonly email: string;
  readonly age?: number;
  readonly isVip?: boolean;
  readonly membershipLevel?: "bronze" | "silver" | "gold" | "platinum";
  readonly preferences?: {
    readonly newsletter?: boolean;
    readonly promotions?: boolean;
    readonly language?: string;
  };
}

/**
 * 用户快照接口
 */
export interface UserSnapshot {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly age?: number;
  readonly isVip: boolean;
  readonly membershipLevel: "bronze" | "silver" | "gold" | "platinum";
  readonly preferences: {
    readonly newsletter: boolean;
    readonly promotions: boolean;
    readonly language: string;
  };
  readonly createdAt: string;
  readonly version: number;
}

/**
 * 用户工厂
 */
export class UserFactory extends AbstractAggregateFactory<
  User,
  CreateUserData
> {
  constructor() {
    super("User");
  }

  public createDefault(options: FactoryOptions = {}): FactoryResult<User> {
    const defaultData: CreateUserData = {
      name: "Anonymous User",
      email: "anonymous@example.com",
      age: 18,
      isVip: false,
      membershipLevel: "bronze",
      preferences: {
        newsletter: false,
        promotions: false,
        language: "zh-CN",
      },
    };

    return this.createFromData(defaultData, options);
  }

  public validateCreateData(data: CreateUserData): string[] {
    const errors: string[] = [];

    // 验证姓名
    if (!data.name || data.name.trim().length === 0) {
      errors.push("User name is required");
    } else if (data.name.trim().length < 2) {
      errors.push("User name must be at least 2 characters");
    } else if (data.name.trim().length > 50) {
      errors.push("User name must not exceed 50 characters");
    }

    // 验证邮箱
    if (!data.email || data.email.trim().length === 0) {
      errors.push("Email is required");
    } else {
      try {
        new Email(data.email);
      } catch (error) {
        errors.push("Invalid email format");
      }
    }

    // 验证年龄
    if (data.age !== undefined) {
      if (data.age < 0 || data.age > 150) {
        errors.push("Age must be between 0 and 150");
      }
    }

    // 验证会员等级
    if (data.membershipLevel) {
      const validLevels = ["bronze", "silver", "gold", "platinum"];
      if (!validLevels.includes(data.membershipLevel)) {
        errors.push("Invalid membership level");
      }
    }

    return errors;
  }

  protected doCreate(data: CreateUserData, options: FactoryOptions): User {
    const userId = data.id ? data.id : uuidv4();
    const email = new Email(data.email);

    const userProps: UserProps = {
      email,
      name: data.name.trim(),
      passwordHash: "default-hash", // 工厂创建时使用默认密码哈希
      status: UserStatus.ACTIVE,
      addresses: [],
      createdAt: new Date(),
    };

    const user = new User(userProps, userId);

    return user;
  }

  protected applyDefaults(data: CreateUserData): CreateUserData {
    return {
      ...data,
      name: data.name?.trim() || "Anonymous User",
      age: data.age ?? 18,
      isVip: data.isVip ?? false,
      membershipLevel: data.membershipLevel ?? "bronze",
      preferences: {
        newsletter: data.preferences?.newsletter ?? false,
        promotions: data.preferences?.promotions ?? false,
        language: data.preferences?.language ?? "zh-CN",
      },
    };
  }

  protected collectWarnings(
    data: CreateUserData,
    options: FactoryOptions
  ): string[] {
    const warnings: string[] = [];

    // 检查可能的问题
    if (data.age && data.age < 13) {
      warnings.push(
        "User age is below 13, consider parental consent requirements"
      );
    }

    if (data.email && data.email.includes("+")) {
      warnings.push("Email contains plus sign, might be a temporary email");
    }

    if (data.name && /\d/.test(data.name)) {
      warnings.push("User name contains numbers, verify if intentional");
    }

    return warnings;
  }

  public reconstituteFromEvents(
    events: readonly unknown[]
  ): FactoryResult<User> {
    const validationErrors = this.validateEventSequence(events);
    if (validationErrors.length > 0) {
      throw new FactoryValidationError(this.entityType, validationErrors);
    }

    // 从事件重建用户聚合
    let user: User | null = null;
    const warnings: string[] = [];

    for (const event of events) {
      if (this.isUserCreatedEvent(event)) {
        if (user !== null) {
          warnings.push("Multiple user created events found");
          continue;
        }

        const email = new Email(event.email);
        const userProps: UserProps = {
          email,
          name: event.name,
          passwordHash: "reconstructed-hash",
          status: UserStatus.ACTIVE,
          addresses: [],
          createdAt: new Date(),
        };

        user = new User(userProps, event.userId);
      } else if (this.isUserEmailChangedEvent(event)) {
        if (user === null) {
          throw new FactoryValidationError(this.entityType, [
            "User email changed before creation",
          ]);
        }

        // 应用邮箱更新
        const newEmail = new Email(event.newEmail);
        user.changeEmail(newEmail);
      } else if (this.isUserDeactivatedEvent(event)) {
        if (user === null) {
          warnings.push("User deactivated event for non-existent user");
        } else {
          // 标记用户为已停用状态
          user.deactivate(event.reason);
        }
      }
    }

    if (user === null) {
      throw new FactoryValidationError(this.entityType, [
        "No user created event found",
      ]);
    }

    return {
      entity: user,
      warnings,
      metadata: {
        createdAt: new Date().toISOString(),
        factoryType: this.entityType,
        eventCount: events.length,
        reconstructed: true,
      },
    };
  }

  public createFromSnapshot(snapshot: unknown): FactoryResult<User> {
    const validationErrors = this.validateSnapshotData(snapshot);
    if (validationErrors.length > 0) {
      throw new FactoryValidationError(this.entityType, validationErrors);
    }

    const userSnapshot = snapshot as UserSnapshot;

    const structureErrors = this.validateSnapshotStructure(userSnapshot);
    if (structureErrors.length > 0) {
      throw new FactoryValidationError(this.entityType, structureErrors);
    }

    const email = new Email(userSnapshot.email);
    const userProps: UserProps = {
      email,
      name: userSnapshot.name,
      passwordHash: "snapshot-hash",
      status: userSnapshot.isVip ? UserStatus.ACTIVE : UserStatus.INACTIVE,
      addresses: [],
      createdAt: new Date(userSnapshot.createdAt),
    };

    const user = new User(userProps, userSnapshot.id);

    return {
      entity: user,
      warnings: [],
      metadata: {
        createdAt: new Date().toISOString(),
        factoryType: this.entityType,
        snapshotVersion: userSnapshot.version,
        restoredFromSnapshot: true,
      },
    };
  }

  /**
   * 验证快照结构
   */
  private validateSnapshotStructure(snapshot: UserSnapshot): string[] {
    const errors: string[] = [];

    if (!snapshot.id) errors.push("Snapshot missing id");
    if (!snapshot.name) errors.push("Snapshot missing name");
    if (!snapshot.email) errors.push("Snapshot missing email");
    if (typeof snapshot.isVip !== "boolean")
      errors.push("Snapshot missing or invalid isVip");
    if (!snapshot.membershipLevel)
      errors.push("Snapshot missing membershipLevel");
    if (!snapshot.preferences) errors.push("Snapshot missing preferences");
    if (typeof snapshot.version !== "number")
      errors.push("Snapshot missing or invalid version");

    return errors;
  }

  /**
   * 类型守卫方法
   */
  private isUserCreatedEvent(event: unknown): event is UserCreatedEvent {
    return (event as any)?.type === "UserCreated";
  }

  private isUserEmailChangedEvent(
    event: unknown
  ): event is UserEmailChangedEvent {
    return (event as any)?.type === "UserEmailChanged";
  }

  private isUserDeactivatedEvent(
    event: unknown
  ): event is UserDeactivatedEvent {
    return (event as any)?.type === "UserDeactivated";
  }
}

/**
 * 用户工厂的单例实例
 */
export const userFactory = new UserFactory();
