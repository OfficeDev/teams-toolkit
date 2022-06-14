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
  UserError,
} from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import {
  askForDeployConsent,
  checkAzureSubscription,
} from "../../plugins/solution/fx-solution/v3/provision";

export class FxPreDeployAction implements FunctionAction {
  type: "function" = "function";
  name = "fx.preDeploy";
  async execute(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Effect[], FxError>> {
    const ctx = context as ProvisionContextV3;
    const components = inputs["deploy-plugin"];
    if (components === undefined || components.length === 0) {
      return err(
        new UserError(
          "fx",
          "NoResourcePluginSelected",
          getDefaultString("core.NoPluginSelected"),
          getLocalizedString("core.NoPluginSelected")
        )
      );
    }
    const subscriptionResult = await checkAzureSubscription(
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
    return ok([]);
  }
}
