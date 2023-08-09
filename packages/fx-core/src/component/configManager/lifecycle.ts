// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yefuwang@microsoft.com
 */

import { ok, err, FxError, Result, LogProvider } from "@microsoft/teamsfx-api";
import _ from "lodash";
import { Container } from "typedi";
import { InvalidYmlActionNameError } from "../../error/yml";
import { DriverContext } from "../driver/interface/commonArgs";
import { StepDriver } from "../driver/interface/stepDriver";
import { TeamsFxTelemetryReporter } from "../utils/teamsFxTelemetryReporter";
import { component, lifecycleExecutionEvent, SummaryConstant, TelemetryProperty } from "./constant";
import {
  DriverDefinition,
  LifecycleName,
  ILifecycle,
  Output,
  DriverInstance,
  UnresolvedPlaceholders,
  ResolvedPlaceholders,
  ExecutionResult,
} from "./interface";
import { MissingEnvironmentVariablesError } from "../../error";

function resolveDriverDef(
  def: DriverDefinition,
  resolved: ResolvedPlaceholders,
  unresolved: UnresolvedPlaceholders
): void {
  const args = def.with as Record<string, unknown>;
  for (const k in args) {
    const val = args[k];
    args[k] = resolve(val, resolved, unresolved);
  }
  if (def.env) {
    for (const k in def.env) {
      const val = def.env[k];
      def.env[k] = resolveString(val, resolved, unresolved);
    }
  }
}

// Replace placeholders in the driver definitions' `with` field inplace
// and returns resolved and unresolved placeholders
function resolvePlaceHolders(
  defs: DriverDefinition[]
): [ResolvedPlaceholders, UnresolvedPlaceholders] {
  const resolvedVars: string[] = [];
  const unresolvedVars: string[] = [];
  for (const def of defs) {
    resolveDriverDef(def, resolvedVars, unresolvedVars);
  }
  return [resolvedVars, unresolvedVars];
}

function resolve(
  input: unknown,
  resolved: ResolvedPlaceholders,
  unresolved: UnresolvedPlaceholders
): unknown {
  if (input === undefined || input === null) {
    return input;
  } else if (typeof input === "string") {
    return resolveString(input, resolved, unresolved);
  } else if (Array.isArray(input)) {
    const newArray: unknown[] = [];
    for (const e of input) {
      newArray.push(resolve(e, resolved, unresolved));
    }
    return newArray;
  } else if (input !== null && typeof input === "object") {
    const newObj = _.cloneDeep(input) as Record<string, unknown>;
    Object.keys(newObj).forEach((key) => {
      newObj[key] = resolve(newObj[key], resolved, unresolved);
    });
    return newObj;
  } else {
    return input;
  }
}

function resolveString(
  val: string,
  resolved: ResolvedPlaceholders,
  unresolved: UnresolvedPlaceholders
): string {
  const placeHolderReg = /\${{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
  let matches = placeHolderReg.exec(val);
  let newVal = val;
  while (matches != null) {
    const envVar = matches[1];
    const envVal = process.env[envVar];
    if (!envVal) {
      unresolved.push(envVar);
    } else {
      resolved.push(envVar);
      newVal = newVal.replace(matches[0], envVal);
    }
    matches = placeHolderReg.exec(val);
  }
  return newVal;
}

export class Lifecycle implements ILifecycle {
  version: string;
  name: LifecycleName;
  driverDefs: DriverDefinition[];
  constructor(name: LifecycleName, driverDefs: DriverDefinition[], version: string) {
    this.driverDefs = driverDefs;
    this.name = name;
    this.version = version;
  }

  resolvePlaceholders(): UnresolvedPlaceholders {
    const result = resolvePlaceHolders(this.driverDefs);
    return result[1];
  }

  private static stringifyOutput(output: Map<string, string>): string {
    const obj: Record<string, string> = {};

    for (const [k, v] of output) {
      if (k.startsWith("SECRET_")) {
        obj[k] = "******";
      } else {
        obj[k] = v;
      }
    }

    return JSON.stringify(obj);
  }

  async execute(ctx: DriverContext): Promise<ExecutionResult> {
    const actions = JSON.stringify(this.driverDefs.map((def) => this.stringifyDriverDef(def)));
    const telemetryReporter = new TeamsFxTelemetryReporter(ctx.telemetryReporter, {
      componentName: component,
    });
    telemetryReporter.sendStartEvent({
      eventName: lifecycleExecutionEvent,
      properties: {
        [TelemetryProperty.Lifecycle]: this.name,
        [TelemetryProperty.Actions]: actions,
      },
    });
    await ctx.logProvider.info(`Executing lifecycle ${this.name}`);
    const resolved: ResolvedPlaceholders = [];
    const unresolved: UnresolvedPlaceholders = [];
    const { result, summaries } = await this.executeImpl(ctx, resolved, unresolved);
    let e: FxError | undefined;
    let failedAction: string | undefined;

    if (result.isOk()) {
      await ctx.logProvider.info(
        `Finished Executing lifecycle ${this.name}. Result: ${Lifecycle.stringifyOutput(
          result.value
        )}`
      );
    } else {
      if (result.error.kind === "Failure") {
        e = result.error.error;
        await ctx.logProvider.info(
          `Failed to Execute lifecycle ${this.name}. ${e.name}:${e.message}`
        );
      } else if (result.error.kind === "PartialSuccess") {
        failedAction = this.stringifyDriverDef(result.error.reason.failedDriver);
        const output = Lifecycle.stringifyOutput(result.error.env);
        if (result.error.reason.kind === "DriverError") {
          e = result.error.reason.error;
          await ctx.logProvider.info(
            `Failed to Execute lifecycle ${this.name} due to failed action: ${failedAction}. ${e.name}:${e.message}. Env output: ${output}`
          );
        } else if (result.error.reason.kind === "UnresolvedPlaceholders") {
          // This error is just for telemetry because sendEndEvent() needs an error as parameter.
          e = new MissingEnvironmentVariablesError(
            component,
            result.error.reason.unresolvedPlaceHolders.join(",")
          );
          await ctx.logProvider.info(
            `Failed to Execute lifecycle ${
              this.name
            } because there are unresolved placeholders ${JSON.stringify(
              unresolved
            )} for action: ${failedAction}. Env output: ${output}`
          );
        }
      }
    }

    telemetryReporter.sendEndEvent(
      {
        eventName: lifecycleExecutionEvent,
        properties: {
          [TelemetryProperty.Lifecycle]: this.name,
          [TelemetryProperty.Actions]: actions,
          [TelemetryProperty.ResolvedPlaceholders]: JSON.stringify(resolved),
          [TelemetryProperty.UnresolvedPlaceholders]: JSON.stringify(unresolved),
          [TelemetryProperty.FailedAction]: failedAction ?? "",
        },
      },
      e
    );

    return { result, summaries };
  }

  async executeImpl(
    ctx: DriverContext,
    resolved: ResolvedPlaceholders,
    unresolved: ResolvedPlaceholders
  ): Promise<ExecutionResult> {
    const maybeDrivers = this.resolveDriverInstances(ctx.logProvider);
    if (maybeDrivers.isErr()) {
      return { result: err({ kind: "Failure", error: maybeDrivers.error }), summaries: [] };
    }
    const drivers = maybeDrivers.value;
    const envOutput = new Map<string, string>();
    const summaries: string[][] = [];
    for (const driver of drivers) {
      await ctx.logProvider.info(
        `Executing action ${this.stringifyDriverDef(driver)} in lifecycle ${this.name}`
      );
      resolveDriverDef(driver, resolved, unresolved);
      if (unresolved.length > 0) {
        await ctx.logProvider.info(
          `Unresolved placeholders(${unresolved}) found for Action ${this.stringifyDriverDef(
            driver
          )} in lifecycle ${this.name}`
        );
        summaries.push([
          `${SummaryConstant.Failed} Unresolved placeholders: ${unresolved.join(",")}`,
        ]);
        return {
          result: err({
            kind: "PartialSuccess",
            env: envOutput,
            reason: {
              kind: "UnresolvedPlaceholders",
              failedDriver: driver,
              unresolvedPlaceHolders: unresolved,
            },
          }),
          summaries,
        };
      }

      if (driver.env) {
        for (const [envVar, value] of Object.entries(driver.env)) {
          process.env[envVar] = value;
        }
      }

      let result: Result<Map<string, string>, FxError>;
      let summary: string[];
      if (driver.instance.execute) {
        const r = await driver.instance.execute(
          driver.with,
          ctx,
          driver.writeToEnvironmentFile
            ? new Map(Object.entries(driver.writeToEnvironmentFile))
            : undefined,
          this.version
        );
        result = r.result;
        summary = r.summaries.map((s) => `${SummaryConstant.Succeeded} ${s}`);
      } else {
        result = await driver.instance.run(driver.with, ctx);
        // if execute is not implemented, treat it as if no summaries was returned.
        summary = [];
      }
      summaries.push(summary);
      if (result.isErr()) {
        summary.push(`${SummaryConstant.Failed} ${result.error.message}`);
        return {
          result: err({
            kind: "PartialSuccess",
            env: envOutput,
            reason: {
              kind: "DriverError",
              failedDriver: driver,
              error: result.error,
            },
          }),
          summaries,
        };
      }

      for (const [envVar, value] of result.value) {
        envOutput.set(envVar, value);
        process.env[envVar] = value;
      }
      await ctx.logProvider.info(
        `Action ${this.stringifyDriverDef(driver)} in lifecycle ${
          this.name
        } succeeded with output ${Lifecycle.stringifyOutput(result.value)}`
      );
    }

    return { result: ok(envOutput), summaries };
  }

  async run(ctx: DriverContext): Promise<Result<Output, FxError>> {
    const maybeDrivers = this.resolveDriverInstances(ctx.logProvider);
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
    const unresolvedPlaceHolders: string[] = resolvePlaceHolders(drivers)[1];
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

  public resolveDriverInstances(log: LogProvider): Result<DriverInstance[], FxError> {
    void log.debug(`Trying to resolve actions for lifecycle ${this.name}`);
    const drivers: DriverInstance[] = [];
    for (const def of this.driverDefs) {
      if (!Container.has(def.uses)) {
        return err(new InvalidYmlActionNameError(def.uses));
      }
      const driver = Container.get<StepDriver>(def.uses);
      drivers.push({ instance: driver, ...def });
      void log.debug(`Action ${this.stringifyDriverDef(def)} found for lifecycle ${this.name}`);
    }
    return ok(drivers);
  }
}
