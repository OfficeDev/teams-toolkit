// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext } from "@microsoft/teamsfx-api";
import { TeamsFxResult } from "./error-factory";

export interface PluginImpl {
  scaffold(ctx: PluginContext): Promise<TeamsFxResult>;
  generateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult>;
  updateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult>;
  localDebug(ctx: PluginContext): Promise<TeamsFxResult>;
  postProvision(ctx: PluginContext): Promise<TeamsFxResult>;
  preDeploy(ctx: PluginContext): Promise<TeamsFxResult>;
  deploy(ctx: PluginContext): Promise<TeamsFxResult>;
}
