// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeployStepArgs } from "../../interface/buildAndDeployArgs";
import { AzureDeployDriver } from "./azureDeployDriver";
import { DeployExternalApiCallError } from "../../../error/deployError";
import { Service } from "typedi";
import { StepDriver } from "../../interface/stepDriver";
import { AzureResourceInfo, DriverContext } from "../../interface/commonArgs";
import { TokenCredential } from "@azure/core-http";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { wrapRun } from "../../../utils/common";

@Service("azureFunctions/deploy")
export class AzureFunctionDeployDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = new AzureFunctionDeployDriverImpl(args, context);
    return wrapRun(() => impl.run());
  }
}

/**
 * deploy to Azure Function
 */
export class AzureFunctionDeployDriverImpl extends AzureDeployDriver {
  pattern =
    /\/subscriptions\/([^\/]*)\/resourceGroups\/([^\/]*)\/providers\/Microsoft.Web\/sites\/([^\/]*)/i;

  async azureDeploy(
    args: DeployStepArgs,
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredential
  ): Promise<void> {
    await this.zipDeploy(args, azureResource, azureCredential);
    await this.restartFunctionApp(azureResource);
  }

  async restartFunctionApp(azureResource: AzureResourceInfo): Promise<void> {
    await this.context.logProvider.info("Restarting function app...");
    try {
      await this.managementClient?.webApps?.restart(
        azureResource.resourceGroupName,
        azureResource.instanceId
      );
    } catch (e) {
      throw DeployExternalApiCallError.restartWebAppError(e);
    }
  }
}
