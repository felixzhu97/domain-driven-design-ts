import { EntityId } from "../../../shared/types";

/**
 * 命令接口
 */
export interface ICommand {
  readonly commandId: EntityId;
  readonly timestamp: Date;
}

/**
 * 命令基类
 */
export abstract class Command implements ICommand {
  public readonly commandId: EntityId;
  public readonly timestamp: Date;

  protected constructor() {
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
}

/**
 * 命令结果
 */
export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  validationErrors?: string[];
}

/**
 * 命令结果工具类
 */
export class CommandResultHelper {
  static success<T>(data: T, message?: string): CommandResult<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  static failure(error: string, validationErrors?: string[]): CommandResult {
    return {
      success: false,
      error,
      validationErrors,
    };
  }
}

/**
 * 创建成功结果
 */
export function createSuccessResult<T>(
  data: T,
  message?: string
): CommandResult<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * 创建成功结果（无数据）
 */
export function createSuccessResultWithoutData(
  message?: string
): CommandResult<undefined> {
  return {
    success: true,
    message,
  };
}

/**
 * 创建失败结果
 */
export function createFailureResult(
  error: string,
  validationErrors?: string[]
): CommandResult {
  const result: CommandResult = {
    success: false,
    error,
  };

  if (validationErrors) {
    result.validationErrors = validationErrors;
  }

  return result;
}
