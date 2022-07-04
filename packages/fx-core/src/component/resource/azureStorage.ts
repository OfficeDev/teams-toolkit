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
@Service("azure-storage")
export class AzureStorageResource extends AzureResource {
  readonly name = "azure-storage";
  readonly bicepModuleName = "azureStorage";
  readonly outputs = {
    endpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureStorage{{componentName}}Output.value.endpoint",
    },
    resourceId: {
      key: "resourceId",
      bicepVariable: "provisionOutputs.azureStorage{{componentName}}Output.value.resourceId",
    },
    domain: {
      key: "domain",
      bicepVariable: "provisionOutputs.azureStorage{{componentName}}Output.value.domain",
    },
    indexPath: {
      key: "indexPath",
      bicepVariable: "provisionOutputs.azureStorage{{componentName}}Output.value.indexPath",
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
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const deployDir = path.join(inputs.projectPath, inputs.code.folder);
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
          throw new Error("");
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
  componentName: string,
  tokenProvider: AzureAccountProvider
): Promise<Result<FrontendConfig, FxError>> {
  const credentials = await tokenProvider.getAccountCredentialAsync();
  if (!credentials) {
    return err(new UnauthenticatedError());
  }
  const storage = envInfo.state[componentName];
  const resourceId = storage?.resourceId;
  if (!resourceId) {
    return err(
      new UserError({
        source: "azure-storage",
        name: "StateValueMissingError",
        message: "Missing resourceIf for storage",
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
