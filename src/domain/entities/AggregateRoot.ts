import { Entity } from "./Entity";
import {
  AggregateRoot as IAggregateRoot,
  DomainEvent,
  EntityId,
} from "../../shared/types";

export abstract class AggregateRoot extends Entity implements IAggregateRoot {
  private _uncommittedEvents: DomainEvent[] = [];
  private _version: number = 0;

  constructor(id?: EntityId) {
    super(id);
  }

  public get version(): number {
    return this._version;
  }

  public getUncommittedEvents(): DomainEvent[] {
    return [...this._uncommittedEvents];
  }

  public markEventsAsCommitted(): void {
    this._uncommittedEvents = [];
  }

  public loadFromHistory(events: DomainEvent[]): void {
    events.forEach((event) => {
      this.applyEvent(event, false);
      this._version++;
    });
  }

  protected addEvent(event: DomainEvent): void {
    this._uncommittedEvents.push(event);
    this.applyEvent(event, true);
  }

  protected abstract applyEvent(event: DomainEvent, isNew: boolean): void;
}
