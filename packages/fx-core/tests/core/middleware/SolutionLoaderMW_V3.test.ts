// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks, NextFunction } from "@feathersjs/hooks/lib";
import { FxError, Inputs, ok, Platform, Result } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { newProjectSettings } from "../../../src";
import { ContextInjectorMW } from "../../../src/core/middleware";
import { CoreHookContext } from "../../../src/core/middleware/CoreHookContext";
import { SolutionLoaderMW_V3 } from "../../../src/core/middleware/solutionLoaderV3";
import { TeamsFxAzureSolutionNameV3 } from "../../../src/plugins/solution/fx-solution/v3/constants";

describe("Middleware - SolutionLoaderMW_V3", () => {
  const MockProjectSettingsMW = async (ctx: CoreHookContext, next: NextFunction) => {
    ctx.projectSettings = newProjectSettings();
    ctx.projectSettings.solutionSettings.name = TeamsFxAzureSolutionNameV3;
    await next();
  };
  class MyClass {
    async isLoaded(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
      if (ctx) {
        return ok(ctx.solutionV3 !== undefined);
      }
      return ok(false);
    }
  }
  it("load solution from zero and inject", async () => {
    hooks(MyClass, {
      isLoaded: [SolutionLoaderMW_V3, ContextInjectorMW],
    });
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    const res = await my.isLoaded(inputs);
    assert.isTrue(res.isOk() && res.value === true);
  });
  it("load solution from existing project and inject", async () => {
    hooks(MyClass, {
      isLoaded: [MockProjectSettingsMW, SolutionLoaderMW_V3, ContextInjectorMW],
    });
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    const res = await my.isLoaded(inputs);
    assert.isTrue(res.isOk() && res.value === true);
  });
});
