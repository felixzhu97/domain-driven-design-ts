import { BaseController, HttpResponse } from "./BaseController";
import {
  CreateUserCommand,
  CreateUserCommandHandler,
} from "../../application/commands";
import {
  GetUserByIdQuery,
  GetUserByIdQueryHandler,
} from "../../application/queries";
import { MemoryUserRepository } from "../../infrastructure/repositories";
import { Address } from "../../domain/value-objects";

/**
 * 用户控制器
 */
export class UserController extends BaseController {
  private userRepository = new MemoryUserRepository();
  private createUserHandler = new CreateUserCommandHandler(this.userRepository);
  private getUserByIdHandler = new GetUserByIdQueryHandler(this.userRepository);

  /**
   * 创建用户
   * POST /api/users
   */
  public async createUser(request: CreateUserRequest): Promise<HttpResponse> {
    try {
      // 验证必填字段
      const requiredFields = ["email", "name", "password"];
      const validationErrors = this.validateRequired(request, requiredFields);

      if (validationErrors.length > 0) {
        return this.badRequest("请求参数验证失败", validationErrors);
      }

      // 验证邮箱格式
      if (!this.validateEmail(request.email)) {
        return this.badRequest("邮箱格式无效");
      }

      // 验证密码强度
      if (request.password.length < 8) {
        return this.badRequest("密码至少需要8个字符");
      }

      // 创建地址对象（如果提供）
      let initialAddress: Address | undefined;
      if (request.address) {
        const addressData: any = {
          country: request.address.country,
          province: request.address.province,
          city: request.address.city,
          district: request.address.district || "",
          street: request.address.street,
          postalCode: request.address.postalCode,
        };
        if (request.address.detail) {
          addressData.detail = request.address.detail;
        }
        initialAddress = Address.create(addressData);
      }

      // 创建命令
      const commandData: any = {
        email: request.email,
        name: request.name,
        password: request.password,
      };
      if (initialAddress) {
        commandData.initialAddress = initialAddress;
      }
      const command = new CreateUserCommand(commandData);

      // 执行命令
      const result = await this.createUserHandler.handle(command);

      return this.fromCommandResult(result, "用户创建成功");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 根据ID获取用户
   * GET /api/users/:id
   */
  public async getUserById(userId: string): Promise<HttpResponse> {
    try {
      // 验证用户ID
      if (!userId || userId.trim() === "") {
        return this.badRequest("用户ID不能为空");
      }

      // 创建查询
      const query = new GetUserByIdQuery(userId);

      // 执行查询
      const result = await this.getUserByIdHandler.handle(query);

      if (!result.success) {
        return this.notFound(result.error || "用户不存在");
      }

      return this.fromQueryResult(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 获取所有用户
   * GET /api/users
   */
  public async getUsers(request: GetUsersRequest = {}): Promise<HttpResponse> {
    try {
      const page = Math.max(1, request.page || 1);
      const pageSize = Math.min(50, Math.max(1, request.pageSize || 10));

      const result = await this.userRepository.findWithPagination(
        page,
        pageSize
      );

      return this.paginated(
        result.users.map((user) => this.mapUserToResponse(user)),
        result.total,
        result.page,
        result.limit,
        "用户列表获取成功"
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 搜索用户
   * GET /api/users/search?q=keyword
   */
  public async searchUsers(query: string): Promise<HttpResponse> {
    try {
      if (!query || query.trim() === "") {
        return this.badRequest("搜索关键词不能为空");
      }

      const users = await this.userRepository.search(query);

      return this.ok(
        users.map((user) => this.mapUserToResponse(user)),
        `找到 ${users.length} 个用户`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 获取用户统计信息
   * GET /api/users/stats
   */
  public async getUserStats(): Promise<HttpResponse> {
    try {
      const stats = await this.userRepository.getUserStats();
      return this.ok(stats, "用户统计信息获取成功");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 将用户实体映射为响应对象
   */
  private mapUserToResponse(user: any) {
    return {
      id: user.id,
      email: user.email.value,
      name: user.name,
      isActive: user.isActive,
      isSuspended: user.isSuspended,
      addresses: user.addresses.map((addr: any) => ({
        country: addr.country,
        province: addr.province,
        city: addr.city,
        district: addr.district,
        street: addr.street,
        postalCode: addr.postalCode,
        detail: addr.detail,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

/**
 * 创建用户请求接口
 */
export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  address?: {
    country: string;
    province: string;
    city: string;
    district?: string;
    street: string;
    postalCode: string;
    detail?: string;
  };
}

/**
 * 获取用户列表请求接口
 */
export interface GetUsersRequest {
  page?: number;
  pageSize?: number;
}
