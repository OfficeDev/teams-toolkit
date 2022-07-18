// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  AzureAccountProvider,
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
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
import { getHostingParentComponent } from "../workflow";
import { FrontendPluginInfo } from "../../plugins/resource/frontend/constants";
@Service("azure-storage")
export class AzureStorageResource extends AzureResource {
  readonly name = "azure-storage";
  readonly bicepModuleName = "azureStorage";
  readonly outputs = {
    endpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.endpoint",
    },
    storageResourceId: {
      key: "storageResourceId",
      bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.storageResourceId",
    },
    domain: {
      key: "domain",
      bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.domain",
    },
    indexPath: {
      key: "indexPath",
      bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.indexPath",
    },
  };
  readonly finalOutputKeys = ["domain", "endpoint", "resourceId", "indexPath"];
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-storage.configure",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: "configure azure storage (enable static web site)",
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const parent = getHostingParentComponent(ctx.projectSetting, this.name);
        if (!parent) {
          throw new Error("Hosting component no parent");
        }
        const frontendConfigRes = await buildFrontendConfig(
          ctx.envInfo,
          parent.name,
          ctx.tokenProvider.azureAccountProvider
        );
        if (frontendConfigRes.isErr()) {
          return err(frontendConfigRes.error);
        }
        const client = new AzureStorageClient(frontendConfigRes.value);
        await client.enableStaticWebsite();
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: "configure azure storage (enable static web site)",
          },
        ]);
      },
    };
    return ok(action);
  }
  deploy(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-storage.deploy",
      type: "function",
      enableTelemetry: true,
      telemetryComponentName: FrontendPluginInfo.PluginName,
      telemetryEventName: "deploy",
      errorSource: FrontendPluginInfo.ShortName,
      errorIssueLink: FrontendPluginInfo.IssueLink,
      errorHelpLink: FrontendPluginInfo.HelpLink,
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const parent = getHostingParentComponent(
          context.projectSetting,
          this.name,
          inputs.scenario
        );
        const deployDir = path.resolve(inputs.projectPath, parent?.folder ?? "");
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy azure storage with path: ${deployDir}`,
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const parent = getHostingParentComponent(ctx.projectSetting, this.name);
        if (!parent?.folder) {
          throw new Error("parent component not found for azure-storage");
        }
        const deployDir = path.resolve(inputs.projectPath, parent.folder);
        const frontendConfigRes = await buildFrontendConfig(
          ctx.envInfo,
          parent.name,
          ctx.tokenProvider.azureAccountProvider
        );
        if (frontendConfigRes.isErr()) {
          return err(frontendConfigRes.error);
        }
        const client = new AzureStorageClient(frontendConfigRes.value);
        const envName = ctx.envInfo.envName;
        await FrontendDeployment.doFrontendDeploymentV3(client, deployDir, envName);
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy azure storage with path: ${deployDir}`,
          },
        ]);
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
