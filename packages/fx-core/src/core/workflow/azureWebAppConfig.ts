// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, CloudResource, ContextV3, MaybePromise } from "./interface";
import * as path from "path";
import fs from "fs-extra";
import { ArmTemplateResult } from "../../common/armInterface";
import { getTemplatesFolder } from "../../folder";
import { getComponent } from "./workflow";
import { compileHandlebarsTemplateString } from "../../common/tools";
@Service("azure-web-app-config")
export class AzureWebAppConfig implements CloudResource {
  readonly name = "azure-web-app-config";
  generateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app-config.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok([`generate azure web app configuration bicep to connect to other services`]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const webAppConfig = getComponent(context.projectSetting, "azure-web-app");
        const templateContext: any = {};
        templateContext.connections = webAppConfig?.connections || [];
        const tabConfig = getComponent(context.projectSetting, "teams-tab");
        if (tabConfig) {
          templateContext.tabDomainVarName = `{{${tabConfig.hostingResource}.References.endpoint}}`;
        }
        const armTemplate: ArmTemplateResult = {
          Configuration: { Modules: {} },
        };
        {
          const filePath = path.join(
            getTemplatesFolder(),
            "demo",
            "azureWebApp.config.module.bicep"
          );
          if (await fs.pathExists(filePath)) {
            let content = await fs.readFile(filePath, "utf-8");
            content = compileHandlebarsTemplateString(content, templateContext);
            armTemplate.Configuration!.Modules!["azureWebAppConfig"] = content;
          }
        }
        {
          const filePath = path.join(
            getTemplatesFolder(),
            "demo",
            "azureWebApp.config.orchestration.bicep"
          );
          if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, "utf-8");
            armTemplate.Configuration!.Orchestration = content;
          }
        }
        if (!context.bicep) context.bicep = {};
        context.bicep["azure-web-app-config"] = armTemplate;
        return ok(undefined);
      },
    };
    return ok(action);
  }
  updateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app-config.updateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok([`generate azure web app configuration bicep to connect to other services`]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const webAppConfig = getComponent(context.projectSetting, "azure-web-app");
        const templateContext: any = {};
        templateContext.connections = webAppConfig?.connections || [];
        const tabConfig = getComponent(context.projectSetting, "teams-tab");
        if (tabConfig) {
          templateContext.tabDomainVarName = `{{${tabConfig.hostingResource}.References.endpoint}}`;
        }
        const armTemplate: ArmTemplateResult = {
          Configuration: { Modules: {} },
        };
        {
          const filePath = path.join(
            getTemplatesFolder(),
            "demo",
            "azureWebApp.config.module.bicep"
          );
          if (await fs.pathExists(filePath)) {
            let content = await fs.readFile(filePath, "utf-8");
            content = compileHandlebarsTemplateString(content, templateContext);
            armTemplate.Configuration!.Modules!["azureWebAppConfig"] = content;
          }
        }
        if (!context.bicep) context.bicep = {};
        context.bicep["azure-web-app-config"] = armTemplate;
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
