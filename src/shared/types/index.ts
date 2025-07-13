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

// 导出事件存储相关类型
export * from "./EventStore";
export * from "./Saga";

// 导出工厂模式相关类型
export * from "../../domain/factories/DomainFactory";
export * from "../../domain/factories/FactoryRegistry";

// 导出错误处理相关类型
export * from "../errors/DomainError";
export * from "../errors/ApplicationError";
export * from "../errors/ErrorHandler";
export * from "../errors/ErrorRecovery";

// 导出聚合边界设计相关类型
export * from "../../domain/aggregate-design/AggregateBoundaryGuidelines";

// 导出支付相关类型
export {
  PaymentMethod,
  PaymentType,
} from "../../domain/value-objects/PaymentMethod";
export { Payment, PaymentStatus } from "../../domain/entities/Payment";
export * from "../../domain/events/PaymentEvents";

// 导出防腐层相关类型
export * from "../../infrastructure/anti-corruption/AntiCorruptionLayer";
export * from "../../infrastructure/anti-corruption/PaymentGatewayAdapter";
export * from "../../infrastructure/external-systems/ExternalSystemMocks";
