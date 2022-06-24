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
import { getLocalizedString } from "../../common/localizeUtils";
import { hasAzureResourceV3 } from "../../common/projectSettingsHelperV3";
import { resourceGroupHelper } from "../../plugins/solution/fx-solution/utils/ResourceGroupHelper";
import {
  askForProvisionConsent,
  fillInAzureConfigs,
  getM365TenantId,
} from "../../plugins/solution/fx-solution/v3/provision";
import { ComponentNames } from "../constants";

export class FxPreProvisionAction implements FunctionAction {
  name = "fx.preProvision";
  type: "function" = "function";
  async execute(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Effect[], FxError>> {
    const ctx = context as ProvisionContextV3;
    const envInfo = ctx.envInfo;
    // 1. check M365 tenant
    envInfo.state[ComponentNames.AppManifest] = envInfo.state[ComponentNames.AppManifest] || {};
    envInfo.state.solution = envInfo.state.solution || {};
    const appManifest = envInfo.state[ComponentNames.AppManifest];
    const solutionConfig = envInfo.state.solution;
    solutionConfig.provisionSucceeded = false;
    const tenantIdInConfig = appManifest.tenantId;
    const tenantIdInTokenRes = await getM365TenantId(ctx.tokenProvider.m365TokenProvider);
    if (tenantIdInTokenRes.isErr()) {
      return err(tenantIdInTokenRes.error);
    }
    const tenantIdInToken = tenantIdInTokenRes.value;
    if (tenantIdInConfig && tenantIdInToken && tenantIdInToken !== tenantIdInConfig) {
      return err(
        new UserError(
          "Solution",
          "TeamsAppTenantIdNotRight",
          getLocalizedString("error.M365AccountNotMatch", envInfo.envName)
        )
      );
    }
    if (!tenantIdInConfig) {
      appManifest.tenantId = tenantIdInToken;
      solutionConfig.teamsAppTenantId = tenantIdInToken;
    }
    // 3. check Azure configs
    if (hasAzureResourceV3(ctx.projectSetting) && envInfo.envName !== "local") {
      // ask common question and fill in solution config
      const solutionConfigRes = await fillInAzureConfigs(ctx, inputs, envInfo, ctx.tokenProvider);
      if (solutionConfigRes.isErr()) {
        return err(solutionConfigRes.error);
      }
      // ask for provision consent
      const consentResult = await askForProvisionConsent(
        ctx,
        ctx.tokenProvider.azureAccountProvider,
        envInfo
      );
      if (consentResult.isErr()) {
        return err(consentResult.error);
      }
      // create resource group if needed
      if (solutionConfig.needCreateResourceGroup) {
        const createRgRes = await resourceGroupHelper.createNewResourceGroup(
          solutionConfig.resourceGroupName,
          ctx.tokenProvider.azureAccountProvider,
          solutionConfig.subscriptionId,
          solutionConfig.location
        );
        if (createRgRes.isErr()) {
          return err(createRgRes.error);
        }
      }
    }
    return ok([]);
  }
}
