// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Plugin,
  PluginContext,
  SystemError,
  UserError,
  err,
  AzureSolutionSettings,
  Result,
  FxError,
} from "@microsoft/teamsfx-api";
import { AzureResourceKeyVault, HostTypeOptionAzure } from "../../solution/fx-solution/question";
import { KeyVaultPluginImpl } from "./plugin";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { ArmTemplateResult } from "../../../common/armInterface";
import { ResultFactory, TeamsFxResult } from "./result";
import { Constants, Telemetry } from "./constants";
import { TelemetryUtils } from "./utils/telemetry";

@Service(ResourcePlugins.KeyVaultPlugin)
export class KeyVaultPlugin implements Plugin {
  name = Constants.KeyVaultPlugin.pluginName;
  displayName = Constants.KeyVaultPlugin.displayName;

  activate(solutionSettings: AzureSolutionSettings): boolean {
    const azureResources = solutionSettings.azureResources || [];
    return (
      solutionSettings.hostType === HostTypeOptionAzure.id &&
      azureResources.includes(AzureResourceKeyVault.id)
    );
  }
  keyVaultPluginImpl = new KeyVaultPluginImpl();

  public async generateArmTemplates(
    ctx: PluginContext
  ): Promise<Result<ArmTemplateResult, FxError>> {
    TelemetryUtils.init(ctx);
    return this.runWithErrorHandling(
      () => this.keyVaultPluginImpl.generateArmTemplates(ctx),
      ctx,
      Constants.Stage.generateArmTemplates
    );
  }

  private async runWithErrorHandling(
    fn: () => Promise<TeamsFxResult>,
    ctx: PluginContext,
    stage: string
  ): Promise<TeamsFxResult> {
    try {
      TelemetryUtils.sendEvent(`${stage}-start`);
      const res: TeamsFxResult = await fn();
      TelemetryUtils.sendEvent(stage);
      return res;
    } catch (e) {
      if (!(e instanceof Error || e instanceof SystemError || e instanceof UserError)) {
        e = new Error(e.toString());
      }
      ctx.logProvider?.error(e.message);

      if (e instanceof SystemError || e instanceof UserError) {
        TelemetryUtils.sendErrorEvent(
          stage,
          e.name,
          e instanceof UserError ? Telemetry.userError : Telemetry.systemError,
          e.message
        );
        return err(e);
      } else {
        const UnhandledErrorCode = "UnhandledError";
        TelemetryUtils.sendErrorEvent(stage, UnhandledErrorCode, Telemetry.systemError, e?.message);
        return err(ResultFactory.SystemError(UnhandledErrorCode, e?.message, e));
      }
    }
  }
}

export default new KeyVaultPlugin();
