export type EntityId = string;

export interface DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly eventVersion: number;
  readonly eventType: string;
}

export interface ValueObject<T> {
  equals(other: T): boolean;
}

export interface Entity {
  readonly id: EntityId;
  equals(other: Entity): boolean;
}

export interface AggregateRoot extends Entity {
  getUncommittedEvents(): DomainEvent[];
  markEventsAsCommitted(): void;
  loadFromHistory(events: DomainEvent[]): void;
}
