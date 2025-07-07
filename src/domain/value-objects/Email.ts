import { ValueObject } from "./ValueObject";

export class Email extends ValueObject<Email> {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(private readonly _value: string) {
    super();
    this.validate(_value);
  }

  public get value(): string {
    return this._value;
  }

  private validate(email: string): void {
    if (!ValueObject.isValidString(email)) {
      throw new Error("邮箱地址不能为空");
    }

    if (!Email.EMAIL_REGEX.test(email)) {
      throw new Error("邮箱地址格式不正确");
    }

    if (email.length > 254) {
      throw new Error("邮箱地址长度不能超过254个字符");
    }
  }

  protected isEqual(other: Email): boolean {
    return this._value.toLowerCase() === other._value.toLowerCase();
  }

  public toString(): string {
    return this._value;
  }

  public static create(value: string): Email {
    return new Email(value);
  }
}
