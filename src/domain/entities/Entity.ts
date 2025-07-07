import { v4 as uuidv4 } from "uuid";
import { Entity as IEntity, EntityId } from "../../shared/types";

export abstract class Entity implements IEntity {
  protected _id: EntityId;

  constructor(id?: EntityId) {
    this._id = id ?? uuidv4();
  }

  public get id(): EntityId {
    return this._id;
  }

  public equals(other: Entity): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (this === other) {
      return true;
    }

    if (this.constructor !== other.constructor) {
      return false;
    }

    return this.id === other.id;
  }
}
