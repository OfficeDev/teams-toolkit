// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureResourceInfo, DeployStepArgs, DriverContext } from "../interface/buildAndDeployArgs";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { AzureDeployDriver } from "./azureDeployDriver";
import { DeployExternalApiCallError } from "../error/deployError";
import { AxiosResponseWithStatusResult } from "../../common/azure-hosting/interfaces";
import { Service } from "typedi";
import { StepDriver } from "../interface/stepDriver";

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
    azureCredential: TokenCredentialsBase
  ): Promise<void> {
    await this.zipDeploy(args, azureResource, azureCredential);
    await this.restartFunctionApp(azureResource);
  }

  async restartFunctionApp(azureResource: AzureResourceInfo): Promise<void> {
    await this.context.logProvider.info("Restarting function app...");
    let res: AxiosResponseWithStatusResult | undefined;
    try {
      res = await this.managementClient?.webApps?.restart(
        azureResource.resourceGroupName,
        azureResource.instanceId
      );
    } catch (e) {
      throw DeployExternalApiCallError.restartWebAppError(e);
    }
    if (!res || res?._response.status !== 200) {
      throw DeployExternalApiCallError.restartWebAppError(res);
    }
  }
}
