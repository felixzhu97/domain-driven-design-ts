import { CommandHandler } from "../commands/base/CommandHandler";
import { QueryHandler } from "../queries/base/QueryHandler";
import { Command } from "../commands/base/Command";
import { Query } from "../queries/base/Query";

/**
 * 处理器注册表 - 管理所有命令和查询处理器
 */
export class HandlerRegistry {
  private static instance: HandlerRegistry;
  private commandHandlers: Map<string, CommandHandler<any, any>>;
  private queryHandlers: Map<string, QueryHandler<any, any>>;

  private constructor() {
    this.commandHandlers = new Map();
    this.queryHandlers = new Map();
  }

  public static getInstance(): HandlerRegistry {
    if (!HandlerRegistry.instance) {
      HandlerRegistry.instance = new HandlerRegistry();
    }
    return HandlerRegistry.instance;
  }

  /**
   * 注册命令处理器
   */
  public registerCommandHandler<TCommand extends Command, TResult>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>
  ): void {
    if (this.commandHandlers.has(commandType)) {
      throw new Error(`Command handler for ${commandType} already registered`);
    }
    this.commandHandlers.set(commandType, handler);
  }

  /**
   * 注册查询处理器
   */
  public registerQueryHandler<TQuery extends Query, TResult>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    if (this.queryHandlers.has(queryType)) {
      throw new Error(`Query handler for ${queryType} already registered`);
    }
    this.queryHandlers.set(queryType, handler);
  }

  /**
   * 获取命令处理器
   */
  public getCommandHandler<TCommand extends Command, TResult>(
    commandType: string
  ): CommandHandler<TCommand, TResult> {
    const handler = this.commandHandlers.get(commandType);
    if (!handler) {
      throw new Error(`Command handler for ${commandType} not found`);
    }
    return handler as CommandHandler<TCommand, TResult>;
  }

  /**
   * 获取查询处理器
   */
  public getQueryHandler<TQuery extends Query, TResult>(
    queryType: string
  ): QueryHandler<TQuery, TResult> {
    const handler = this.queryHandlers.get(queryType);
    if (!handler) {
      throw new Error(`Query handler for ${queryType} not found`);
    }
    return handler as QueryHandler<TQuery, TResult>;
  }

  /**
   * 获取所有已注册的命令类型
   */
  public getRegisteredCommandTypes(): string[] {
    return Array.from(this.commandHandlers.keys());
  }

  /**
   * 获取所有已注册的查询类型
   */
  public getRegisteredQueryTypes(): string[] {
    return Array.from(this.queryHandlers.keys());
  }

  /**
   * 清除所有注册的处理器（主要用于测试）
   */
  public clear(): void {
    this.commandHandlers.clear();
    this.queryHandlers.clear();
  }
}
