// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Plugin,
  PluginContext,
  err,
  SystemError,
  UserError,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";

import {
  ErrorType,
  BlazorPluginError,
  UnhandledErrorCode,
  UnhandledErrorMessage,
} from "./resources/errors";
import { Logger } from "./utils/logger";
import { ErrorFactory, TeamsFxResult } from "./error-factory";
import { HostTypeOptionAzure } from "../../solution/fx-solution/question";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { BlazorPluginImpl as PluginImpl } from "./plugin";
import { BlazorPluginInfo as PluginInfo } from "./constants";

@Service(ResourcePlugins.BlazorPlugin)
export class BlazorPlugin implements Plugin {
  name = "fx-resource-blazor";
  displayName = "Blazor";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    // TODO: Change activate condition after integrating with solution
    const hostType = solutionSettings?.hostType || "";
    return hostType === HostTypeOptionAzure.id;
  }
  blazorPluginImpl = new PluginImpl();

  private static setContext(ctx: PluginContext): void {
    Logger.setLogger(PluginInfo.pluginName, ctx.logProvider);
  }

  public async preProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    BlazorPlugin.setContext(ctx);
    return await this.runWithErrorHandling(() => this.blazorPluginImpl.preProvision(ctx));
  }

  public async provision(ctx: PluginContext): Promise<TeamsFxResult> {
    BlazorPlugin.setContext(ctx);
    return await this.runWithErrorHandling(() => this.blazorPluginImpl.provision(ctx));
  }

  public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    BlazorPlugin.setContext(ctx);
    return await this.runWithErrorHandling(() => this.blazorPluginImpl.postProvision(ctx));
  }

  public async deploy(ctx: PluginContext): Promise<TeamsFxResult> {
    BlazorPlugin.setContext(ctx);
    return await this.runWithErrorHandling(() => this.blazorPluginImpl.deploy(ctx));
  }

  private async runWithErrorHandling(fn: () => Promise<TeamsFxResult>): Promise<TeamsFxResult> {
    try {
      return await fn();
    } catch (e: any) {
      if (e instanceof BlazorPluginError) {
        const error =
          e.errorType === ErrorType.User
            ? ErrorFactory.UserError(e.code, e.getMessage(), undefined, undefined, e.helpLink)
            : ErrorFactory.SystemError(
                e.code,
                e.getMessage(),
                e.getInnerError(),
                e.getInnerError()?.stack
              );
        return err(error);
      }

      if (e instanceof UserError || e instanceof SystemError) {
        return err(e);
      }

      const error = ErrorFactory.SystemError(
        UnhandledErrorCode,
        UnhandledErrorMessage,
        e,
        e?.stack
      );
      return err(error);
    }
  }
}

export default new BlazorPlugin();
