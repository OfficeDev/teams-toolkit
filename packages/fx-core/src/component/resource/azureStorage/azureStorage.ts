// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ActionContext,
  FxError,
  InputsWithProjectPath,
  IProgressHandler,
  ok,
  ResourceContextV3,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import * as path from "path";
import { AzureResource } from "../azureResource";
import { ComponentNames, PathConstants, Scenarios, StorageOutputs } from "../../constants";
import { LogMessages, ProgressMessages, ProgressTitles } from "../../messages";
import { hooks } from "@feathersjs/hooks/lib";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { errorSource, StorageConstants } from "./constants";
import { StorageConfig } from "./configs";
import { AzureStorageClient } from "./clients";
import { FrontendDeployment } from "../../code/tab/deploy";
import { Messages, Progress } from "./messages";
import { TelemetryEvent, TelemetryProperty } from "../../../common/telemetry";

@Service("azure-storage")
export class AzureStorageResource extends AzureResource {
  readonly name = "azure-storage";
  readonly bicepModuleName = "azureStorage";
  readonly outputs = StorageOutputs;
  readonly finalOutputKeys = ["domain", "endpoint", "storageResourceId", "indexPath"];
  @hooks([
    ActionExecutionMW({
      errorSource: errorSource,
      errorHelpLink: StorageConstants.helpLink,
      enableProgressBar: true,
      progressTitle: ProgressTitles.configureStorage,
      progressSteps: 1,
    }),
  ])
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const ctx = context as ResourceContextV3;
    if (context.envInfo.envName !== "local") {
      context.logProvider.info(LogMessages.enableStaticWebsite);
      await actionContext?.progressBar?.next(ProgressMessages.enableStaticWebsite);
      const config = await StorageConfig.fromEnvInfo(
        ctx.envInfo,
        ComponentNames.TeamsTab,
        ctx.tokenProvider.azureAccountProvider
      );
      const client = new AzureStorageClient(config, context.logProvider);
      await client.enableStaticWebsite();
    } else {
      await actionContext?.progressBar?.next("");
    }
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      errorSource: errorSource,
      errorHelpLink: StorageConstants.helpLink,
      enableProgressBar: true,
      progressTitle: ProgressTitles.deploying(ComponentNames.AzureStorage, Scenarios.Tab),
      progressSteps: Progress.length,
    }),
  ])
  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const ctx = context as ResourceContextV3;
    const deployDir = path.resolve(inputs.projectPath, inputs.artifactFolder);
    const config = await StorageConfig.fromEnvInfo(
      ctx.envInfo,
      inputs.componentId,
      ctx.tokenProvider.azureAccountProvider
    );
    const client = new AzureStorageClient(config, context.logProvider);
    const envName = ctx.envInfo.envName;
    const needDeploy = await FrontendDeployment.needDeploy(
      path.join(inputs.projectPath, PathConstants.tabWorkingDir),
      envName
    );
    if (!needDeploy) {
      await this.skipDeploy(context, actionContext);
      return ok(undefined);
    }
    await this.doDeployment(client, deployDir, actionContext?.progressBar);
    await FrontendDeployment.saveDeploymentInfo(
      path.join(inputs.projectPath, PathConstants.tabWorkingDir),
      envName,
      { lastDeployTime: new Date().toISOString() }
    );
    return ok(undefined);
  }

  private async doDeployment(
    client: AzureStorageClient,
    deployDir: string,
    progress?: IProgressHandler
  ): Promise<void> {
    await progress?.next(ProgressMessages.getDeploymentSrcAndDest);
    const container = await client.getContainer(StorageConstants.azureStorageWebContainer);

    await progress?.next(ProgressMessages.clearStorageAccount);
    await client.deleteAllBlobs(container);

    await progress?.next(ProgressMessages.uploadTabToStorage);
    await client.uploadFiles(container, deployDir);
  }

  private async skipDeploy(
    context: ResourceContextV3,
    actionContext?: ActionContext
  ): Promise<void> {
    context.logProvider.warning(Messages.SkipDeploy);
    context.telemetryReporter.sendTelemetryEvent(TelemetryEvent.SkipDeploy, {
      [TelemetryProperty.Component]: ComponentNames.AzureStorage,
    });
    await actionContext?.progressBar?.next(ProgressMessages.getDeploymentSrcAndDest);
    await actionContext?.progressBar?.next(ProgressMessages.clearStorageAccount);
    await actionContext?.progressBar?.next(ProgressMessages.uploadTabToStorage);
  }
}
