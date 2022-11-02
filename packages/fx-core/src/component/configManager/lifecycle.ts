import { ok, err, FxError, Result } from "@microsoft/teamsfx-api";
import _ from "lodash";
import { Container } from "typedi";
import { DriverContext } from "../driver/interface/commonArgs";
import { StepDriver } from "../driver/interface/stepDriver";
import { DriverNotFoundError } from "./error";
import {
  DriverDefinition,
  LifecycleName,
  ILifecycle,
  Output,
  DriverInstance,
  UnresolvedPlaceholders,
  ExecutionError,
  ExecutionOutput,
} from "./interface";

function resolveDriverDef(def: DriverDefinition, unresolved: UnresolvedPlaceholders): void {
  const args = def.with as Record<string, unknown>;
  for (const k in args) {
    const val = args[k];
    args[k] = resolve(val, unresolved);
  }
}

// Replace placeholders in the driver definitions' `with` field inplace
// and returns unresolved placeholders
function resolvePlaceHolders(defs: DriverDefinition[]): UnresolvedPlaceholders {
  const unresolvedVars: string[] = [];
  for (const def of defs) {
    resolveDriverDef(def, unresolvedVars);
  }
  return unresolvedVars;
}

function resolve(input: unknown, unresolvedPlaceHolders: UnresolvedPlaceholders): unknown {
  if (input === undefined || input === null) {
    return input;
  } else if (typeof input === "string") {
    return resolveString(input, unresolvedPlaceHolders);
  } else if (Array.isArray(input)) {
    const newArray: unknown[] = [];
    for (const e of input) {
      newArray.push(resolve(e, unresolvedPlaceHolders));
    }
    return newArray;
  } else if (input !== null && typeof input === "object") {
    const newObj = _.cloneDeep(input) as Record<string, unknown>;
    Object.keys(newObj).forEach((key) => {
      newObj[key] = resolve(newObj[key], unresolvedPlaceHolders);
    });
    return newObj;
  } else {
    return input;
  }
}

function resolveString(val: string, unresolvedPlaceHolders: UnresolvedPlaceholders): string {
  const placeHolderReg = /\${{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
  let matches = placeHolderReg.exec(val);
  let newVal = val;
  while (matches != null) {
    const envVar = matches[1];
    const envVal = process.env[envVar];
    if (!envVal) {
      unresolvedPlaceHolders.push(envVar);
    } else {
      newVal = newVal.replace(matches[0], envVal);
    }
    matches = placeHolderReg.exec(val);
  }
  return newVal;
}

export class Lifecycle implements ILifecycle {
  name: LifecycleName;
  driverDefs: DriverDefinition[];
  constructor(name: LifecycleName, driverDefs: DriverDefinition[]) {
    this.driverDefs = driverDefs;
    this.name = name;
  }

  resolvePlaceholders(): UnresolvedPlaceholders {
    return resolvePlaceHolders(this.driverDefs);
  }

  async execute(ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> {
    const maybeDrivers = this.getDrivers();
    if (maybeDrivers.isErr()) {
      return err({ kind: "Failure", error: maybeDrivers.error });
    }
    const drivers = maybeDrivers.value;
    const envOutput = new Map<string, string>();
    for (const driver of drivers) {
      const unresolved: UnresolvedPlaceholders = [];
      resolveDriverDef(driver, unresolved);
      if (unresolved.length > 0) {
        return err({
          kind: "PartialSuccess",
          env: envOutput,
          reason: {
            kind: "UnresolvedPlaceholders",
            failedDriver: driver,
            unresolvedPlaceHolders: unresolved,
          },
        });
      }

      const result = await driver.instance.run(driver.with, ctx);
      if (result.isErr()) {
        return err({
          kind: "PartialSuccess",
          env: envOutput,
          reason: {
            kind: "DriverError",
            failedDriver: driver,
            error: result.error,
          },
        });
      }
      for (const [envVar, value] of result.value) {
        envOutput.set(envVar, value);
        process.env[envVar] = value;
      }
    }

    return ok(envOutput);
  }

  async run(ctx: DriverContext): Promise<Result<Output, FxError>> {
    const maybeDrivers = this.getDrivers();
    if (maybeDrivers.isErr()) {
      return err(maybeDrivers.error);
    }
    const drivers = maybeDrivers.value;

    return Lifecycle.runDrivers(drivers, ctx);
  }

  private static async runDrivers(
    drivers: DriverInstance[],
    ctx: DriverContext
  ): Promise<Result<Output, FxError>> {
    const envOutput = new Map<string, string>();
    const unresolvedPlaceHolders: string[] = resolvePlaceHolders(drivers);
    if (unresolvedPlaceHolders.length > 0) {
      return ok({ env: envOutput, unresolvedPlaceHolders });
    }

    for (const driver of drivers) {
      const result = await driver.instance.run(driver.with, ctx);
      if (result.isErr()) {
        return err(result.error);
      }
      for (const [envVar, value] of result.value) {
        envOutput.set(envVar, value);
        process.env[envVar] = value;
      }
    }

    return ok({ env: envOutput, unresolvedPlaceHolders });
  }

  private getDrivers(): Result<DriverInstance[], FxError> {
    const drivers: DriverInstance[] = [];
    for (const def of this.driverDefs) {
      if (!Container.has(def.uses)) {
        return err(new DriverNotFoundError(def.name ?? "", def.uses));
      }
      const driver = Container.get<StepDriver>(def.uses);
      drivers.push({ instance: driver, ...def });
    }
    return ok(drivers);
  }
}
