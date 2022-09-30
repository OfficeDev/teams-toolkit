// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeployStepArgs } from "../interface/buildAndDeployArgs";
import { AzureDeployDriver } from "./azureDeployDriver";
import { StepDriver } from "../interface/stepDriver";
import { Service } from "typedi";
import { DriverContext, AzureResourceInfo } from "../interface/commonArgs";
import { TokenCredential } from "@azure/identity";

@Service("azureAppService/deploy")
export class AzureAppServiceDeployDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Map<string, string>> {
    const impl = new AzureAppServiceDeployDriverImpl(args, context);
    return await impl.run();
  }
}

export class AzureAppServiceDeployDriverImpl extends AzureDeployDriver {
  pattern =
    /\/subscriptions\/([^\/]*)\/resourceGroups\/([^\/]*)\/providers\/Microsoft.Web\/serverFarms\/([^\/]*)/i;

  async azureDeploy(
    args: DeployStepArgs,
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredential
  ): Promise<void> {
    await this.zipDeploy(args, azureResource, azureCredential);
  }
}
