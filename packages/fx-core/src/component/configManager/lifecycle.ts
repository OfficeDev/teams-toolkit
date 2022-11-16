import { ok, err, FxError, Result, LogProvider } from "@microsoft/teamsfx-api";
import _ from "lodash";
import { Container } from "typedi";
import { mapToJson } from "../../common/tools";
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

const component = "ConfigManager";

function resolveDriverDef(def: DriverDefinition, unresolved: UnresolvedPlaceholders): void {
  const args = def.with as Record<string, unknown>;
  for (const k in args) {
    const val = args[k];
    args[k] = resolve(val, unresolved);
  }
  if (def.env) {
    for (const k in def.env) {
      const val = def.env[k];
      def.env[k] = resolveString(val, unresolved);
    }
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
    ctx.logProvider.info(`[${component}]Executing lifecycle ${this.name}`);
    const result = await this.executeImpl(ctx);
    if (result.isOk()) {
      ctx.logProvider.info(
        `[${component}]Finished Executing lifecycle ${this.name}. Result: ${JSON.stringify(
          mapToJson(result.value)
        )}`
      );
    } else {
      ctx.logProvider.info(
        `[${component}]Finished Executing lifecycle ${this.name}. Result: ${JSON.stringify(result)}`
      );
    }
    return result;
  }

  async executeImpl(ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> {
    const maybeDrivers = this.getDrivers(ctx.logProvider);
    if (maybeDrivers.isErr()) {
      return err({ kind: "Failure", error: maybeDrivers.error });
    }
    const drivers = maybeDrivers.value;
    const envOutput = new Map<string, string>();
    for (const driver of drivers) {
      ctx.logProvider.info(
        `[${component}]Executing action ${this.stringifyDriverDef(driver)} in lifecycle ${
          this.name
        }`
      );
      const unresolved: UnresolvedPlaceholders = [];
      resolveDriverDef(driver, unresolved);
      if (unresolved.length > 0) {
        ctx.logProvider.info(
          `[${component}]Unresolved placeholders(${unresolved}) found for Action ${this.stringifyDriverDef(
            driver
          )} in lifecycle ${this.name}`
        );
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

      if (driver.env) {
        for (const [envVar, value] of Object.entries(driver.env)) {
          process.env[envVar] = value;
        }
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
      const output: Record<string, string> = {};
      for (const [envVar, value] of result.value) {
        envOutput.set(envVar, value);
        process.env[envVar] = value;
        output[envVar] = value;
      }
      ctx.logProvider.info(
        `[${component}]Action ${this.stringifyDriverDef(driver)} in lifecycle ${
          this.name
        } succeeded with output ${JSON.stringify(output)}`
      );
    }

    return ok(envOutput);
  }

  async run(ctx: DriverContext): Promise<Result<Output, FxError>> {
    const maybeDrivers = this.getDrivers(ctx.logProvider);
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

  private stringifyDriverDef(def: DriverDefinition): string {
    if (def.name) {
      return JSON.stringify({ name: def.name, uses: def.uses });
    }
    return def.uses;
  }

  private getDrivers(log: LogProvider): Result<DriverInstance[], FxError> {
    log.debug(`[${component}]Trying to resolve actions for lifecycle ${this.name}`);
    const drivers: DriverInstance[] = [];
    for (const def of this.driverDefs) {
      if (!Container.has(def.uses)) {
        log.error(
          `[${component}]Action ${this.stringifyDriverDef(def)} in lifecycle ${
            this.name
          } is not found`
        );
        return err(new DriverNotFoundError(def.name ?? "", def.uses));
      }
      const driver = Container.get<StepDriver>(def.uses);
      drivers.push({ instance: driver, ...def });
      log.debug(
        `[${component}]Action ${this.stringifyDriverDef(def)} found for lifecycle ${this.name}`
      );
    }
    return ok(drivers);
  }
}
