import { v4 as uuidv4 } from "uuid";
import { DomainEvent, EntityId } from "../../shared/types";
import { Money } from "../value-objects";

export class ProductCreatedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "ProductCreated";

  constructor(
    public readonly productId: EntityId,
    public readonly name: string,
    public readonly price: Money,
    public readonly categoryId: string
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}

export class ProductPriceChangedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "ProductPriceChanged";

  constructor(
    public readonly productId: EntityId,
    public readonly oldPrice: Money,
    public readonly newPrice: Money
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}

export class ProductStockUpdatedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "ProductStockUpdated";

  constructor(
    public readonly productId: EntityId,
    public readonly oldStock: number,
    public readonly newStock: number,
    public readonly reason: string
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}

export class ProductDeactivatedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "ProductDeactivated";

  constructor(
    public readonly productId: EntityId,
    public readonly reason?: string
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}
