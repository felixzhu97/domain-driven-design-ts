import { ICommand, CommandResult } from "./Command";

/**
 * 命令处理器接口
 */
export interface ICommandHandler<TCommand extends ICommand, TResult = any> {
  handle(command: TCommand): Promise<CommandResult<TResult>>;
}

/**
 * 命令处理器基类
 */
export abstract class CommandHandler<TCommand extends ICommand, TResult = any>
  implements ICommandHandler<TCommand, TResult>
{
  public abstract handle(command: TCommand): Promise<CommandResult<TResult>>;

  /**
   * 验证命令
   */
  protected abstract validateCommand(command: TCommand): string[];

  /**
   * 执行命令
   */
  protected abstract executeCommand(command: TCommand): Promise<TResult>;

  /**
   * 处理命令的通用流程
   */
  protected async processCommand(
    command: TCommand
  ): Promise<CommandResult<TResult>> {
    try {
      // 1. 验证命令
      const validationErrors = this.validateCommand(command);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: "命令验证失败",
          validationErrors,
        };
      }

      // 2. 执行命令
      const result = await this.executeCommand(command);

      // 3. 返回成功结果
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // 4. 处理异常
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 创建成功结果
   */
  protected success<T>(data: T, message?: string): CommandResult<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * 创建失败结果
   */
  protected failure(error: string, validationErrors?: string[]): CommandResult {
    return {
      success: false,
      error,
      validationErrors,
    };
  }
}
