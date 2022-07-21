// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ContextV3,
  Effect,
  err,
  FunctionAction,
  FxError,
  InputsWithProjectPath,
  ok,
  ProvisionContextV3,
  Result,
} from "@microsoft/teamsfx-api";
import { AzureSolutionQuestionNames } from "../../plugins";
import { checkDeployAzureSubscription } from "../../plugins/solution/fx-solution/v3/deploy";
import { askForDeployConsent } from "../../plugins/solution/fx-solution/v3/provision";
import { AzureResources } from "../constants";
import { pluginName2ComponentName } from "../migrate";

export class FxPreDeployAction implements FunctionAction {
  type: "function" = "function";
  name = "fx.preDeployForAzure";
  async execute(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Effect[], FxError>> {
    const ctx = context as ProvisionContextV3;
    const inputPlugins: string[] = inputs[AzureSolutionQuestionNames.PluginSelectionDeploy] || [];
    const selectedComponents = inputPlugins.map((plugin: string) =>
      pluginName2ComponentName(plugin)
    );
    const hasAzureResource =
      ctx.projectSetting.components.filter(
        (c) =>
          selectedComponents.includes(c.name) &&
          c.deploy &&
          c.hosting !== undefined &&
          AzureResources.includes(c.hosting)
      ).length > 0;
    inputs.hasAzureResource = hasAzureResource;
    if (!hasAzureResource) return ok([]);
    const subscriptionResult = await checkDeployAzureSubscription(
      ctx,
      ctx.envInfo,
      ctx.tokenProvider.azureAccountProvider
    );
    if (subscriptionResult.isErr()) {
      return err(subscriptionResult.error);
    }
    const consent = await askForDeployConsent(
      ctx,
      ctx.tokenProvider.azureAccountProvider,
      ctx.envInfo
    );
    if (consent.isErr()) {
      return err(consent.error);
    }
    return ok(["check account and subscription"]);
  }
}
