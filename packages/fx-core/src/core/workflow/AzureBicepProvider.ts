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
import { compileHandlebarsTemplateString } from "../../common/tools";
import { camelCase } from "lodash";

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
        const resource = azureBicepInputs.resource as string;
        const outputPath = path.join(
          inputs.projectPath,
          "templates",
          "azure",
          `${resource}.provision.bicep`
        );
        return ok([
          `ensure folder: ${path.join(inputs.projectPath, "templates", "azure")}`,
          `create file: ${outputPath}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const azureBicepInputs = inputs["azure-bicep"];
        const resource = azureBicepInputs.resource as string;
        const baseName = generateResourceBaseName(context.projectSetting.appName, "");
        const bicepOrchestrationTemplate = new BicepOrchestrationContent([resource], baseName);
        const moduleProvisionFiles = new Map<string, string>();
        const moduleConfigFiles = new Map<string, string>();
        const armTemplate: ArmTemplateResult = {};
        {
          const filePath = path.join(
            __dirname,
            "bicep",
            `${camelCase(resource)}.provision.orchestration.bicep`
          );
          if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, "utf-8");
            armTemplate.Provision = armTemplate.Provision || {};
            armTemplate.Provision.Orchestration = content;
          }
        }

        {
          const filePath = path.join(
            __dirname,
            "bicep",
            `${camelCase(resource)}.provision.module.bicep`
          );
          if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, "utf-8");
            armTemplate.Provision = armTemplate.Provision || {};
            armTemplate.Provision.Modules[resource] = content;
          }
        }

        const provisionOrchestration = await fs.readFile(
          path.join(__dirname, "bicep", `${camelCase(resource)}.provision.orchestration.bicep`),
          "utf-8"
        );
        const provisionModules = await fs.readFile(
          path.join(__dirname, "bicep", `${camelCase(resource)}.provision.module.bicep`),
          "utf-8"
        );
        const configOrchestration = await fs.readFile(
          path.join(__dirname, "bicep", `${camelCase(resource)}.config.orchestration.bicep`),
          "utf-8"
        );
        const configModule = await fs.readFile(
          path.join(__dirname, "bicep", `${camelCase(resource)}.config.module.bicep`),
          "utf-8"
        );
        // const armTemplate: ArmTemplateResult = {
        //   Provision: {
        //     Orchestration: provisionOrchestration,
        //     Modules: { [resource]: provisionModules },
        //   },
        //   Configuration: {
        //     Orchestration: configOrchestration,
        //     Modules: { [resource]: configModule },
        //   },
        // };
        generateArmFromResult(
          armTemplate,
          bicepOrchestrationTemplate,
          resource,
          moduleProvisionFiles,
          moduleConfigFiles
        );
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
        const deployInputs = inputs["azure-bicep"];
        return ok([`deploy bicep, ${JSON.stringify(deployInputs)}`]);
      },
      execute: async (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const deployInputs = inputs["azure-bicep"];
        console.log(`deploy bicep, ${JSON.stringify(deployInputs)}`);
        inputs["azure-web-app"] = {
          endpoint: "MockAzureWebAppEndpoint",
        };
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
