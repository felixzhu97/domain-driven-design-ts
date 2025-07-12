import { ValueObject } from "./ValueObject";

export type Currency = "CNY" | "USD" | "EUR" | "JPY";

export class Money extends ValueObject<Money> {
  private static readonly SCALE = 100; // 用分为单位存储，避免浮点数精度问题

  constructor(
    private readonly _amount: number, // 以分为单位
    private readonly _currency: Currency = "CNY"
  ) {
    super();
    this.validate(_amount, _currency);
  }

  public get amount(): number {
    return this._amount;
  }

  public get currency(): Currency {
    return this._currency;
  }

  public get amountInYuan(): number {
    return this._amount / Money.SCALE;
  }

  private validate(amount: number, currency: Currency): void {
    if (!ValueObject.isValidNumber(amount)) {
      throw new Error("金额必须是有效数字");
    }

    if (amount < 0) {
      throw new Error("金额不能为负数");
    }

    if (!Number.isInteger(amount)) {
      throw new Error("金额必须是整数（以分为单位）");
    }

    if (!currency) {
      throw new Error("货币类型不能为空");
    }
  }

  public add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  public subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    const newAmount = this._amount - other._amount;
    if (newAmount < 0) {
      throw new Error("减法运算结果不能为负数");
    }
    return new Money(newAmount, this._currency);
  }

  public multiply(factor: number): Money {
    if (!ValueObject.isValidNumber(factor) || factor < 0) {
      throw new Error("乘数必须是非负数");
    }
    return new Money(Math.round(this._amount * factor), this._currency);
  }

  public isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount > other._amount;
  }

  public isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount < other._amount;
  }

  public isGreaterThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount >= other._amount;
  }

  public isLessThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount <= other._amount;
  }

  public isZero(): boolean {
    return this._amount === 0;
  }

  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(
        `货币类型不匹配: ${this._currency} vs ${other._currency}`
      );
    }
  }

  protected isEqual(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  public toString(): string {
    const symbol = this.getCurrencySymbol();
    return `${symbol}${this.amountInYuan.toFixed(2)}`;
  }

  private getCurrencySymbol(): string {
    const symbols: Record<Currency, string> = {
      CNY: "¥",
      USD: "$",
      EUR: "€",
      JPY: "¥",
    };
    return symbols[this._currency];
  }

  public static fromYuan(amount: number, currency: Currency = "CNY"): Money {
    return new Money(Math.round(amount * Money.SCALE), currency);
  }

  public static fromCents(amount: number, currency: Currency = "CNY"): Money {
    return new Money(amount, currency);
  }

  public static zero(currency: Currency = "CNY"): Money {
    return new Money(0, currency);
  }
}
