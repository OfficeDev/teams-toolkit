// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Step } from "../interface/buildAndDeployArgs";
import { PrerequisiteError } from "../error/componentError";
import { StepDriver } from "../interface/stepDriver";
import { Container } from "typedi";
import { DriverContext } from "../interface/commonArgs";

/**
 * entrance of the all lifecycle stage
 */
class LifecycleStage {
  static async runSteps(steps: Step[], context: DriverContext) {
    const drivers = steps.map((it) => Container.get(it.driver) as StepDriver);
    if (drivers.find((it) => !it)) {
      throw PrerequisiteError.somethingIllegal("Deploy", "DriverName", "");
    }
    for (const step of steps) {
      const driver = Container.get(step.driver) as StepDriver;
      await driver.run(step.args, context);
      // write to .env file
    }
  }
}
