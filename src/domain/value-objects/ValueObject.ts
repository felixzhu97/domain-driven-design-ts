import { ValueObject as IValueObject } from "../../shared/types";

export abstract class ValueObject<T> implements IValueObject<T> {
  public equals(other: T): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (this.constructor !== other.constructor) {
      return false;
    }

    return this.isEqual(other);
  }

  protected abstract isEqual(other: T): boolean;

  protected static isValidString(value: string): boolean {
    return typeof value === "string" && value.trim().length > 0;
  }

  protected static isValidNumber(value: number): boolean {
    return typeof value === "number" && !isNaN(value) && isFinite(value);
  }
}
