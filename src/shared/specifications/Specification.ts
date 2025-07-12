/**
 * 规约模式基础接口
 * 用于封装业务规则，提供可组合的业务逻辑判断
 */
export interface ISpecification<T> {
  /**
   * 判断对象是否满足规约
   */
  isSatisfiedBy(candidate: T): boolean;

  /**
   * 获取规约描述（用于错误提示）
   */
  getDescription(): string;
}

/**
 * 抽象规约基类
 */
export abstract class Specification<T> implements ISpecification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  abstract getDescription(): string;

  /**
   * 与运算：this AND other
   */
  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification<T>(this, other);
  }

  /**
   * 或运算：this OR other
   */
  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification<T>(this, other);
  }

  /**
   * 非运算：NOT this
   */
  not(): ISpecification<T> {
    return new NotSpecification<T>(this);
  }
}

/**
 * 与规约：两个规约都必须满足
 */
class AndSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return (
      this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate)
    );
  }

  getDescription(): string {
    return `(${this.left.getDescription()}) AND (${this.right.getDescription()})`;
  }
}

/**
 * 或规约：任一规约满足即可
 */
class OrSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return (
      this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate)
    );
  }

  getDescription(): string {
    return `(${this.left.getDescription()}) OR (${this.right.getDescription()})`;
  }
}

/**
 * 非规约：规约不满足
 */
class NotSpecification<T> extends Specification<T> {
  constructor(private readonly spec: ISpecification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate);
  }

  getDescription(): string {
    return `NOT (${this.spec.getDescription()})`;
  }
}

/**
 * 复合规约：用于组合多个规约
 */
export class CompositeSpecification<T> extends Specification<T> {
  constructor(
    private readonly specifications: ISpecification<T>[],
    private readonly operator: "AND" | "OR" = "AND"
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    if (this.specifications.length === 0) {
      return true;
    }

    if (this.operator === "AND") {
      return this.specifications.every((spec) => spec.isSatisfiedBy(candidate));
    } else {
      return this.specifications.some((spec) => spec.isSatisfiedBy(candidate));
    }
  }

  getDescription(): string {
    const descriptions = this.specifications.map((spec) =>
      spec.getDescription()
    );
    return descriptions.join(` ${this.operator} `);
  }
}

/**
 * 规约验证结果
 */
export interface SpecificationResult {
  isValid: boolean;
  failedRules: string[];
}

/**
 * 规约验证器
 */
export class SpecificationValidator<T> {
  private specifications: ISpecification<T>[] = [];

  /**
   * 添加规约
   */
  addSpecification(spec: ISpecification<T>): this {
    this.specifications.push(spec);
    return this;
  }

  /**
   * 验证对象是否满足所有规约
   */
  validate(candidate: T): SpecificationResult {
    const failedRules: string[] = [];

    for (const spec of this.specifications) {
      if (!spec.isSatisfiedBy(candidate)) {
        failedRules.push(spec.getDescription());
      }
    }

    return {
      isValid: failedRules.length === 0,
      failedRules,
    };
  }

  /**
   * 验证并抛出异常
   */
  validateAndThrow(candidate: T): void {
    const result = this.validate(candidate);
    if (!result.isValid) {
      throw new Error(`业务规则验证失败: ${result.failedRules.join(", ")}`);
    }
  }
}
