import { CommandHandler, ICommandHandler } from "../base/CommandHandler";
import {
  CommandResult,
  createSuccessResult,
  createFailureResult,
} from "../base/Command";
import { CreateUserCommand } from "./CreateUserCommand";
import { User } from "../../../domain/entities";
import { Email } from "../../../domain/value-objects";
import { UserRegistrationService } from "../../../domain/services";
import { IUserRepository } from "../../../domain/repositories";

/**
 * 创建用户命令处理器
 */
export class CreateUserCommandHandler
  extends CommandHandler<CreateUserCommand, User>
  implements ICommandHandler<CreateUserCommand, User>
{
  constructor(private userRepository: IUserRepository) {
    super();
  }

  public async handle(
    command: CreateUserCommand
  ): Promise<CommandResult<User>> {
    return this.processCommand(command);
  }

  protected validateCommand(command: CreateUserCommand): string[] {
    const errors: string[] = [];

    if (!command.email?.trim()) {
      errors.push("邮箱地址不能为空");
    } else {
      try {
        Email.create(command.email);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "邮箱格式无效");
      }
    }

    if (!command.name?.trim()) {
      errors.push("用户名不能为空");
    } else if (command.name.trim().length < 2) {
      errors.push("用户名至少需要2个字符");
    } else if (command.name.trim().length > 50) {
      errors.push("用户名不能超过50个字符");
    }

    if (!command.password) {
      errors.push("密码不能为空");
    } else if (command.password.length < 8) {
      errors.push("密码至少需要8个字符");
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(command.password)) {
      errors.push("密码必须包含大写字母、小写字母和数字");
    }

    return errors;
  }

  protected async executeCommand(command: CreateUserCommand): Promise<User> {
    // 1. 检查邮箱是否已存在
    const email = Email.create(command.email);
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error("该邮箱地址已被注册");
    }

    // 2. 哈希密码
    const hashedPassword = UserRegistrationService.hashPassword(
      command.password
    );

    // 4. 创建用户实体
    const user = User.create(
      email,
      command.name.trim(),
      hashedPassword,
      command.initialAddress
    );

    // 5. 保存用户
    await this.userRepository.save(user);

    return user;
  }
}
