import { Entity } from "./Entity";
import { Money } from "../value-objects";
import { EntityId } from "../../shared/types";

export interface OrderItemProps {
  productId: EntityId;
  productName: string;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
}

export class OrderItem extends Entity {
  private _productId: EntityId;
  private _productName: string;
  private _quantity: number;
  private _unitPrice: Money;
  private _totalPrice: Money;

  constructor(props: OrderItemProps, id?: EntityId) {
    super(id);
    this.validateProps(props);
    this._productId = props.productId;
    this._productName = props.productName;
    this._quantity = props.quantity;
    this._unitPrice = props.unitPrice;
    this._totalPrice = props.totalPrice;
  }

  // Getters
  public get productId(): EntityId {
    return this._productId;
  }

  public get productName(): string {
    return this._productName;
  }

  public get quantity(): number {
    return this._quantity;
  }

  public get unitPrice(): Money {
    return this._unitPrice;
  }

  public get totalPrice(): Money {
    return this._totalPrice;
  }

  // 业务方法
  public changeQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error("订单项数量必须大于0");
    }

    if (newQuantity > 9999) {
      throw new Error("订单项数量不能超过9999");
    }

    this._quantity = newQuantity;
    this._totalPrice = this._unitPrice.multiply(newQuantity);
  }

  public changeUnitPrice(newUnitPrice: Money): void {
    if (newUnitPrice.isZero()) {
      throw new Error("订单项单价不能为零");
    }

    this._unitPrice = newUnitPrice;
    this._totalPrice = newUnitPrice.multiply(this._quantity);
  }

  private validateProps(props: OrderItemProps): void {
    if (!props.productId) {
      throw new Error("商品ID不能为空");
    }

    if (!props.productName || props.productName.trim().length === 0) {
      throw new Error("商品名称不能为空");
    }

    if (props.quantity <= 0) {
      throw new Error("订单项数量必须大于0");
    }

    if (props.quantity > 9999) {
      throw new Error("订单项数量不能超过9999");
    }

    if (props.unitPrice.isZero()) {
      throw new Error("订单项单价不能为零");
    }

    if (props.totalPrice.isZero()) {
      throw new Error("订单项总价不能为零");
    }

    // 验证总价是否等于单价乘以数量
    const calculatedTotal = props.unitPrice.multiply(props.quantity);
    if (!props.totalPrice.equals(calculatedTotal)) {
      throw new Error("订单项总价必须等于单价乘以数量");
    }
  }

  // 静态工厂方法
  public static create(
    productId: EntityId,
    productName: string,
    quantity: number,
    unitPrice: Money
  ): OrderItem {
    const totalPrice = unitPrice.multiply(quantity);

    return new OrderItem({
      productId,
      productName,
      quantity,
      unitPrice,
      totalPrice,
    });
  }

  public static fromSnapshot(props: OrderItemProps, id: EntityId): OrderItem {
    return new OrderItem(props, id);
  }
}
