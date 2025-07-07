import { v4 as uuidv4 } from "uuid";
import { DomainEvent, EntityId } from "../../shared/types";

export class UserCreatedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "UserCreated";

  constructor(
    public readonly userId: EntityId,
    public readonly email: string,
    public readonly name: string
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}

export class UserEmailChangedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "UserEmailChanged";

  constructor(
    public readonly userId: EntityId,
    public readonly oldEmail: string,
    public readonly newEmail: string
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}

export class UserDeactivatedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;
  public readonly eventType: string = "UserDeactivated";

  constructor(
    public readonly userId: EntityId,
    public readonly reason?: string
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}
