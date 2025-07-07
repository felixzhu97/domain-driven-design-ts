import { AggregateRoot } from "./AggregateRoot";
import { Email, Address } from "../value-objects";
import { DomainEvent, EntityId } from "../../shared/types";
import {
  UserCreatedEvent,
  UserEmailChangedEvent,
  UserDeactivatedEvent,
} from "../events/UserEvents";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

export interface UserProps {
  email: Email;
  name: string;
  passwordHash: string;
  status: UserStatus;
  addresses: Address[];
  createdAt: Date;
  lastLoginAt?: Date;
}

export class User extends AggregateRoot {
  private _email: Email;
  private _name: string;
  private _passwordHash: string;
  private _status: UserStatus;
  private _addresses: Address[];
  private _createdAt: Date;
  private _lastLoginAt: Date | undefined;

  constructor(props: UserProps, id?: EntityId) {
    super(id);
    this._email = props.email;
    this._name = props.name;
    this._passwordHash = props.passwordHash;
    this._status = props.status;
    this._addresses = [...props.addresses];
    this._createdAt = props.createdAt;
    this._lastLoginAt = props.lastLoginAt;

    // 如果是新创建的用户，发布事件
    if (!id) {
      this.addEvent(
        new UserCreatedEvent(this.id, this._email.value, this._name)
      );
    }
  }

  // Getters
  public get email(): Email {
    return this._email;
  }

  public get name(): string {
    return this._name;
  }

  public get status(): UserStatus {
    return this._status;
  }

  public get addresses(): Address[] {
    return [...this._addresses];
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get lastLoginAt(): Date | undefined {
    return this._lastLoginAt;
  }

  public get isActive(): boolean {
    return this._status === UserStatus.ACTIVE;
  }

  public get isInactive(): boolean {
    return this._status === UserStatus.INACTIVE;
  }

  public get isSuspended(): boolean {
    return this._status === UserStatus.SUSPENDED;
  }

  // 业务方法
  public changeEmail(newEmail: Email): void {
    if (this._email.equals(newEmail)) {
      return; // 邮箱没有变化
    }

    const oldEmail = this._email.value;
    this._email = newEmail;
    this.addEvent(new UserEmailChangedEvent(this.id, oldEmail, newEmail.value));
  }

  public changeName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error("用户名不能为空");
    }

    if (newName.length > 100) {
      throw new Error("用户名长度不能超过100个字符");
    }

    this._name = newName.trim();
  }

  public addAddress(address: Address): void {
    // 检查是否已存在相同地址
    const exists = this._addresses.some((addr) => addr.equals(address));
    if (exists) {
      throw new Error("该地址已存在");
    }

    this._addresses.push(address);
  }

  public removeAddress(address: Address): void {
    const index = this._addresses.findIndex((addr) => addr.equals(address));
    if (index === -1) {
      throw new Error("地址不存在");
    }

    this._addresses.splice(index, 1);
  }

  public updateLastLoginTime(): void {
    this._lastLoginAt = new Date();
  }

  public deactivate(reason?: string): void {
    if (this._status === UserStatus.INACTIVE) {
      return; // 已经是非活跃状态
    }

    this._status = UserStatus.INACTIVE;
    this.addEvent(new UserDeactivatedEvent(this.id, reason));
  }

  public activate(): void {
    if (this._status === UserStatus.ACTIVE) {
      return; // 已经是活跃状态
    }

    this._status = UserStatus.ACTIVE;
  }

  public suspend(): void {
    this._status = UserStatus.SUSPENDED;
  }

  public verifyPassword(passwordHash: string): boolean {
    return this._passwordHash === passwordHash;
  }

  public changePassword(newPasswordHash: string): void {
    if (!newPasswordHash || newPasswordHash.trim().length === 0) {
      throw new Error("密码哈希不能为空");
    }

    this._passwordHash = newPasswordHash;
  }

  protected applyEvent(event: DomainEvent, isNew: boolean): void {
    switch (event.eventType) {
      case "UserCreated":
        // 创建事件已在构造函数中处理
        break;
      case "UserEmailChanged":
        // 邮箱变更事件已在changeEmail方法中处理
        break;
      case "UserDeactivated":
        // 停用事件已在deactivate方法中处理
        break;
      default:
        // 忽略未知事件
        break;
    }
  }

  // 静态工厂方法
  public static create(
    email: Email,
    name: string,
    passwordHash: string,
    initialAddress?: Address
  ): User {
    const addresses = initialAddress ? [initialAddress] : [];

    return new User({
      email,
      name,
      passwordHash,
      status: UserStatus.ACTIVE,
      addresses,
      createdAt: new Date(),
    });
  }

  public static fromSnapshot(props: UserProps, id: EntityId): User {
    return new User(props, id);
  }
}
