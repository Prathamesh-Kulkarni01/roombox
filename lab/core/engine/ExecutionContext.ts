import { PlatformProvider } from "./PlatformProvider";
import { VirtualTimeEngine } from "../time/VirtualTimeEngine";
import { EventStream } from "../../validation/EventStream";
import { InvariantEngine } from "../../validation/invariants/InvariantEngine";
import { WorldBuilderContext } from "../../world/WorldBuilder";

export interface ExecutionContext {
  world: WorldBuilderContext;
  provider: PlatformProvider;
  virtualTime: VirtualTimeEngine;
  eventStream: EventStream;
  invariants: InvariantEngine;
  logger: any;
  random: any;
  scenarioId: string;
  executionMode: string;
}
