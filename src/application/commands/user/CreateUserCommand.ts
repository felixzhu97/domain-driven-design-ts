import { Command } from "../base/Command";
import { Address } from "../../../domain/value-objects";

/**
 * 创建用户命令
 */
export class CreateUserCommand extends Command {
  public readonly email: string;
  public readonly name: string;
  public readonly password: string;
  public readonly initialAddress?: Address;

  constructor(data: {
    email: string;
    name: string;
    password: string;
    initialAddress?: Address;
  }) {
    super();
    this.email = data.email;
    this.name = data.name;
    this.password = data.password;
    if (data.initialAddress) {
      this.initialAddress = data.initialAddress;
    }
  }
}
