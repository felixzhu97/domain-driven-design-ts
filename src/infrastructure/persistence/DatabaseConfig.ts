/**
 * 数据库配置接口
 */
export interface DatabaseConfig {
  type: "memory" | "postgresql" | "mysql" | "mongodb";
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connectionPool?: {
    min: number;
    max: number;
    acquireTimeoutMillis?: number;
    idleTimeoutMillis?: number;
  };
}

/**
 * 默认数据库配置
 */
export const defaultDatabaseConfig: DatabaseConfig = {
  type: "memory",
  connectionPool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
};

/**
 * 数据库配置工厂
 */
export class DatabaseConfigFactory {
  /**
   * 从环境变量创建配置
   */
  static fromEnvironment(): DatabaseConfig {
    const dbType = (process.env.DB_TYPE as DatabaseConfig["type"]) || "memory";

    switch (dbType) {
      case "postgresql":
        return {
          type: "postgresql",
          host: process.env.DB_HOST || "localhost",
          port: parseInt(process.env.DB_PORT || "5432"),
          database: process.env.DB_NAME || "ddd_app",
          username: process.env.DB_USER || "postgres",
          password: process.env.DB_PASSWORD || "",
          ssl: process.env.DB_SSL === "true",
          connectionPool: {
            min: parseInt(process.env.DB_POOL_MIN || "2"),
            max: parseInt(process.env.DB_POOL_MAX || "10"),
          },
        };

      case "mysql":
        return {
          type: "mysql",
          host: process.env.DB_HOST || "localhost",
          port: parseInt(process.env.DB_PORT || "3306"),
          database: process.env.DB_NAME || "ddd_app",
          username: process.env.DB_USER || "root",
          password: process.env.DB_PASSWORD || "",
          ssl: process.env.DB_SSL === "true",
          connectionPool: {
            min: parseInt(process.env.DB_POOL_MIN || "2"),
            max: parseInt(process.env.DB_POOL_MAX || "10"),
          },
        };

      case "mongodb":
        return {
          type: "mongodb",
          host: process.env.DB_HOST || "localhost",
          port: parseInt(process.env.DB_PORT || "27017"),
          database: process.env.DB_NAME || "ddd_app",
          username: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl: process.env.DB_SSL === "true",
        };

      default:
        return defaultDatabaseConfig;
    }
  }

  /**
   * 验证配置
   */
  static validate(config: DatabaseConfig): void {
    if (!config.type) {
      throw new Error("数据库类型不能为空");
    }

    if (config.type !== "memory") {
      if (!config.host) {
        throw new Error("数据库主机地址不能为空");
      }
      if (!config.database) {
        throw new Error("数据库名称不能为空");
      }
    }

    if (config.connectionPool) {
      if (config.connectionPool.min < 0) {
        throw new Error("连接池最小连接数不能小于0");
      }
      if (config.connectionPool.max < config.connectionPool.min) {
        throw new Error("连接池最大连接数不能小于最小连接数");
      }
    }
  }
}
