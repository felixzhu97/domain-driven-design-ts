import { User } from "../entities";
import { Email, Address } from "../value-objects";
import { EntityId } from "../../shared/types";

export interface RegistrationData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  initialAddress?: {
    country: string;
    province: string;
    city: string;
    district: string;
    street: string;
    postalCode: string;
    detail?: string;
  };
  agreedToTerms: boolean;
  agreedToPrivacyPolicy: boolean;
}

export interface UserValidationRule {
  name: string;
  validate: (data: RegistrationData) => boolean;
  errorMessage: string;
}

export class UserRegistrationService {
  private static readonly DEFAULT_VALIDATION_RULES: UserValidationRule[] = [
    {
      name: "email_format",
      validate: (data) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
      errorMessage: "邮箱格式不正确",
    },
    {
      name: "name_length",
      validate: (data) =>
        data.name.trim().length >= 2 && data.name.trim().length <= 50,
      errorMessage: "姓名长度必须在2-50个字符之间",
    },
    {
      name: "password_strength",
      validate: (data) =>
        data.password.length >= 8 &&
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password),
      errorMessage: "密码必须至少8位，包含大小写字母和数字",
    },
    {
      name: "password_confirmation",
      validate: (data) => data.password === data.confirmPassword,
      errorMessage: "两次输入的密码不一致",
    },
    {
      name: "terms_agreement",
      validate: (data) => data.agreedToTerms === true,
      errorMessage: "必须同意用户条款",
    },
    {
      name: "privacy_agreement",
      validate: (data) => data.agreedToPrivacyPolicy === true,
      errorMessage: "必须同意隐私政策",
    },
  ];

  /**
   * 验证注册数据
   */
  public static validateRegistrationData(
    data: RegistrationData,
    customRules: UserValidationRule[] = []
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allRules = [...this.DEFAULT_VALIDATION_RULES, ...customRules];

    for (const rule of allRules) {
      if (!rule.validate(data)) {
        errors.push(rule.errorMessage);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 检查邮箱是否已存在
   */
  public static async checkEmailExists(
    email: string,
    existingUsers: User[]
  ): Promise<boolean> {
    const emailObj = Email.create(email.toLowerCase());
    return existingUsers.some((user) => user.email.equals(emailObj));
  }

  /**
   * 生成密码哈希
   */
  public static hashPassword(password: string): string {
    // 这里应该使用真正的密码哈希算法，如 bcrypt
    // 这只是一个示例实现
    return `hashed_${password}_${Date.now()}`;
  }

  /**
   * 注册新用户
   */
  public static async registerUser(
    data: RegistrationData,
    existingUsers: User[],
    customValidationRules: UserValidationRule[] = []
  ): Promise<User> {
    // 1. 验证注册数据
    const validation = this.validateRegistrationData(
      data,
      customValidationRules
    );
    if (!validation.isValid) {
      throw new Error(`注册数据验证失败: ${validation.errors.join(", ")}`);
    }

    // 2. 检查邮箱是否已存在
    const emailExists = await this.checkEmailExists(data.email, existingUsers);
    if (emailExists) {
      throw new Error("邮箱地址已被注册");
    }

    // 3. 创建邮箱值对象
    const email = Email.create(data.email.toLowerCase());

    // 4. 处理密码
    const passwordHash = this.hashPassword(data.password);

    // 5. 创建地址值对象（如果提供）
    let initialAddress: Address | undefined;
    if (data.initialAddress) {
      initialAddress = Address.create(data.initialAddress);
    }

    // 6. 创建用户实体
    const user = User.create(
      email,
      data.name.trim(),
      passwordHash,
      initialAddress
    );

    return user;
  }

  /**
   * 验证用户登录
   */
  public static validateLogin(
    email: string,
    password: string,
    user: User
  ): { isValid: boolean; error?: string } {
    // 1. 检查用户状态
    if (!user.isActive) {
      return {
        isValid: false,
        error: "账户已被停用",
      };
    }

    if (user.isSuspended) {
      return {
        isValid: false,
        error: "账户已被暂停",
      };
    }

    // 2. 验证邮箱
    const emailObj = Email.create(email.toLowerCase());
    if (!user.email.equals(emailObj)) {
      return {
        isValid: false,
        error: "邮箱地址不正确",
      };
    }

    // 3. 验证密码
    const passwordHash = this.hashPassword(password);
    if (!user.verifyPassword(passwordHash)) {
      return {
        isValid: false,
        error: "密码不正确",
      };
    }

    return { isValid: true };
  }

  /**
   * 生成密码重置令牌
   */
  public static generatePasswordResetToken(userId: EntityId): string {
    // 这是一个简化的实现，实际应该使用安全的令牌生成算法
    const timestamp = Date.now().toString();
    const randomStr = Math.random().toString(36);
    const random = randomStr.length > 2 ? randomStr.substring(2) : randomStr;
    return `${userId}_${timestamp}_${random}`;
  }

  /**
   * 验证密码重置令牌
   */
  public static validatePasswordResetToken(
    token: string,
    userId: EntityId,
    maxAgeInMinutes: number = 30
  ): boolean {
    try {
      const parts = token.split("_");
      if (parts.length !== 3) {
        return false;
      }

      const tokenUserId = parts[0];
      const timestampStr = parts[1];
      if (!timestampStr) {
        return false;
      }
      const timestamp = parseInt(timestampStr);

      // 检查用户ID是否匹配
      if (tokenUserId !== userId) {
        return false;
      }

      // 检查令牌是否过期
      const now = Date.now();
      const tokenAge = (now - timestamp) / (1000 * 60); // 转换为分钟

      return tokenAge <= maxAgeInMinutes;
    } catch {
      return false;
    }
  }

  /**
   * 更新用户密码
   */
  public static updateUserPassword(
    user: User,
    newPassword: string,
    confirmPassword: string
  ): void {
    // 验证新密码
    if (newPassword !== confirmPassword) {
      throw new Error("两次输入的密码不一致");
    }

    if (
      newPassword.length < 8 ||
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)
    ) {
      throw new Error("密码必须至少8位，包含大小写字母和数字");
    }

    // 更新密码
    const newPasswordHash = this.hashPassword(newPassword);
    user.changePassword(newPasswordHash);
  }

  /**
   * 生成用户欢迎消息
   */
  public static generateWelcomeMessage(user: User): string {
    const timeOfDay = this.getTimeOfDay();
    return `${timeOfDay}，${user.name}！欢迎加入我们的平台。您的账户已创建成功，现在可以开始购物了。`;
  }

  /**
   * 检查用户名是否可用
   */
  public static isUsernameAvailable(
    username: string,
    existingUsers: User[]
  ): boolean {
    const normalizedUsername = username.toLowerCase().trim();

    // 检查长度
    if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
      return false;
    }

    // 检查字符
    if (!/^[a-zA-Z0-9_-]+$/.test(normalizedUsername)) {
      return false;
    }

    // 检查是否已被使用
    return !existingUsers.some(
      (user) => user.name.toLowerCase() === normalizedUsername
    );
  }

  /**
   * 获取时间段问候语
   */
  private static getTimeOfDay(): string {
    const hour = new Date().getHours();

    if (hour < 6) {
      return "凌晨好";
    } else if (hour < 12) {
      return "上午好";
    } else if (hour < 14) {
      return "中午好";
    } else if (hour < 18) {
      return "下午好";
    } else {
      return "晚上好";
    }
  }

  /**
   * 验证手机号格式（中国大陆）
   */
  public static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 生成用户唯一标识符
   */
  public static generateUserCode(name: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const nameCode = (name || "USR").substring(0, 3).toUpperCase();
    const randomStr = Math.random().toString(36);
    const random = (
      randomStr.length > 5 ? randomStr.substring(2, 5) : randomStr.substring(2)
    ).toUpperCase();

    return `USER_${nameCode}_${timestamp}_${random}`;
  }
}
