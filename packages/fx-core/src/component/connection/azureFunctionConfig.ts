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
import { Container, Service } from "typedi";
import * as path from "path";
import fs from "fs-extra";
import { getTemplatesFolder } from "../../folder";
import { getComponent } from "../workflow";
import { compileHandlebarsTemplateString } from "../../common/tools";
import { AzureWebAppResource } from "../resource/azureWebApp";
import { AzureStorageResource } from "../resource/azureStorage";

@Service("azure-function-config")
export class AzureFunctionsConfig {
  readonly name = "azure-function-config";
  readonly bicepModuleName = "azureFunction";
  references = ["azure-function", "azure-sql", "key-vault", "identity"];
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-function-config.generateBicep",
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
        const functionAppComponent = getComponent(context.projectSetting, "azure-function");
        if (!functionAppComponent) return ok([]);
        const templateContext: any = {};
        templateContext.connections = functionAppComponent?.connections || [];
        for (const ref of this.references) {
          templateContext[ref] = { outputs: {} };
          try {
            const refResource = Container.get(ref) as CloudResource;
            if (refResource.outputs) {
              for (const key of Object.keys(refResource.outputs)) {
                const entry = refResource.outputs[key];
                const value = entry.bicepVariable;
                templateContext[ref].outputs[key] = value;
              }
            }
          } catch (e) {}
        }
        const tabConfig = getComponent(context.projectSetting, "teams-tab");
        if (tabConfig) {
          if (tabConfig.hosting === "azure-web-app") {
            const azureWebApp = Container.get(tabConfig.hosting) as AzureWebAppResource;
            templateContext.tabDomainVarName = azureWebApp.outputs.endpoint.bicepVariable;
          } else if (tabConfig.hosting === "azure-storage") {
            const azureStorage = Container.get(tabConfig.hosting) as AzureStorageResource;
            templateContext.tabDomainVarName = azureStorage.outputs.endpoint.bicepVariable;
          }
        }
        const modulePath = path.join(
          getTemplatesFolder(),
          "bicep",
          `${this.bicepModuleName}.config.module.bicep`
        );
        let module = await fs.readFile(modulePath, "utf-8");
        module = compileHandlebarsTemplateString(module, templateContext);
        const orchPath = path.join(
          getTemplatesFolder(),
          "bicep",
          `${this.bicepModuleName}.config.orchestration.bicep`
        );
        const orch = functionAppComponent ? await fs.readFile(orchPath, "utf-8") : undefined;
        const bicep: Bicep = {
          type: "bicep",
          Configuration: {
            Modules: { [`${this.bicepModuleName}Config`]: module },
            Orchestration: orch,
          },
        };
        return ok([bicep]);
      },
    };
    return ok(action);
  }
}
