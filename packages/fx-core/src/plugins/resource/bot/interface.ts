// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Func, PluginContext } from "@microsoft/teamsfx-api";
import { FxResult } from "./result";

export interface PluginImpl {
  scaffold(ctx: PluginContext): Promise<FxResult>;
  generateArmTemplates(ctx: PluginContext): Promise<FxResult>;
  updateArmTemplates(ctx: PluginContext): Promise<FxResult>;
  localDebug(ctx: PluginContext): Promise<FxResult>;
  postLocalDebug(ctx: PluginContext): Promise<FxResult>;
  preProvision(ctx: PluginContext): Promise<FxResult>;
  provision(ctx: PluginContext): Promise<FxResult>;
  postProvision(ctx: PluginContext): Promise<FxResult>;
  preDeploy(ctx: PluginContext): Promise<FxResult>;
  deploy(ctx: PluginContext): Promise<FxResult>;
  getQuestionsForScaffolding(ctx: PluginContext): Promise<FxResult>;
  getQuestionsForUserTask(func: Func, ctx: PluginContext): Promise<FxResult>;
}
