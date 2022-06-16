// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  AzureAccountProvider,
  Bicep,
  CloudResource,
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
import { ComponentNames } from "../constants";
import {
  getResourceGroupNameFromResourceId,
  getStorageAccountNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../common/tools";
import { UnauthenticatedError } from "../../plugins/resource/frontend/v3/error";
import { AzureStorageClient } from "../../plugins/resource/frontend/clients";
import { FrontendDeployment } from "../../plugins/resource/frontend/ops/deploy";
@Service("azure-storage")
export class AzureStorageResource implements CloudResource {
  readonly name = "azure-storage";
  readonly outputs = {
    endpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureStorageOutput.value.endpoint",
    },
    resourceId: {
      key: "resourceId",
      bicepVariable: "provisionOutputs.azureStorageOutput.value.resourceId",
    },
    location: {
      key: "location",
      bicepVariable: "provisionOutputs.azureStorageOutput.value.location",
    },
  };
  readonly finalOutputKeys = ["endpoint"];
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-sql.generateBicep",
      type: "function",
      plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const bicep: Bicep = {
          type: "bicep",
          Provision: {
            Modules: { azureStorage: "1" },
          },
        };
        return ok([bicep]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const bicep: Bicep = {
          type: "bicep",
          Provision: {
            Modules: { azureStorage: "1" },
          },
        };
        return ok([bicep]);
      },
    };
    return ok(action);
  }
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
        const deployDir = path.join(inputs.projectPath, inputs.folder);
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
        const deployDir = path.join(inputs.projectPath, inputs.folder);
        const frontendConfigRes = await buildFrontendConfig(
          ctx.envInfo,
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
  tokenProvider: AzureAccountProvider
): Promise<Result<FrontendConfig, FxError>> {
  const credentials = await tokenProvider.getAccountCredentialAsync();
  if (!credentials) {
    return err(new UnauthenticatedError());
  }
  const storage = envInfo.state[ComponentNames.AzureStorage];
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
