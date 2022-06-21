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
  ResourceOutputs,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { compileHandlebarsTemplateString } from "../../common/tools";
import { getTemplatesFolder } from "../../folder";

export abstract class AzureResource implements CloudResource {
  abstract readonly name: string;
  abstract readonly bicepModuleName: string;
  abstract readonly outputs: ResourceOutputs;
  abstract readonly finalOutputKeys: string[];
  templateContext: Record<string, any> = {};
  getTemplateContext?: (context: ContextV3, inputs: InputsWithProjectPath) => Record<string, any>;

  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: `${this.name}.generateBicep`,
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const bicep: Bicep = {
          type: "bicep",
          Provision: {
            Modules: { [this.bicepModuleName]: "1" },
            Orchestration: "1",
          },
          Parameters: {},
        };
        return ok([bicep]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const pmPath = path.join(
          getTemplatesFolder(),
          "bicep",
          `${this.bicepModuleName}.provision.module.bicep`
        );
        const poPath = path.join(
          getTemplatesFolder(),
          "bicep",
          `${this.bicepModuleName}.provision.orchestration.bicep`
        );
        let module = await fs.readFile(pmPath, "utf-8");
        if (this.getTemplateContext) {
          try {
            this.templateContext = this.getTemplateContext(context, inputs);
          } catch {}
        }
        module = compileHandlebarsTemplateString(module, this.templateContext);
        const orchestration = await fs.readFile(poPath, "utf-8");
        const parametersPath = path.join(
          getTemplatesFolder(),
          "bicep",
          `${this.bicepModuleName}.parameters.json`
        );
        const bicep: Bicep = {
          type: "bicep",
          Provision: {
            Modules: { [this.bicepModuleName]: module },
            Orchestration: orchestration,
          },
          Parameters: (await fs.pathExists(parametersPath))
            ? await fs.readJson(parametersPath)
            : undefined,
        };
        return ok([bicep]);
      },
    };
    return ok(action);
  }
}
