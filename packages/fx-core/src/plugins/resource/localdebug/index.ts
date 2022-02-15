// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  Func,
  FxError,
  Plugin,
  PluginContext,
  Result,
  ok,
  AzureSolutionSettings,
  Void,
} from "@microsoft/teamsfx-api";

import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import "./v2";

@Service(ResourcePlugins.LocalDebugPlugin)
export class LocalDebugPlugin implements Plugin {
  name = "fx-resource-local-debug";
  displayName = "LocalDebug";

  activate(solutionSettings: AzureSolutionSettings): boolean {
    return true;
  }

  public async scaffold(ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  }

  public async localDebug(ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  }

  public async postLocalDebug(ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  }

  public async executeUserTask(func: Func, ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(undefined);
  }
}

export default new LocalDebugPlugin();
