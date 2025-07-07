import { ValueObject } from "./ValueObject";

export class ProductCategory extends ValueObject<ProductCategory> {
  private static readonly MAX_NAME_LENGTH = 50;
  private static readonly MAX_DESCRIPTION_LENGTH = 500;

  constructor(
    private readonly _name: string,
    private readonly _description?: string,
    private readonly _parentId?: string
  ) {
    super();
    this.validate(_name, _description);
  }

  public get name(): string {
    return this._name;
  }

  public get description(): string | undefined {
    return this._description;
  }

  public get parentId(): string | undefined {
    return this._parentId;
  }

  public get isRootCategory(): boolean {
    return this._parentId === undefined;
  }

  private validate(name: string, description?: string): void {
    if (!ValueObject.isValidString(name)) {
      throw new Error("分类名称不能为空");
    }

    if (name.length > ProductCategory.MAX_NAME_LENGTH) {
      throw new Error(
        `分类名称长度不能超过${ProductCategory.MAX_NAME_LENGTH}个字符`
      );
    }

    if (
      description &&
      description.length > ProductCategory.MAX_DESCRIPTION_LENGTH
    ) {
      throw new Error(
        `分类描述长度不能超过${ProductCategory.MAX_DESCRIPTION_LENGTH}个字符`
      );
    }

    // 验证分类名称不包含特殊字符
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/.test(name)) {
      throw new Error("分类名称只能包含字母、数字、中文、空格、横线和下划线");
    }
  }

  public withParent(parentId: string): ProductCategory {
    if (!ValueObject.isValidString(parentId)) {
      throw new Error("父分类ID不能为空");
    }
    return new ProductCategory(this._name, this._description, parentId);
  }

  public withoutParent(): ProductCategory {
    return new ProductCategory(this._name, this._description);
  }

  protected isEqual(other: ProductCategory): boolean {
    return (
      this._name === other._name &&
      this._description === other._description &&
      this._parentId === other._parentId
    );
  }

  public toString(): string {
    return this._name;
  }

  public static create(
    name: string,
    description?: string,
    parentId?: string
  ): ProductCategory {
    return new ProductCategory(name, description, parentId);
  }

  // 预定义的分类
  public static readonly ELECTRONICS = ProductCategory.create(
    "电子产品",
    "各类电子设备和配件"
  );
  public static readonly CLOTHING = ProductCategory.create(
    "服装",
    "男女服装和配饰"
  );
  public static readonly BOOKS = ProductCategory.create(
    "图书",
    "各类图书和教材"
  );
  public static readonly HOME = ProductCategory.create(
    "家居用品",
    "家庭日用品和装饰"
  );
  public static readonly SPORTS = ProductCategory.create(
    "运动户外",
    "运动器材和户外用品"
  );
}
