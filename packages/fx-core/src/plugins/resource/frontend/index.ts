// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FrontendPluginImpl } from "./plugin";
import {
  Plugin,
  PluginContext,
  err,
  SystemError,
  UserError,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";

import { ErrorFactory, TeamsFxResult } from "./error-factory";
import {
  ErrorType,
  FrontendPluginError,
  UnhandledErrorCode,
  UnhandledErrorMessage,
} from "./resources/errors";
import { Logger } from "./utils/logger";
import { ProgressHelper } from "./utils/progress-helper";
import { FrontendPluginInfo, TelemetryEvent } from "./constants";
import { TelemetryHelper } from "./utils/telemetry-helper";
import { HostTypeOptionAzure, TabOptionItem } from "../../solution/fx-solution/question";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import "./v2";
import { DotnetPluginImpl } from "./dotnet/plugin";
import { DotnetPluginInfo } from "./dotnet/constants";
import { PluginImpl } from "./interface";
import { isVSProject } from "../../../common/projectSettingsHelper";

@Service(ResourcePlugins.FrontendPlugin)
export class FrontendPlugin implements Plugin {
  name = "fx-resource-frontend-hosting";
  displayName = "Tab Front-end";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    const cap = solutionSettings.capabilities || [];
    return solutionSettings.hostType === HostTypeOptionAzure.id && cap.includes(TabOptionItem.id);
  }
  frontendPluginImpl = new FrontendPluginImpl();
  dotnetPluginImpl = new DotnetPluginImpl();

  private getImpl(ctx: PluginContext): PluginImpl {
    return isVSProject(ctx.projectSettings!) ? this.dotnetPluginImpl : this.frontendPluginImpl;
  }

  private static setContext(ctx: PluginContext): void {
    const component = isVSProject(ctx.projectSettings!)
      ? DotnetPluginInfo.pluginName
      : FrontendPluginInfo.PluginName;
    Logger.setLogger(ctx.logProvider, component);
    TelemetryHelper.setContext(ctx, component);
  }

  public async scaffold(ctx: PluginContext): Promise<TeamsFxResult> {
    FrontendPlugin.setContext(ctx);
    return this.runWithErrorHandling(ctx, TelemetryEvent.Scaffold, () =>
      this.getImpl(ctx).scaffold(ctx)
    );
  }

  public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    FrontendPlugin.setContext(ctx);
    return this.runWithErrorHandling(ctx, TelemetryEvent.PostProvision, () =>
      this.getImpl(ctx).postProvision(ctx)
    );
  }

  public async preDeploy(ctx: PluginContext): Promise<TeamsFxResult> {
    FrontendPlugin.setContext(ctx);
    return this.runWithErrorHandling(ctx, TelemetryEvent.PreDeploy, () =>
      this.getImpl(ctx).preDeploy(ctx)
    );
  }

  public async deploy(ctx: PluginContext): Promise<TeamsFxResult> {
    FrontendPlugin.setContext(ctx);
    return this.runWithErrorHandling(ctx, TelemetryEvent.Deploy, () =>
      this.getImpl(ctx).deploy(ctx)
    );
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult> {
    FrontendPlugin.setContext(ctx);
    return this.runWithErrorHandling(ctx, TelemetryEvent.UpdateArmTemplates, () =>
      this.getImpl(ctx).updateArmTemplates(ctx)
    );
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult> {
    FrontendPlugin.setContext(ctx);
    return this.runWithErrorHandling(ctx, TelemetryEvent.GenerateArmTemplates, () =>
      this.getImpl(ctx).generateArmTemplates(ctx)
    );
  }

  public async localDebug(ctx: PluginContext): Promise<TeamsFxResult> {
    FrontendPlugin.setContext(ctx);
    return this.runWithErrorHandling(ctx, TelemetryEvent.LocalDebug, () =>
      this.getImpl(ctx).localDebug(ctx)
    );
  }

  public async postLocalDebug(ctx: PluginContext): Promise<TeamsFxResult> {
    FrontendPlugin.setContext(ctx);
    return this.runWithErrorHandling(ctx, TelemetryEvent.PostLocalDebug, () =>
      this.getImpl(ctx).postLocalDebug(ctx)
    );
  }

  private async runWithErrorHandling(
    ctx: PluginContext,
    stage: string,
    fn: () => Promise<TeamsFxResult>,
    properties: { [key: string]: string } = {}
  ): Promise<TeamsFxResult> {
    try {
      TelemetryHelper.sendStartEvent(stage, properties);
      const result = await fn();
      TelemetryHelper.sendSuccessEvent(stage, properties);
      return result;
    } catch (e) {
      await ProgressHelper.endProgress(false);

      if (e instanceof FrontendPluginError) {
        const error =
          e.errorType === ErrorType.User
            ? ErrorFactory.UserError(
                e.code,
                [e.getDefaultMessage(), e.getMessage()],
                undefined,
                undefined,
                e.helpLink
              )
            : ErrorFactory.SystemError(
                e.code,
                [e.getDefaultMessage(), e.getMessage()],
                e.getInnerError(),
                e.getInnerError()?.stack
              );
        TelemetryHelper.sendErrorEvent(stage, error, properties);
        return err(error);
      }

      if (e instanceof UserError || e instanceof SystemError) {
        TelemetryHelper.sendErrorEvent(stage, e, properties);
        return err(e);
      }

      const error = ErrorFactory.SystemError(
        UnhandledErrorCode,
        [UnhandledErrorMessage, UnhandledErrorMessage],
        e,
        e.stack
      );
      TelemetryHelper.sendErrorEvent(stage, error, properties);
      return err(error);
    }
  }
}

export default new FrontendPlugin();
