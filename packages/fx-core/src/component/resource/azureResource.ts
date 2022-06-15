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
import { getTemplatesFolder } from "../../folder";

export abstract class AzureResource implements CloudResource {
  abstract readonly name: string;
  abstract readonly bicepModuleName: string;
  abstract readonly outputs: ResourceOutputs;
  abstract readonly finalOutputKeys: string[];

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
        const provisionModule = await fs.readFile(pmPath, "utf-8");
        const ProvisionOrch = await fs.readFile(poPath, "utf-8");
        const bicep: Bicep = {
          type: "bicep",
          Provision: {
            Modules: { [this.bicepModuleName]: provisionModule },
            Orchestration: ProvisionOrch,
          },
          Parameters: await fs.readJson(
            path.join(getTemplatesFolder(), "bicep", `${this.bicepModuleName}.parameters.json`)
          ),
        };
        return ok([bicep]);
      },
    };
    return ok(action);
  }
}
