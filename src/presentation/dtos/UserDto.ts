import { UserStatus } from "../../domain/entities/User";

/**
 * 创建用户请求DTO
 */
export interface CreateUserRequestDto {
  email: string;
  name: string;
  password: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

/**
 * 更新用户请求DTO
 */
export interface UpdateUserRequestDto {
  name?: string;
  email?: string;
}

/**
 * 用户登录请求DTO
 */
export interface LoginRequestDto {
  email: string;
  password: string;
}

/**
 * 添加地址请求DTO
 */
export interface AddAddressRequestDto {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * 修改密码请求DTO
 */
export interface ChangePasswordRequestDto {
  oldPassword: string;
  newPassword: string;
}

/**
 * 用户响应DTO
 */
export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  addresses: Array<{
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }>;
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * 用户列表响应DTO
 */
export interface UserListResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 用户统计响应DTO
 */
export interface UserStatsResponseDto {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  newUsersToday: number;
  newUsersThisMonth: number;
}
