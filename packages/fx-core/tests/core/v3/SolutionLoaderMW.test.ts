// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks, NextFunction } from "@feathersjs/hooks/lib";
import { FxError, Inputs, ok, Platform, Result } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as uuid from "uuid";
import { CoreHookContext } from "../../../src";
import { ContextInjectorMW } from "../../../src/core/middleware";
import { SolutionLoaderMW_V3 } from "../../../src/core/v3/mw/solutionLoader";
import { TeamsFxAzureSolutionNameV3 } from "../../../src/plugins/solution/fx-solution/v3/constants";

describe("Middleware - SolutionLoaderMW_V3, ContextInjectorMW", () => {
  const MockProjectSettingsMW = async (ctx: CoreHookContext, next: NextFunction) => {
    ctx.projectSettings = {
      appName: "testapp",
      projectId: uuid.v4(),
      version: "2.0.0",
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
      },
    };
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
  it("load solution from project settings", async () => {
    hooks(MyClass, {
      isLoaded: [MockProjectSettingsMW, SolutionLoaderMW_V3, ContextInjectorMW],
    });
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    const res = await my.isLoaded(inputs);
    assert.isTrue(res.isOk() && res.value === true);
  });
});
