// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../common/armInterface";
import arm, {
  BicepOrchestrationContent,
  generateArmFromResult,
  generateResourceBaseName,
  persistBicepTemplates,
} from "../../plugins/solution/fx-solution/arm";
import { Action, ContextV3, MaybePromise } from "./interface";
import * as path from "path";
import { appendContentInFilePlan, ensureFilePlan } from "./utils";

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
      plan: async (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const plans: string[] = [];
        const templateFolder = path.join(inputs.projectPath, "templates", "azure");
        let plan = await ensureFilePlan(path.join(templateFolder, "main.bicep"), false);
        if (plan) plans.push(plan);
        const bicepOutputs = context.bicep;
        if (bicepOutputs) {
          const resources = Object.keys(bicepOutputs);
          for (const resource of resources) {
            const arm = bicepOutputs[resource] as ArmTemplateResult;
            if (arm.Provision) {
              if (arm.Provision.Modules) {
                for (const module of Object.keys(arm.Provision.Modules)) {
                  plan = await ensureFilePlan(
                    path.join(templateFolder, "provision", `${module}.bicep`),
                    true
                  );
                  if (plan) plans.push(plan);
                }
              }
              if (arm.Provision.Orchestration) {
                plan = await appendContentInFilePlan(
                  path.join(templateFolder, `provision.bicep`),
                  "provision orchestration"
                );
                plans.push(plan);
              }
            }
            if (arm.Configuration) {
              if (arm.Configuration.Modules) {
                for (const module of Object.keys(arm.Configuration.Modules)) {
                  plan = await ensureFilePlan(
                    path.join(templateFolder, "teamsFx", `${module}.bicep`),
                    true
                  );
                  if (plan) plans.push(plan);
                }
              }
              if (arm.Configuration.Orchestration) {
                plan = await appendContentInFilePlan(
                  path.join(templateFolder, "config.bicep"),
                  "config orchestration"
                );
                plans.push(plan);
              }
            }
          }
        }
        return ok(plans);
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
