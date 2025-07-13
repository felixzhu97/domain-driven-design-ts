/**
 * 支付方式值对象
 */

export enum PaymentType {
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  DIGITAL_WALLET = "DIGITAL_WALLET",
  CASH_ON_DELIVERY = "CASH_ON_DELIVERY",
  CRYPTOCURRENCY = "CRYPTOCURRENCY",
}

export interface PaymentMethodProps {
  readonly type: PaymentType;
  readonly provider: string; // 支付提供商（如：支付宝、微信、Visa等）
  readonly accountInfo: string; // 账户信息（如：卡号末四位、钱包账号等）
  readonly isDefault: boolean; // 是否为默认支付方式
  readonly expiryDate?: Date; // 过期时间（适用于卡类支付）
  readonly metadata?: Record<string, unknown>; // 额外元数据
}

export class PaymentMethod {
  private readonly _type: PaymentType;
  private readonly _provider: string;
  private readonly _accountInfo: string;
  private readonly _isDefault: boolean;
  private readonly _expiryDate?: Date;
  private readonly _metadata: Record<string, unknown>;

  private constructor(props: PaymentMethodProps) {
    this._type = props.type;
    this._provider = props.provider;
    this._accountInfo = props.accountInfo;
    this._isDefault = props.isDefault;
    if (props.expiryDate !== undefined) {
      this._expiryDate = props.expiryDate;
    }
    this._metadata = props.metadata || {};
  }

  public static create(props: PaymentMethodProps): PaymentMethod {
    this.validate(props);
    return new PaymentMethod(props);
  }

  private static validate(props: PaymentMethodProps): void {
    const errors: string[] = [];

    if (!props.provider || props.provider.trim().length === 0) {
      errors.push("支付提供商不能为空");
    }

    if (!props.accountInfo || props.accountInfo.trim().length === 0) {
      errors.push("账户信息不能为空");
    }

    // 卡类支付需要验证过期时间
    if (
      (props.type === PaymentType.CREDIT_CARD ||
        props.type === PaymentType.DEBIT_CARD) &&
      (!props.expiryDate || props.expiryDate <= new Date())
    ) {
      errors.push("卡类支付方式需要有效的过期时间");
    }

    if (errors.length > 0) {
      throw new Error(`支付方式验证失败: ${errors.join(", ")}`);
    }
  }

  public get type(): PaymentType {
    return this._type;
  }

  public get provider(): string {
    return this._provider;
  }

  public get accountInfo(): string {
    return this._accountInfo;
  }

  public get isDefault(): boolean {
    return this._isDefault;
  }

  public get expiryDate(): Date | undefined {
    return this._expiryDate;
  }

  public get metadata(): Record<string, unknown> {
    return { ...this._metadata };
  }

  public get displayName(): string {
    return `${this._provider} - ${this.maskedAccountInfo}`;
  }

  public get maskedAccountInfo(): string {
    if (this._accountInfo.length <= 4) {
      return this._accountInfo;
    }

    const visible = this._accountInfo.slice(-4);
    const masked = "*".repeat(Math.max(0, this._accountInfo.length - 4));
    return masked + visible;
  }

  public get isExpired(): boolean {
    return this._expiryDate ? this._expiryDate <= new Date() : false;
  }

  public get isValid(): boolean {
    return !this.isExpired;
  }

  public withDefault(isDefault: boolean): PaymentMethod {
    const props: PaymentMethodProps =
      this._expiryDate !== undefined
        ? {
            type: this._type,
            provider: this._provider,
            accountInfo: this._accountInfo,
            isDefault,
            expiryDate: this._expiryDate,
            metadata: this._metadata,
          }
        : {
            type: this._type,
            provider: this._provider,
            accountInfo: this._accountInfo,
            isDefault,
            metadata: this._metadata,
          };

    return new PaymentMethod(props);
  }

  public equals(other: PaymentMethod): boolean {
    return (
      this._type === other._type &&
      this._provider === other._provider &&
      this._accountInfo === other._accountInfo
    );
  }

  public toString(): string {
    return `PaymentMethod(${this._type}:${this._provider}:${this.maskedAccountInfo})`;
  }

  public toJSON(): PaymentMethodProps {
    const result: PaymentMethodProps =
      this._expiryDate !== undefined
        ? {
            type: this._type,
            provider: this._provider,
            accountInfo: this._accountInfo,
            isDefault: this._isDefault,
            expiryDate: this._expiryDate,
            metadata: this._metadata,
          }
        : {
            type: this._type,
            provider: this._provider,
            accountInfo: this._accountInfo,
            isDefault: this._isDefault,
            metadata: this._metadata,
          };

    return result;
  }
}
