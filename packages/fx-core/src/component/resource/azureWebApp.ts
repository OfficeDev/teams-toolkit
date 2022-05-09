// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Action,
  Bicep,
  CloudResource,
  ContextV3,
  MaybePromise,
  InputsWithProjectPath,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { getTemplatesFolder } from "../../folder";
import { persistProvisionBicepPlans } from "../bicepUtils";
@Service("azure-web-app")
export class AzureWebAppResource implements CloudResource {
  readonly name = "azure-web-app";
  readonly outputs = {
    resourceId: {
      key: "resourceId",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.resourceId",
    },
    hostName: {
      key: "hostName",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.domain",
    },
    endpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.endpoint",
    },
  };
  readonly finalOutputKeys = ["resourceId", "endpoint"];
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const plans = persistProvisionBicepPlans(inputs.projectPath, {
          Modules: { azureWebApp: "1" },
          Orchestration: "1",
        });
        return ok(plans);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<Bicep, FxError>> => {
        const pmPath = path.join(
          getTemplatesFolder(),
          "bicep",
          "azureWebApp.provision.module.bicep"
        );
        const poPath = path.join(
          getTemplatesFolder(),
          "bicep",
          "azureWebApp.provision.orchestration.bicep"
        );
        const provisionModule = await fs.readFile(pmPath, "utf-8");
        const ProvisionOrch = await fs.readFile(poPath, "utf-8");
        const armTemplate: Bicep = {
          Provision: {
            Modules: { azureWebApp: provisionModule },
            Orchestration: ProvisionOrch,
          },
        };
        return ok(armTemplate);
      },
    };
    return ok(action);
  }
  deploy(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app.deploy",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          `deploy azure web app in folder: ${path.join(
            inputs.projectPath,
            inputs["azure-web-app"].folder
          )}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
