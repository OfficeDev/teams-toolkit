import { ok, err, FxError, Result } from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import { DriverContext } from "../driver/interface/commonArgs";
import { StepDriver } from "../driver/interface/stepDriver";
import { DriverNotFoundError } from "./error";
import { DriverDefinition, LifecycleName, ILifecycle, Output, DriverInstance } from "./interface";

// Replace placeholders in the driver definitions' `with` field inplace
// and returns unresolved placeholders
function resolvePlaceHolders(defs: DriverDefinition[]): string[] {
  const unresolvedVars: string[] = [];
  for (const def of defs) {
    const args = def.with as Record<string, string>;
    for (const k in args) {
      const val = args[k];
      const placeHolderReg = /\${{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
      let matches = placeHolderReg.exec(val);
      let newVal = val;
      while (matches != null) {
        const envVar = matches[1];
        const envVal = process.env[envVar];
        if (!envVal) {
          unresolvedVars.push(envVar);
        } else {
          newVal = newVal.replace(matches[0], envVal);
        }
        matches = placeHolderReg.exec(val);
      }
      args[k] = newVal;
    }
  }
  return unresolvedVars;
}

export class Lifecycle implements ILifecycle {
  name: LifecycleName;
  private driverDefs: DriverDefinition[];
  constructor(name: LifecycleName, driverDefs: DriverDefinition[]) {
    this.driverDefs = driverDefs;
    this.name = name;
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
