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
  FileEffect,
  ProvisionContextV3,
  err,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { createCapabilityForDotNet } from "../core/question";
import { getTemplatesFolder } from "../folder";
import arm from "../plugins/solution/fx-solution/arm";
import { createFileEffect, createFilesEffects } from "./utils";
@Service("bicep")
export class BicepProvider {
  readonly name = "bicep";
  init(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bicep.init",
      type: "function",
      plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const targetFolder = path.join(inputs.projectPath, "templates", "azure");
        return ok(
          createFilesEffects(
            [
              path.join(targetFolder, "main.bicep"),
              path.join(targetFolder, "provision.bicep"),
              path.join(targetFolder, "config.bicep"),
            ],
            "skip"
          )
        );
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<any, FxError>> => {
        const sourceFolder = path.join(getTemplatesFolder(), "bicep");
        const targetFolder = path.join(inputs.projectPath, "templates", "azure");
        if (
          (await fs.pathExists(path.join(targetFolder, "main.bicep"))) &&
          (await fs.pathExists(path.join(targetFolder, "provision.bicep"))) &&
          (await fs.pathExists(path.join(targetFolder, "config.bicep")))
        )
          return ok([]);
        await fs.ensureDir(targetFolder);
        await fs.ensureDir(path.join(targetFolder, "provision"));
        await fs.ensureDir(path.join(targetFolder, "teamsFx"));
        if (!(await fs.pathExists(path.join(targetFolder, "main.bicep")))) {
          await fs.copyFile(
            path.join(sourceFolder, "main.bicep"),
            path.join(targetFolder, "main.bicep")
          );
        }
        if (!(await fs.pathExists(path.join(targetFolder, "provision.bicep")))) {
          await fs.copyFile(
            path.join(sourceFolder, "provision.bicep"),
            path.join(targetFolder, "provision.bicep")
          );
        }
        if (!(await fs.pathExists(path.join(targetFolder, "config.bicep")))) {
          await fs.copyFile(
            path.join(sourceFolder, "config.bicep"),
            path.join(targetFolder, "config.bicep")
          );
        }
        const effect: FileEffect = {
          type: "file",
          operate: "create",
          filePath: [
            path.join(targetFolder, "main.bicep"),
            path.join(targetFolder, "provision.bicep"),
            path.join(targetFolder, "config.bicep"),
          ],
        };
        return ok([effect]);
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
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy bicep, ${JSON.stringify(deployInputs)}`,
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const res = await arm.deployArmTemplates(
          ctx,
          inputs,
          ctx.envInfo,
          ctx.tokenProvider.azureAccountProvider
        );
        if (res.isErr()) return err(res.error);
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: "deploy bicep",
          },
        ]);
      },
    };
    return ok(action);
  }
}
