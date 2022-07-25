// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  AzureAccountProvider,
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  IProgressHandler,
  MaybePromise,
  ok,
  ProvisionContextV3,
  Result,
  UserError,
  v3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import * as path from "path";
import { FrontendConfig } from "../../plugins/resource/frontend/configs";
import {
  getResourceGroupNameFromResourceId,
  getStorageAccountNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../common/tools";
import { UnauthenticatedError } from "../../plugins/resource/frontend/v3/error";
import { AzureStorageClient } from "../../plugins/resource/frontend/clients";
import { FrontendDeployment } from "../../plugins/resource/frontend/ops/deploy";
import { AzureResource } from "./azureResource";
import { FrontendPluginInfo } from "../../plugins/resource/frontend/constants";
import { ComponentNames, StorageOutputs } from "../constants";
import { Plans, ProgressMessages, ProgressTitles } from "../messages";
@Service("azure-storage")
export class AzureStorageResource extends AzureResource {
  readonly name = "azure-storage";
  readonly bicepModuleName = "azureStorage";
  readonly outputs = StorageOutputs;
  readonly finalOutputKeys = ["domain", "endpoint", "resourceId", "indexPath"];
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-storage.configure",
      type: "function",
      enableTelemetry: true,
      telemetryComponentName: FrontendPluginInfo.PluginName,
      telemetryEventName: "deploy",
      errorSource: FrontendPluginInfo.ShortName,
      errorIssueLink: FrontendPluginInfo.IssueLink,
      errorHelpLink: FrontendPluginInfo.HelpLink,
      enableProgressBar: true,
      progressTitle: ProgressTitles.configureStorage,
      progressSteps: 1,
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([Plans.enableStaticWebsite()]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath,
        progress?: IProgressHandler
      ) => {
        const ctx = context as ProvisionContextV3;
        const frontendConfigRes = await buildFrontendConfig(
          ctx.envInfo,
          ComponentNames.TeamsTab,
          ctx.tokenProvider.azureAccountProvider
        );
        if (frontendConfigRes.isErr()) {
          return err(frontendConfigRes.error);
        }
        progress?.next(ProgressMessages.enableStaticWebsite);
        const client = new AzureStorageClient(frontendConfigRes.value);
        await client.enableStaticWebsite();
        return ok([Plans.enableStaticWebsite()]);
      },
    };
    return ok(action);
  }
  deploy(): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-storage.deploy",
      type: "function",
      enableTelemetry: true,
      telemetryComponentName: FrontendPluginInfo.PluginName,
      telemetryEventName: "deploy",
      errorSource: FrontendPluginInfo.ShortName,
      errorIssueLink: FrontendPluginInfo.IssueLink,
      errorHelpLink: FrontendPluginInfo.HelpLink,
      enableProgressBar: true,
      progressTitle: ProgressTitles.deployingStorage,
      progressSteps: 3,
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const deployDir = path.resolve(inputs.projectPath, inputs.folder);
        return ok([Plans.deploy("Azure Storage", deployDir)]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath,
        progress?: IProgressHandler
      ) => {
        const ctx = context as ProvisionContextV3;
        const deployDir = path.resolve(inputs.projectPath, inputs.folder);
        const frontendConfigRes = await buildFrontendConfig(
          ctx.envInfo,
          ComponentNames.TeamsTab,
          ctx.tokenProvider.azureAccountProvider
        );
        if (frontendConfigRes.isErr()) {
          return err(frontendConfigRes.error);
        }
        const client = new AzureStorageClient(frontendConfigRes.value);
        const envName = ctx.envInfo.envName;
        await FrontendDeployment.doFrontendDeploymentV3(client, deployDir, envName, progress);
        return ok([Plans.deploy("Azure Storage", deployDir)]);
      },
    };
    return ok(action);
  }
}

async function buildFrontendConfig(
  envInfo: v3.EnvInfoV3,
  scenario: string,
  tokenProvider: AzureAccountProvider
): Promise<Result<FrontendConfig, FxError>> {
  const credentials = await tokenProvider.getAccountCredentialAsync();
  if (!credentials) {
    return err(new UnauthenticatedError());
  }
  const storage = envInfo.state[scenario];
  const resourceId = storage?.storageResourceId;
  if (!resourceId) {
    return err(
      new UserError({
        source: "azure-storage",
        name: "StateValueMissingError",
        message: "Missing resourceId for storage",
      })
    );
  }
  const frontendConfig = new FrontendConfig(
    getSubscriptionIdFromResourceId(resourceId),
    getResourceGroupNameFromResourceId(resourceId),
    (envInfo.state.solution as v3.AzureSolutionConfig).location,
    getStorageAccountNameFromResourceId(resourceId),
    credentials
  );
  return ok(frontendConfig);
}
