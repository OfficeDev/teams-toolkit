// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureResourceInfo, DeployStepArgs, DriverContext } from "../interface/buildAndDeployArgs";
import { AzureDeployDriver } from "./azureDeployDriver";
import { DeployExternalApiCallError } from "../error/deployError";
import { AxiosResponseWithStatusResult } from "../../common/azure-hosting/interfaces";
import { Service } from "typedi";
import { StepDriver } from "../interface/stepDriver";
import { TokenCredential } from "@azure/identity";

@Service("deploy/azureFunction")
export class AzureFunctionDeployDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Map<string, string>> {
    const impl = new AzureFunctionDeployDriverImpl(args, context);
    return await impl.run();
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
