import { v4 as uuidv4 } from "uuid";
import { DomainEvent, EntityId } from "../../shared/types";
import { Money } from "../value-objects";

export class OrderCreatedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "OrderCreated";

  constructor(
    public readonly orderId: EntityId,
    public readonly customerId: EntityId,
    public readonly totalAmount: Money
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}

export class OrderItemAddedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "OrderItemAdded";

  constructor(
    public readonly orderId: EntityId,
    public readonly productId: EntityId,
    public readonly quantity: number,
    public readonly unitPrice: Money
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}

export class OrderConfirmedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "OrderConfirmed";

  constructor(
    public readonly orderId: EntityId,
    public readonly confirmedAt: Date
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}

export class OrderShippedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "OrderShipped";

  constructor(
    public readonly orderId: EntityId,
    public readonly trackingNumber: string,
    public readonly shippedAt: Date
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}

export class OrderDeliveredEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "OrderDelivered";

  constructor(
    public readonly orderId: EntityId,
    public readonly deliveredAt: Date
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}

export class OrderCancelledEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "OrderCancelled";

  constructor(
    public readonly orderId: EntityId,
    public readonly reason: string,
    public readonly cancelledAt: Date
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}
