import { ValueObject } from "./ValueObject";

export interface AddressProps {
  country: string;
  province: string;
  city: string;
  district: string;
  street: string;
  postalCode: string;
  detail?: string;
}

export class Address extends ValueObject<Address> {
  constructor(private readonly props: AddressProps) {
    super();
    this.validate(props);
  }

  public get country(): string {
    return this.props.country;
  }

  public get province(): string {
    return this.props.province;
  }

  public get city(): string {
    return this.props.city;
  }

  public get district(): string {
    return this.props.district;
  }

  public get street(): string {
    return this.props.street;
  }

  public get postalCode(): string {
    return this.props.postalCode;
  }

  public get detail(): string | undefined {
    return this.props.detail;
  }

  private validate(props: AddressProps): void {
    if (!ValueObject.isValidString(props.country)) {
      throw new Error("国家不能为空");
    }

    if (!ValueObject.isValidString(props.province)) {
      throw new Error("省份不能为空");
    }

    if (!ValueObject.isValidString(props.city)) {
      throw new Error("城市不能为空");
    }

    if (!ValueObject.isValidString(props.district)) {
      throw new Error("区/县不能为空");
    }

    if (!ValueObject.isValidString(props.street)) {
      throw new Error("街道不能为空");
    }

    if (!ValueObject.isValidString(props.postalCode)) {
      throw new Error("邮政编码不能为空");
    }

    // 中国邮政编码验证
    if (props.country === "中国" && !/^\d{6}$/.test(props.postalCode)) {
      throw new Error("中国邮政编码必须是6位数字");
    }
  }

  protected isEqual(other: Address): boolean {
    return (
      this.props.country === other.props.country &&
      this.props.province === other.props.province &&
      this.props.city === other.props.city &&
      this.props.district === other.props.district &&
      this.props.street === other.props.street &&
      this.props.postalCode === other.props.postalCode &&
      this.props.detail === other.props.detail
    );
  }

  public toString(): string {
    const parts = [
      this.props.country,
      this.props.province,
      this.props.city,
      this.props.district,
      this.props.street,
    ];

    if (this.props.detail) {
      parts.push(this.props.detail);
    }

    return parts.join(" ");
  }

  public getFullAddress(): string {
    return this.toString();
  }

  public static create(props: AddressProps): Address {
    return new Address(props);
  }
}
