import { EntityId } from "../../../shared/types";
import { DomainEvent } from "../../../shared/types";

/**
 * 命令接口
 */
export interface ICommand {
  readonly commandId: EntityId;
  readonly timestamp: Date;
}

/**
 * 命令执行结果
 */
export interface CommandResult<T = any> {
  success: boolean;
  data?: T | undefined;
  error?: string | undefined;
  message?: string | undefined;
  validationErrors?: string[] | undefined;
}

/**
 * 命令基类
 */
export abstract class Command implements ICommand {
  public readonly commandId: EntityId;
  public readonly timestamp: Date;

  constructor() {
    this.commandId = this.generateId();
    this.timestamp = new Date();
  }

  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * 验证命令
   */
  abstract validate(): string[];

  /**
   * 获取命令的唯一标识符
   */
  public getCommandId(): string {
    return this.commandId;
  }

  /**
   * 获取命令创建时间
   */
  public getTimestamp(): Date {
    return this.timestamp;
  }

  /**
   * 获取命令类型名称
   */
  public getCommandType(): string {
    return this.constructor.name;
  }
}

/**
 * 命令结果工具类
 */
export class CommandResultHelper {
  /**
   * 创建成功结果
   */
  public static success<T>(data?: T, message?: string): CommandResult<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * 创建失败结果
   */
  public static failure(
    error: string,
    validationErrors?: string[]
  ): CommandResult<any> {
    return {
      success: false,
      error,
      validationErrors,
    };
  }
}

/**
 * 创建成功的命令结果
 */
export function createSuccessResult<T>(
  data?: T,
  message?: string
): CommandResult<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * 创建空成功结果
 */
export function createEmptySuccessResult(
  message?: string
): CommandResult<undefined> {
  return {
    success: true,
    message,
  };
}

/**
 * 创建失败的命令结果
 */
export function createFailureResult(
  error: string,
  validationErrors?: string[]
): CommandResult<any> {
  return {
    success: false,
    error,
    validationErrors,
  };
}
