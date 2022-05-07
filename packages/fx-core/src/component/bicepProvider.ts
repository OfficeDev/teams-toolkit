// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  MaybePromise,
  FxError,
  ok,
  Result,
  InputsWithProjectPath,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { getTemplatesFolder } from "../folder";
import { ensureFilePlan } from "./workflow";
@Service("bicep")
export class BicepProvider {
  readonly type = "bicep";
  readonly name = "bicep";
  init(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bicep.init",
      type: "function",
      plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const plans: string[] = [];
        const templateFolder = path.join(inputs.projectPath, "templates", "azure");
        if (
          (await fs.pathExists(path.join(templateFolder, "main.bicep"))) &&
          (await fs.pathExists(path.join(templateFolder, "provision.bicep"))) &&
          (await fs.pathExists(path.join(templateFolder, "config.bicep")))
        )
          return ok(plans);
        let plan = ensureFilePlan(path.join(templateFolder, "main.bicep"));
        if (plan) plans.push(plan);
        plan = ensureFilePlan(path.join(templateFolder, "provision.bicep"));
        if (plan) plans.push(plan);
        plan = ensureFilePlan(path.join(templateFolder, "config.bicep"));
        if (plan) plans.push(plan);
        return ok(plans);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<any, FxError>> => {
        const sourceTemplateFolder = path.join(getTemplatesFolder(), "core", "bicep");
        const targetTemplateFolder = path.join(inputs.projectPath, "templates", "azure");
        if (
          (await fs.pathExists(path.join(targetTemplateFolder, "main.bicep"))) &&
          (await fs.pathExists(path.join(targetTemplateFolder, "provision.bicep"))) &&
          (await fs.pathExists(path.join(targetTemplateFolder, "config.bicep")))
        )
          return ok(undefined);
        await fs.ensureDir(targetTemplateFolder);
        await fs.ensureDir(path.join(targetTemplateFolder, "provision"));
        await fs.ensureDir(path.join(targetTemplateFolder, "teamsFx"));
        if (!(await fs.pathExists(path.join(targetTemplateFolder, "main.bicep")))) {
          await fs.copyFile(
            path.join(sourceTemplateFolder, "main.bicep"),
            path.join(targetTemplateFolder, "main.bicep")
          );
        }
        if (!(await fs.pathExists(path.join(targetTemplateFolder, "provision.bicep")))) {
          await fs.copyFile(
            path.join(sourceTemplateFolder, "provision.bicep"),
            path.join(targetTemplateFolder, "provision.bicep")
          );
        }
        if (!(await fs.pathExists(path.join(targetTemplateFolder, "config.bicep")))) {
          await fs.copyFile(
            path.join(sourceTemplateFolder, "config.bicep"),
            path.join(targetTemplateFolder, "config.bicep")
          );
        }
        return ok(undefined);
      },
    };
    return ok(action);
  }
  deploy(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      type: "function",
      name: "azure-bicep.deploy",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const deployInputs = inputs["bicep"];
        return ok([`deploy bicep, ${JSON.stringify(deployInputs)}`]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
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
