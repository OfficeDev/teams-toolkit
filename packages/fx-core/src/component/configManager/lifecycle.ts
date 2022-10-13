import { ok, err, FxError, Result } from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import { DriverContext } from "../driver/interface/commonArgs";
import { StepDriver } from "../driver/interface/stepDriver";
import { DriverNotFoundError } from "./error";
import { DriverDefinition, LifecycleName, ILifecycle, Output, DriverInstance } from "./interface";

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
    const output: Output = new Map<string, string>();
    for (const driver of drivers) {
      const result = await driver.instance.run(driver.with, ctx);
      if (result.isErr()) {
        return err(result.error);
      }
      for (const [envVar, value] of result.value) {
        output.set(envVar, value);
        process.env[envVar] = value;
      }
    }

    return ok(output);
  }

  private getDrivers(): Result<DriverInstance[], FxError> {
    const drivers: DriverInstance[] = [];
    for (const def of this.driverDefs) {
      if (!Container.has(def.uses)) {
        return err(new DriverNotFoundError(def.name, def.uses));
      }
      const driver = Container.get<StepDriver>(def.uses);
      drivers.push({ instance: driver, ...def });
    }
    return ok(drivers);
  }
}
