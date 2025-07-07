/**
 * ID生成器工具类
 * 提供统一的ID生成方法
 */
export class IdGenerator {
  /**
   * 生成UUID格式的ID
   */
  public static generate(): string {
    // 简化版UUID生成器，避免外部依赖
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   * 生成短ID
   */
  public static generateShort(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * 生成数字ID
   */
  public static generateNumeric(): string {
    return (
      Date.now().toString() +
      Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")
    );
  }

  /**
   * 生成带前缀的ID
   */
  public static generateWithPrefix(prefix: string): string {
    return `${prefix}_${this.generate()}`;
  }
}
