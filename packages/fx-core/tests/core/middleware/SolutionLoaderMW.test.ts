// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks, NextFunction } from "@feathersjs/hooks/lib";
import { FxError, Inputs, ok, Platform, Result } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as uuid from "uuid";
import { ContextInjectorMW, SolutionLoaderMW } from "../../../src/core/middleware";
import { CoreHookContext } from "../../../src/core/middleware/CoreHookContext";

describe("Middleware - SolutionLoaderMW, ContextInjectorMW", () => {
  const MockProjectSettingsMW = async (ctx: CoreHookContext, next: NextFunction) => {
    ctx.projectSettings = {
      appName: "testapp",
      projectId: uuid.v4(),
      version: "2.0.0",
      solutionSettings: {
        name: "fx-solution-azure",
      },
    };
    await next();
  };
  class MyClass {
    async isLoaded(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
      if (ctx) {
        return ok(ctx.solutionV2 !== undefined);
      }
      return ok(false);
    }
  }
  it("load solution from zero and inject", async () => {
    hooks(MyClass, {
      isLoaded: [SolutionLoaderMW, ContextInjectorMW],
    });
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    const res = await my.isLoaded(inputs);
    assert.isTrue(res.isOk() && res.value === true);
  });

  it("load solution from existing project and inject", async () => {
    hooks(MyClass, {
      isLoaded: [MockProjectSettingsMW, SolutionLoaderMW, ContextInjectorMW],
    });
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    const res = await my.isLoaded(inputs);
    assert.isTrue(res.isOk() && res.value === true);
  });
});
