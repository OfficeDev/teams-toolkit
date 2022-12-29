// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeployStepArgs } from "../../interface/buildAndDeployArgs";
import { AzureDeployDriver } from "./azureDeployDriver";
import { ExecutionResult, StepDriver } from "../../interface/stepDriver";
import { Service } from "typedi";
import { DriverContext, AzureResourceInfo } from "../../interface/commonArgs";
import { TokenCredential } from "@azure/identity";
import { FxError, IProgressHandler, Result, UserInteraction } from "@microsoft/teamsfx-api";
import { checkMissingArgs, wrapRun, wrapSummary } from "../../../utils/common";
import { hooks } from "@feathersjs/hooks/lib";
import { addStartAndEndTelemetry } from "../../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../../constant/commonConstant";
import { DeployConstant } from "../../../constant/deployConstant";
import { getLocalizedMessage, ProgressMessages } from "../../../messages";
import { getLocalizedString } from "../../../../common/localizeUtils";

const ACTION_NAME = "azureAppService/deploy";

@Service(ACTION_NAME)
export class AzureAppServiceDeployDriver implements StepDriver {
  readonly description: string = getLocalizedString(
    "driver.deploy.deployToAzureAppServiceDescription"
  );
  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = new AzureAppServiceDeployDriverImpl(args, context);
    return wrapRun(
      () => impl.run(),
      () => impl.cleanup(),
      context.logProvider
    );
  }

  execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    return wrapSummary(this.run.bind(this, args, ctx), [
      "driver.deploy.azureAppServiceDeploySummary",
    ]);
  }
}

export class AzureAppServiceDeployDriverImpl extends AzureDeployDriver {
  pattern =
    /\/subscriptions\/([^\/]*)\/resourceGroups\/([^\/]*)\/providers\/Microsoft.Web\/sites\/([^\/]*)/i;
  protected helpLink = "https://aka.ms/teamsfx-actions/azure-app-service-deploy";

  async azureDeploy(
    args: DeployStepArgs,
    azureResource?: AzureResourceInfo,
    azureCredential?: TokenCredential
  ): Promise<void> {
    await this.progressBar?.start();
    const cost = await this.zipDeploy(args, azureResource, azureCredential);
    await this.progressBar?.next(ProgressMessages.restartAzureService);
    await this.restartFunctionApp(checkMissingArgs("azureResource", azureResource));
    await this.progressBar?.end(true);
    if (cost > DeployConstant.DEPLOY_OVER_TIME) {
      await this.context.logProvider?.info(
        getLocalizedMessage(
          "driver.deploy.notice.deployAcceleration",
          "https://aka.ms/teamsfx-config-run-from-package"
        ).localized
      );
    }
  }

  createProgressBar(ui?: UserInteraction): IProgressHandler | undefined {
    return ui?.createProgressBar(
      `Deploying ${this.workingDirectory ?? ""} to Azure App Service`,
      6
    );
  }
}
