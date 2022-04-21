// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../common/armInterface";
import { getTemplatesFolder } from "../../folder";
import { Action, CloudResource, ContextV3, MaybePromise } from "./interface";
@Service("azure-web-app")
export class AzureWebAppResource implements CloudResource {
  readonly name = "azure-web-app";
  generateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["generate azure-web-app bicep"]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const armTemplate: ArmTemplateResult = {
          Provision: {
            Modules: {},
          },
          Configuration: {},
          Reference: {
            resourceId: "provisionOutputs.azureWebAppOutput.value.resourceId",
            hostName: "provisionOutputs.azureWebAppOutput.value.domain",
            endpoint: "provisionOutputs.azureWebAppOutput.value.endpoint",
          },
        };
        {
          const filePath = path.join(
            getTemplatesFolder(),
            "demo",
            "azureWebApp.provision.module.bicep"
          );
          if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, "utf-8");
            armTemplate.Provision!.Modules!["azureWebApp"] = content;
          }
        }
        {
          const filePath = path.join(
            getTemplatesFolder(),
            "demo",
            "azureWebApp.provision.orchestration.bicep"
          );
          if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, "utf-8");
            armTemplate.Provision!.Orchestration = content;
          }
        }
        if (!context.bicep) context.bicep = {};
        context.bicep["azure-web-app"] = armTemplate;
        return ok(undefined);
      },
    };
    return ok(action);
  }
  updateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app.updateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["update azure-web-app bicep"]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const armTemplate: ArmTemplateResult = {
          Reference: {
            resourceId: "provisionOutputs.azureWebAppOutput.value.resourceId",
            hostName: "provisionOutputs.azureWebAppOutput.value.domain",
            endpoint: "provisionOutputs.azureWebAppOutput.value.endpoint",
          },
        };
        if (!context.bicep) context.bicep = {};
        context.bicep["azure-web-app"] = armTemplate;
        return ok(undefined);
      },
    };
    return ok(action);
  }
  deploy(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app.deploy",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok([
          `deploy azure web app in folder: ${path.join(
            inputs.projectPath,
            inputs["azure-web-app"].folder
          )}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
