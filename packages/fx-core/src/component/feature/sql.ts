// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  FxError,
  GroupAction,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { getProjectSettingsPath } from "../../core/middleware/projectSettingsLoader";
import { getComponent } from "../workflow";
import "../connection/azureWebAppConfig";
import "../resource/azureSql";
import "../resource/identity";
import { ComponentNames } from "../constants";
import { hasApi } from "../../common/projectSettingsHelperV3";

@Service("sql")
export class Sql {
  name = "sql";

  /**
   * 1. config sql
   * 2. add sql provision bicep
   * 3. add identity provision bicep
   * 4. re-generate resources that connect to sql
   * 5. persist bicep
   */
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const sqlComponent = getComponent(context.projectSetting, ComponentNames.AzureSQL);
    const webAppComponent = getComponent(context.projectSetting, ComponentNames.AzureWebApp);
    const functionComponent = getComponent(context.projectSetting, ComponentNames.Function);
    const provisionType = sqlComponent ? "database" : "server";
    const hasFunc = hasApi(context.projectSetting);
    const dependentActions: Action[] = [];
    if (!hasFunc) {
      dependentActions.push({
        name: "call:teams-api.add",
        type: "call",
        required: true,
        targetAction: "teams-api.add",
      });
    }
    const actions: Action[] = [
      ...dependentActions,
      {
        name: "sql.configSql",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          if (sqlComponent) {
            return ok([]);
          }
          const remarks: string[] = ["add component 'azure-sql' in projectSettings"];
          if (webAppComponent) {
            remarks.push("connect 'azure-sql' to component 'azure-web-app' in projectSettings");
          }
          if (functionComponent) {
            remarks.push("connect 'azure-sql' to component 'azure-function' in projectSettings");
          }
          return ok([
            {
              type: "file",
              operate: "replace",
              filePath: getProjectSettingsPath(inputs.projectPath),
              remarks: remarks.join(";"),
            },
          ]);
        },
        execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
          if (sqlComponent) return ok([]);
          const projectSettings = context.projectSetting;
          const remarks: string[] = ["add component 'azure-sql' in projectSettings"];
          projectSettings.components.push({
            name: "azure-sql",
            provision: true,
          });
          if (webAppComponent) {
            if (!webAppComponent.connections) webAppComponent.connections = [];
            webAppComponent.connections.push("azure-sql");
            remarks.push("connect 'azure-sql' to component 'azure-web-app' in projectSettings");
          }
          if (functionComponent) {
            if (!functionComponent.connections) functionComponent.connections = [];
            functionComponent.connections.push("azure-sql");
            remarks.push("connect 'azure-sql' to component 'azure-function' in projectSettings");
          }
          return ok([
            {
              type: "file",
              operate: "replace",
              filePath: getProjectSettingsPath(inputs.projectPath),
              remarks: remarks.join(";"),
            },
          ]);
        },
      },
      {
        type: "call",
        targetAction: "bicep.init",
        required: true,
      },
      {
        name: "call:azure-sql.generateBicep",
        type: "call",
        required: true,
        targetAction: "azure-sql.generateBicep",
        inputs: {
          provisionType: provisionType,
        },
      },
    ];
    if (webAppComponent) {
      actions.push({
        name: "call:azure-web-app-config.generateBicep",
        type: "call",
        required: true,
        targetAction: "azure-web-app-config.generateBicep",
      });
    }
    if (functionComponent) {
      actions.push({
        name: "call:azure-function-config.generateBicep",
        type: "call",
        required: true,
        targetAction: "azure-function-config.generateBicep",
      });
    }
    const group: GroupAction = {
      type: "group",
      name: "sql.add",
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }
}
