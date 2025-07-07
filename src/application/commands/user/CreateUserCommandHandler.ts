import { CommandHandler } from "../base/CommandHandler";
import { CreateUserCommand } from "./CreateUserCommand";
import { User } from "../../../domain/entities/User";
import { Email } from "../../../domain/value-objects";
import { IUserRepository } from "../../../domain/repositories";
import {
  UserRegistrationService,
  RegistrationData,
} from "../../../domain/services/UserRegistrationService";

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
    // 获取现有用户列表进行验证
    const existingUsers = await this.userRepository.findAll();

    // 准备注册数据
    const registrationData: RegistrationData = {
      email: command.email,
      name: command.name,
      password: command.password,
      confirmPassword: command.password,
      agreedToTerms: true,
      agreedToPrivacyPolicy: true,
    };

    // 处理可选地址
    if (command.initialAddress) {
      registrationData.initialAddress = {
        country: command.initialAddress.country,
        province: command.initialAddress.province,
        city: command.initialAddress.city,
        district: command.initialAddress.district,
        street: command.initialAddress.street,
        postalCode: command.initialAddress.postalCode,
      };

      if (command.initialAddress.detail !== undefined) {
        registrationData.initialAddress.detail = command.initialAddress.detail;
      }
    }

    // 使用用户注册服务创建用户
    const user = await UserRegistrationService.registerUser(
      registrationData,
      existingUsers
    );

    // 保存用户
    await this.userRepository.save(user);

    return user;
  }
}
