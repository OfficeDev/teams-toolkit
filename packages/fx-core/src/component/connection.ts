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
import { getTemplatesFolder } from "../folder";
import { getComponent } from "./workflow";
import { compileHandlebarsTemplateString } from "../common/tools";
import { AzureWebAppResource } from "./resource/azureWebApp";
import { AzureStorageResource } from "./resource/azureStorage";
import { persistConfigBicepPlans } from "./bicepUtils";
@Service("azure-web-app-config")
export class AzureWebAppConfig {
  readonly name = "azure-web-app-config";
  references = ["azure-web-app", "azure-sql", "key-vault", "identity", "azure-function"];
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app-config.generateBicep",
      type: "function",
      plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const plans = persistConfigBicepPlans(inputs.projectPath, {
          Modules: { azureWebAppConfig: "1" },
          Orchestration: "1",
        });
        return ok(plans);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<Bicep, FxError>> => {
        const webAppComponent = getComponent(context.projectSetting, "azure-web-app");
        if (!webAppComponent) return ok({});

        const templateContext: any = {};
        templateContext.connections = webAppComponent?.connections || [];
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
          if (tabConfig.hostingResource === "azure-web-app") {
            const azureWebApp = Container.get(tabConfig.hostingResource) as AzureWebAppResource;
            templateContext.tabDomainVarName = azureWebApp.outputs.endpoint.bicepVariable;
          } else if (tabConfig.hostingResource === "azure-storage") {
            const azureStorage = Container.get(tabConfig.hostingResource) as AzureStorageResource;
            templateContext.tabDomainVarName = azureStorage.outputs.endpoint.bicepVariable;
          }
        }
        const modulePath = path.join(
          getTemplatesFolder(),
          "demo",
          "azureWebApp.config.module.bicep"
        );
        let module = await fs.readFile(modulePath, "utf-8");
        module = compileHandlebarsTemplateString(module, templateContext);
        const orchPath = path.join(
          getTemplatesFolder(),
          "demo",
          "azureWebApp.config.orchestration.bicep"
        );
        const orch = !webAppComponent ? await fs.readFile(orchPath, "utf-8") : undefined;
        const armTemplate: Bicep = {
          Configuration: { Modules: { azureWebAppConfig: module }, Orchestration: orch },
        };
        return ok(armTemplate);
      },
    };
    return ok(action);
  }
}
