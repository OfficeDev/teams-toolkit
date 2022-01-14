// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext } from "@microsoft/teamsfx-api";
import { PluginImpl } from "../interface";
import { FxResult, FxBotPluginResultFactory as ResultFactory } from "../result";

export class DotnetBotImpl implements PluginImpl {
  public async scaffold(context: PluginContext): Promise<FxResult> {
    return ResultFactory.Success();
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<FxResult> {
    return ResultFactory.Success();
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<FxResult> {
    return ResultFactory.Success();
  }

  public async localDebug(ctx: PluginContext): Promise<FxResult> {
    return ResultFactory.Success();
  }

  public async postLocalDebug(ctx: PluginContext): Promise<FxResult> {
    return ResultFactory.Success();
  }

  public async preProvision(ctx: PluginContext): Promise<FxResult> {
    return ResultFactory.Success();
  }

  public async provision(ctx: PluginContext): Promise<FxResult> {
    return ResultFactory.Success();
  }

  public async postProvision(ctx: PluginContext): Promise<FxResult> {
    return ResultFactory.Success();
  }

  public async preDeploy(ctx: PluginContext): Promise<FxResult> {
    return ResultFactory.Success();
  }

  public async deploy(ctx: PluginContext): Promise<FxResult> {
    return ResultFactory.Success();
  }

  public async migrateV1Project(ctx: PluginContext): Promise<FxResult> {
    return ResultFactory.Success();
  }
}
