// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import "reflect-metadata";
import { Service } from "typedi";
import * as path from "path";
import { ArmTemplateResult } from "../../common/armInterface";
import {
  BicepOrchestrationContent,
  generateArmFromResult,
  generateResourceBaseName,
  persistBicepTemplates,
} from "../../plugins/solution/fx-solution/arm";
import { Action, ContextV3, MaybePromise } from "./interface";

@Service("azure-bicep")
export class AzureBicepProvider {
  readonly type = "bicep";
  readonly name = "azure-bicep";
  generate(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-bicep.generate",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const azureBicepInputs = inputs["azure-bicep"];
        const resource = azureBicepInputs.resources[0];
        return ok([
          `ensure folder: ${path.join(inputs.projectPath, "templates", "azure")}`,
          `ensure folder: ${path.join(inputs.projectPath, "templates", "azure", "provision")}`,
          `ensure folder: ${path.join(inputs.projectPath, "templates", "azure", "teamsFx")}`,
          `create file: ${path.join(
            inputs.projectPath,
            "templates",
            "azure",
            "provision",
            `${resource}.bicep`
          )}`,
          `create file: ${path.join(
            inputs.projectPath,
            "templates",
            "azure",
            "teamsFx",
            `${resource}.bicep`
          )}`,
          `create file: ${path.join(inputs.projectPath, "templates", "azure", "config.bicep")}`,
          `create file: ${path.join(inputs.projectPath, "templates", "azure", "main.bicep")}`,
          `create file: ${path.join(inputs.projectPath, "templates", "azure", "provision.bicep")}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const azureBicepInputs = inputs["azure-bicep"];
        const resources = azureBicepInputs.resources as string[];
        const baseName = generateResourceBaseName(context.projectSetting.appName, "");
        const bicepOrchestrationTemplate = new BicepOrchestrationContent(resources, baseName);
        const moduleProvisionFiles = new Map<string, string>();
        const moduleConfigFiles = new Map<string, string>();
        const provisionOrchestration = await fs.readFile(
          path.join(__dirname, "bicep", "webApp.provision.orchestration.bicep"),
          "utf-8"
        );
        const provisionModules = await fs.readFile(
          path.join(__dirname, "bicep", "webApp.provision.module.bicep"),
          "utf-8"
        );
        const configOrchestration = await fs.readFile(
          path.join(__dirname, "bicep", "webApp.config.orchestration.bicep"),
          "utf-8"
        );
        const configModule = await fs.readFile(
          path.join(__dirname, "bicep", "webApp.config.module.bicep"),
          "utf-8"
        );
        for (const resource of resources) {
          const armTemplate: ArmTemplateResult = {
            Provision: {
              Orchestration: provisionOrchestration,
              Modules: { [resource]: provisionModules },
            },
            Configuration: {
              Orchestration: configOrchestration,
              Modules: { [resource]: configModule },
            },
          };
          generateArmFromResult(
            armTemplate,
            bicepOrchestrationTemplate,
            resource,
            moduleProvisionFiles,
            moduleConfigFiles
          );
        }
        const persistRes = await persistBicepTemplates(
          bicepOrchestrationTemplate,
          moduleProvisionFiles,
          moduleConfigFiles,
          inputs.projectPath
        );
        if (persistRes.isErr()) {
          return err(persistRes.error);
        }
        return ok(undefined);
      },
    };
    return ok(action);
  }
  update(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-bicep.update",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const azureBicepInputs = inputs["azure-bicep"];
        return ok([`update bicep for: ${azureBicepInputs.resources}`]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const azureBicepInputs = inputs["azure-bicep"];
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
      type: "function",
      name: "azure-bicep.deploy",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["deploy bicep"]);
      },
      execute: async (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        console.log("deploy bicep");
        inputs["azure-storage"] = {
          endpoint: "MockStorageEndpoint",
        };
        inputs["azure-web-app"] = {
          endpoint: "MockAzureWebAppEndpoint",
        };
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
