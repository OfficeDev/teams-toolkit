// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  Bicep,
  CloudResource,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container } from "typedi";
import * as path from "path";
import fs from "fs-extra";
import { getTemplatesFolder } from "../../folder";
import { getComponent } from "../workflow";
import { compileHandlebarsTemplateString } from "../../common/tools";
import { getProjectTemplatesFolderPath } from "../../common/utils";

export abstract class AzureResourceConfig {
  abstract readonly name: string;
  abstract readonly bicepModuleName: string;
  abstract readonly requisite: string;
  abstract references: string[];
  templateContext: Record<string, any> = {};
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: `${this.name}.generateBicep`,
      type: "function",
      plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const bicep: Bicep = {
          type: "bicep",
          Configuration: {
            Modules: { [`${this.bicepModuleName}Config`]: "1" },
            Orchestration: "1",
          },
        };
        return ok([bicep]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const update = inputs.update as boolean;
        const requisiteComponent = getComponent(context.projectSetting, this.requisite);
        if (!requisiteComponent) return ok([]);
        this.templateContext.connections = requisiteComponent.connections || [];
        for (const ref of this.references) {
          this.templateContext[ref] = { outputs: {} };
          try {
            const refResource = Container.get(ref) as CloudResource;
            if (refResource.outputs) {
              for (const key of Object.keys(refResource.outputs)) {
                const entry = refResource.outputs[key];
                const value = entry.bicepVariable;
                this.templateContext[ref].outputs[key] = value;
              }
            }
          } catch (e) {}
        }
        const modulePath = path.join(
          getTemplatesFolder(),
          "bicep",
          `${this.bicepModuleName}.config.module.bicep`
        );
        let module = await fs.readFile(modulePath, "utf-8");
        module = compileHandlebarsTemplateString(module, this.templateContext);
        const templatesFolder = await getProjectTemplatesFolderPath(inputs.projectPath);
        const moduleFilePath = path.join(
          templatesFolder,
          "teamsFx",
          `${this.bicepModuleName}Config.bicep`
        );
        const moduleFilePathExists = await fs.pathExists(moduleFilePath);
        const orchPath = path.join(
          getTemplatesFolder(),
          "bicep",
          `${this.bicepModuleName}.config.orchestration.bicep`
        );
        // orchestration part will be added only for first time
        const orch = moduleFilePathExists ? undefined : await fs.readFile(orchPath, "utf-8");
        const bicep: Bicep = {
          type: "bicep",
          Configuration: {
            Modules: { [`${this.bicepModuleName}Config`]: module },
            Orchestration: update ? undefined : orch,
          },
        };
        return ok([bicep]);
      },
    };
    return ok(action);
  }
}
