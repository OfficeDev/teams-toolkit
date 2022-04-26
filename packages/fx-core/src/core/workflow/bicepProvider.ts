// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../common/armInterface";
import {
  BicepOrchestrationContent,
  generateArmFromResult,
  generateResourceBaseName,
  persistBicepTemplates,
} from "../../plugins/solution/fx-solution/arm";
import { Action, ContextV3, MaybePromise } from "./interface";

@Service("bicep")
export class BicepProvider {
  readonly type = "bicep";
  readonly name = "bicep";
  persist(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bicep.persist",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["persist bicep"]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const bicepOutputs = context.bicep;
        if (bicepOutputs) {
          const resourceNames = Object.keys(bicepOutputs);
          const baseName = generateResourceBaseName(context.projectSetting.appName, "");
          const bicepOrchestrationTemplate = new BicepOrchestrationContent(resourceNames, baseName);
          const moduleProvisionFiles = new Map<string, string>();
          const moduleConfigFiles = new Map<string, string>();
          for (const resource of resourceNames) {
            const armTemplate = bicepOutputs[resource];
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
        }
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
        const deployInputs = inputs["bicep"];
        return ok([`deploy bicep, ${JSON.stringify(deployInputs)}`]);
      },
      execute: async (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const deployInputs = inputs["bicep"];
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
