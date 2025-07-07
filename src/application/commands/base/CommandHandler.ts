import {
  CommandResult,
  createSuccessResult,
  createFailureResult,
} from "./Command";

/**
 * 抽象命令处理器基类
 */
export abstract class CommandHandler<TCommand, TResult = any> {
  /**
   * 处理命令
   */
  public async handle(command: TCommand): Promise<CommandResult<TResult>> {
    try {
      // 验证命令
      const validationResult = await this.validate(command);
      if (!validationResult.isValid) {
        return createFailureResult("命令验证失败", validationResult.errors);
      }

      // 执行命令
      const result = await this.execute(command);
      return createSuccessResult(result, "命令执行成功");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "命令执行失败";
      return createFailureResult(errorMessage);
    }
  }

  /**
   * 验证命令
   */
  protected async validate(
    command: TCommand
  ): Promise<{ isValid: boolean; errors: string[] }> {
    // 默认实现 - 子类可以重写
    return { isValid: true, errors: [] };
  }

  /**
   * 执行命令的具体实现
   */
  protected abstract execute(command: TCommand): Promise<TResult>;

  /**
   * 获取处理器名称
   */
  public getHandlerName(): string {
    return this.constructor.name;
  }
}
