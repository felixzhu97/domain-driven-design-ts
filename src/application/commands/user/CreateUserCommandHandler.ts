import { CommandHandler } from "../base/CommandHandler";
import {
  CommandResult,
  createSuccessResult,
  createFailureResult,
} from "../base/Command";
import { CreateUserCommand } from "./CreateUserCommand";
import { User } from "../../../domain/entities/User";
import { Email } from "../../../domain/value-objects";
import { IUserRepository } from "../../../domain/repositories";
import { UserRegistrationService } from "../../../domain/services/UserRegistrationService";

/**
 * 创建用户命令处理器
 */
export class CreateUserCommandHandler extends CommandHandler<
  CreateUserCommand,
  User
> {
  constructor(private readonly userRepository: IUserRepository) {
    super();
  }

  public async handle(
    command: CreateUserCommand
  ): Promise<CommandResult<User>> {
    return this.processCommand(command);
  }

  protected async validate(
    command: CreateUserCommand
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors = command.validate();

    // 额外的业务验证
    if (errors.length === 0) {
      const email = new Email(command.email);
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        errors.push("该邮箱已被注册");
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  protected async execute(command: CreateUserCommand): Promise<User> {
    // 获取所有现有用户（用于验证）
    const existingUsers = await this.userRepository.findAll();

    // 准备注册数据
    const registrationData = {
      email: command.email,
      name: command.name,
      password: command.password,
      confirmPassword: command.password, // 在命令中我们假设密码已经确认过
      initialAddress: command.initialAddress
        ? {
            country: command.initialAddress.country,
            province: command.initialAddress.province,
            city: command.initialAddress.city,
            district: command.initialAddress.district,
            street: command.initialAddress.street,
            postalCode: command.initialAddress.postalCode,
            detail: command.initialAddress.detail,
          }
        : undefined,
      agreedToTerms: true, // 在命令层面假设用户已经同意条款
      agreedToPrivacyPolicy: true,
    };

    // 使用领域服务创建用户
    const user = await UserRegistrationService.registerUser(
      registrationData,
      existingUsers
    );

    // 保存用户
    await this.userRepository.save(user);

    return user;
  }
}
