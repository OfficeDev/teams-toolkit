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
import { hooks } from "@feathersjs/hooks/lib";
import { addStartAndEndTelemetry } from "../../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../../constant/commonConstant";
import { DeployConstant } from "../../../constant/deployConstant";
import { getLocalizedMessage, ProgressMessages } from "../../../messages";

const ACTION_NAME = "azureAppService/deploy";

@Service(ACTION_NAME)
export class AzureAppServiceDeployDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = new AzureAppServiceDeployDriverImpl(args, context);
    return wrapRun(
      () => impl.run(),
      () => impl.cleanup(),
      context.logProvider
    );
  }
}

export class AzureAppServiceDeployDriverImpl extends AzureDeployDriver {
  progressBarName = `Deploying ${this.workingDirectory ?? ""} to Azure App Service`;
  progressBarSteps = 6;
  pattern =
    /\/subscriptions\/([^\/]*)\/resourceGroups\/([^\/]*)\/providers\/Microsoft.Web\/sites\/([^\/]*)/i;

  async azureDeploy(
    args: DeployStepArgs,
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredential
  ): Promise<void> {
    await this.progressBar?.start();
    const cost = await this.zipDeploy(args, azureResource, azureCredential);
    await this.progressBar?.next(ProgressMessages.restartAzureService);
    await this.restartFunctionApp(azureResource);
    await this.progressBar?.end(true);
    if (cost > DeployConstant.DEPLOY_OVER_TIME) {
      await this.context.logProvider?.info(
        getLocalizedMessage(
          "driver.deploy.notice.deployAcceleration",
          "https://learn.microsoft.com/en-us/azure/app-service/deploy-run-package"
        ).localized
      );
    }
  }
}
