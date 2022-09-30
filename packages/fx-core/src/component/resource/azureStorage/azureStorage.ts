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
import fs from "fs-extra";
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
import { Progress } from "./messages";

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
        inputs.componentId,
        ctx.tokenProvider.azureAccountProvider
      );
      const client = new AzureStorageClient(config);
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
    const deployDir = path.resolve(inputs.projectPath, inputs.folder);
    const config = await StorageConfig.fromEnvInfo(
      ctx.envInfo,
      inputs.componentId,
      ctx.tokenProvider.azureAccountProvider
    );
    const client = new AzureStorageClient(config);
    const envName = ctx.envInfo.envName;
    await this.doDeployment(client, deployDir, envName, actionContext?.progressBar);
    return ok(undefined);
  }

  private async doDeployment(
    client: AzureStorageClient,
    componentPath: string,
    envName: string,
    progress?: IProgressHandler
  ): Promise<void> {
    const needDeploy = await FrontendDeployment.needDeploy(componentPath, envName);
    if (!needDeploy) {
      await progress?.next(ProgressMessages.getDeploymentSrcAndDest);
      await progress?.next(ProgressMessages.clearStorageAccount);
      await progress?.next(ProgressMessages.uploadTabToStorage);
      return;
    }

    await progress?.next(ProgressMessages.getDeploymentSrcAndDest);
    const builtPath = await this.getBuiltPath(componentPath);
    const container = await client.getContainer(StorageConstants.azureStorageWebContainer);

    await progress?.next(ProgressMessages.clearStorageAccount);
    await client.deleteAllBlobs(container);

    await progress?.next(ProgressMessages.uploadTabToStorage);
    await client.uploadFiles(container, builtPath);
    await FrontendDeployment.saveDeploymentInfo(componentPath, envName, {
      lastDeployTime: new Date().toISOString(),
    });
  }

  private async getBuiltPath(componentPath: string): Promise<string> {
    const builtPath = path.join(componentPath, PathConstants.nodeArtifactFolder);
    const pathExists = await fs.pathExists(builtPath);
    if (!pathExists) {
      throw new Error();
    }
    return builtPath;
  }
}
