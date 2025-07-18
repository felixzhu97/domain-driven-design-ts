import { ValueObject } from "./ValueObject";

export class Email extends ValueObject<Email> {
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  constructor(private readonly _value: string) {
    super();
    this.validate(_value);
  }

  private get normalizedValue(): string {
    return this._value.toLowerCase();
  }

  public get value(): string {
    return this.normalizedValue;
  }

  private validate(email: string): void {
    if (!ValueObject.isValidString(email)) {
      throw new Error("邮箱地址不能为空");
    }

    if (!Email.EMAIL_REGEX.test(email)) {
      throw new Error("邮箱地址格式不正确");
    }

    // 检查连续的点
    if (email.includes("..")) {
      throw new Error("邮箱地址格式不正确");
    }

    if (email.length > 254) {
      throw new Error("邮箱地址长度不能超过254个字符");
    }
  }

  protected isEqual(other: Email): boolean {
    return this.normalizedValue === other.normalizedValue;
  }

  public toString(): string {
    return this.normalizedValue;
  }

  public static create(value: string): Email {
    return new Email(value);
  }
}
