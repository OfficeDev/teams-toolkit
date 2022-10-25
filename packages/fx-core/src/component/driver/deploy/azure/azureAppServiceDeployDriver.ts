// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeployStepArgs } from "../../interface/buildAndDeployArgs";
import { AzureDeployDriver } from "./azureDeployDriver";
import { StepDriver } from "../../interface/stepDriver";
import { Service } from "typedi";
import { DriverContext, AzureResourceInfo } from "../../interface/commonArgs";
import { TokenCredential } from "@azure/identity";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { wrapRun } from "../../../utils/common";

@Service("azureAppService/deploy")
export class AzureAppServiceDeployDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = new AzureAppServiceDeployDriverImpl(args, context);
    return wrapRun(
      () => impl.run(),
      () => impl.cleanup()
    );
  }
}

export class AzureAppServiceDeployDriverImpl extends AzureDeployDriver {
  progressBarName = `Deploying ${this.workingDirectory ?? ""} to Azure App Service`;
  progressBarSteps = 5;
  pattern =
    /\/subscriptions\/([^\/]*)\/resourceGroups\/([^\/]*)\/providers\/Microsoft.Web\/serverFarms\/([^\/]*)/i;

  async azureDeploy(
    args: DeployStepArgs,
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredential
  ): Promise<void> {
    await this.progressBar?.start();
    await this.zipDeploy(args, azureResource, azureCredential);
    await this.progressBar?.end(true);
  }
}
