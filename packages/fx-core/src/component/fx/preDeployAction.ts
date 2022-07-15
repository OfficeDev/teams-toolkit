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
import { checkDeployAzureSubscription } from "../../plugins/solution/fx-solution/v3/deploy";
import { askForDeployConsent } from "../../plugins/solution/fx-solution/v3/provision";

export class FxPreDeployForAzureAction implements FunctionAction {
  type: "function" = "function";
  name = "fx.preDeployForAzure";
  async execute(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Effect[], FxError>> {
    const ctx = context as ProvisionContextV3;
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
    return ok([]);
  }
}
