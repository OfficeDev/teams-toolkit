// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  ResourceContextV3,
  Result,
  UserError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { cloneDeep } from "lodash";
import { Container } from "typedi";
import { PluginDisplayName } from "../common/constants";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import {
  SolutionError,
  SolutionSource,
  SolutionTelemetryEvent,
  ViewAadAppHelpLink,
} from "../plugins/solution/fx-solution/constants";
import { sendErrorTelemetryThenReturnError } from "../plugins/solution/fx-solution/utils/util";
import { executeConcurrently } from "../plugins/solution/fx-solution/v2/executor";
import { ComponentNames } from "./constants";
import { AadApp } from "./resource/aadApp/aadApp";

export class DeployUtils {
  /**
   * make sure subscription is correct before deployment
   *
   */
  async checkDeployAzureSubscription(
    ctx: v2.Context,
    envInfo: v3.EnvInfoV3,
    azureAccountProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    const subscriptionIdInConfig =
      envInfo.config.azure?.subscriptionId || (envInfo.state.solution.subscriptionId as string);
    const subscriptionInAccount = await azureAccountProvider.getSelectedSubscription(true);
    if (!subscriptionIdInConfig) {
      if (subscriptionInAccount) {
        envInfo.state.solution.subscriptionId = subscriptionInAccount.subscriptionId;
        envInfo.state.solution.subscriptionName = subscriptionInAccount.subscriptionName;
        envInfo.state.solution.tenantId = subscriptionInAccount.tenantId;
        ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
        return ok(Void);
      } else {
        return err(
          new UserError(
            SolutionSource,
            SolutionError.SubscriptionNotFound,
            "Failed to select subscription"
          )
        );
      }
    }
    // make sure the user is logged in
    await azureAccountProvider.getAccountCredentialAsync(true);
    // verify valid subscription (permission)
    const subscriptions = await azureAccountProvider.listSubscriptions();
    const targetSubInfo = subscriptions.find(
      (item) => item.subscriptionId === subscriptionIdInConfig
    );
    if (!targetSubInfo) {
      return err(
        new UserError(
          SolutionSource,
          SolutionError.SubscriptionNotFound,
          `The subscription '${subscriptionIdInConfig}'(${
            envInfo.state.solution.subscriptionName
          }) for '${
            envInfo.envName
          }' environment is not found in the current account, please use the right Azure account or check the '${EnvConfigFileNameTemplate.replace(
            EnvNamePlaceholder,
            envInfo.envName
          )}' file.`
        )
      );
    }
    envInfo.state.solution.subscriptionId = targetSubInfo.subscriptionId;
    envInfo.state.solution.subscriptionName = targetSubInfo.subscriptionName;
    envInfo.state.solution.tenantId = targetSubInfo.tenantId;
    ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
    return ok(Void);
  }

  async deployAadFromVscode(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const thunks = [];
    // 1. collect resources to deploy
    const deployComponent = Container.get<AadApp>(ComponentNames.AadApp);
    thunks.push({
      pluginName: `${deployComponent.name}`,
      taskName: `deploy`,
      thunk: async () => {
        const clonedInputs = cloneDeep(inputs);
        clonedInputs.componentId = deployComponent.name;
        return await deployComponent.deploy!(context, clonedInputs);
      },
    });
    if (thunks.length === 0) {
      return err(
        new UserError(
          "fx",
          "NoResourcePluginSelected",
          getDefaultString("core.NoPluginSelected"),
          getLocalizedString("core.NoPluginSelected")
        )
      );
    }

    context.logProvider.info(
      getLocalizedString(
        "core.deploy.selectedPluginsToDeployNotice",
        PluginDisplayName.Solution,
        JSON.stringify(thunks.map((p) => p.pluginName))
      )
    );

    // 2. check azure account
    const subscriptionResult = await this.checkDeployAzureSubscription(
      context,
      context.envInfo,
      context.tokenProvider.azureAccountProvider
    );
    if (subscriptionResult.isErr()) {
      return err(subscriptionResult.error);
    }

    // 3. start deploy
    context.logProvider.info(
      getLocalizedString("core.deploy.startNotice", PluginDisplayName.Solution)
    );
    const result = await executeConcurrently(thunks, context.logProvider);

    if (result.kind === "success") {
      const msg = getLocalizedString("core.deploy.aadManifestSuccessNotice");
      context.logProvider.info(msg);
      context.userInteraction
        .showMessage("info", msg, false, getLocalizedString("core.deploy.aadManifestLearnMore"))
        .then((result) => {
          const userSelected = result.isOk() ? result.value : undefined;
          if (userSelected === getLocalizedString("core.deploy.aadManifestLearnMore")) {
            context.userInteraction?.openUrl(ViewAadAppHelpLink);
          }
        });
      return ok(undefined);
    } else {
      const msg = getLocalizedString("core.deploy.failNotice", context.projectSetting.appName);
      context.logProvider.info(msg);
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.Deploy,
          result.error,
          context.telemetryReporter
        )
      );
    }
  }

  async askForDeployConsent(
    ctx: v2.Context,
    azureAccountProvider: AzureAccountProvider,
    envInfo: v3.EnvInfoV3
  ): Promise<Result<Void, FxError>> {
    const azureToken = await azureAccountProvider.getAccountCredentialAsync();

    // Only Azure project requires this confirm dialog
    const username = (azureToken as any).username || "";
    const subscriptionId = envInfo.state.solution?.subscriptionId || "";
    const subscriptionName = envInfo.state.solution?.subscriptionName || "";
    const msg = getLocalizedString(
      "core.deploy.confirmEnvNotice",
      envInfo.envName,
      username,
      subscriptionName ? subscriptionName : subscriptionId
    );
    const deployOption = "Deploy";
    const result = await ctx.userInteraction.showMessage("warn", msg, true, deployOption);
    const choice = result?.isOk() ? result.value : undefined;

    if (choice === deployOption) {
      return ok(Void);
    }
    return err(new UserError(SolutionSource, "UserCancel", "UserCancel"));
  }
}

export const deployUtils = new DeployUtils();
