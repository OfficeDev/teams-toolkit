// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeployStepArgs } from "../../interface/buildAndDeployArgs";
import { AzureDeployDriver } from "./azureDeployDriver";
import { Service } from "typedi";
import { ExecutionResult, StepDriver } from "../../interface/stepDriver";
import { AzureResourceInfo, DriverContext } from "../../interface/commonArgs";
import { TokenCredential } from "@azure/core-http";
import { FxError, IProgressHandler, Result, UserInteraction } from "@microsoft/teamsfx-api";
import { wrapRun, wrapSummary } from "../../../utils/common";
import { ProgressMessages } from "../../../messages";
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../../constant/commonConstant";

const ACTION_NAME = "azureFunctions/deploy";

@Service(ACTION_NAME)
export class AzureFunctionDeployDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = new AzureFunctionDeployDriverImpl(args, context);
    return wrapRun(
      () => impl.run(),
      () => impl.cleanup(),
      context.logProvider
    );
  }

  execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    return wrapSummary(this.run.bind(this, args, ctx), [
      // eslint-disable-next-line no-secrets/no-secrets
      "driver.deploy.azureFunctionsDeploySummary",
    ]);
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
    await this.progressBar?.start();
    await this.zipDeploy(args, azureResource, azureCredential);
    await this.progressBar?.next(ProgressMessages.restartAzureFunctionApp);
    await this.restartFunctionApp(azureResource);
    await this.progressBar?.end(true);
  }

  createProgressBar(ui?: UserInteraction): IProgressHandler | undefined {
    return ui?.createProgressBar(
      `Deploying ${this.workingDirectory ?? ""} to Azure Function App`,
      6
    );
  }
}
