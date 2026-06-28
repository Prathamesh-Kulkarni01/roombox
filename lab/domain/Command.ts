import { ExecutionContext } from "../core/engine/ExecutionContext";

export interface Command {
  readonly name: string;
  execute(ctx: ExecutionContext): Promise<void>;
}
