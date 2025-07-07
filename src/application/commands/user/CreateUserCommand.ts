import { Command } from "../base/Command";
import { Address } from "../../../domain/value-objects";

/**
 * 创建用户命令
 */
export class CreateUserCommand extends Command {
  public readonly email: string;
  public readonly name: string;
  public readonly password: string;
  public readonly initialAddress?: Address;

  constructor(data: {
    email: string;
    name: string;
    password: string;
    initialAddress?: Address;
  }) {
    super();
    this.email = data.email;
    this.name = data.name;
    this.password = data.password;
    if (data.initialAddress) {
      this.initialAddress = data.initialAddress;
    }
  }

  /**
   * 验证命令
   */
  validate(): string[] {
    const errors: string[] = [];

    if (!this.email || this.email.trim().length === 0) {
      errors.push("邮箱不能为空");
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push("用户名不能为空");
    }

    if (!this.password || this.password.trim().length === 0) {
      errors.push("密码不能为空");
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email && !emailRegex.test(this.email)) {
      errors.push("邮箱格式不正确");
    }

    return errors;
  }
}
