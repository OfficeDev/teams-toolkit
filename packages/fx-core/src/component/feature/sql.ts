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
@Service("sql")
export class Sql {
  name = "sql";

  /**
   * 1. config sql
   * 2. add sql provision bicep
   * 3. re-generate resources that connect to sql
   * 4. persist bicep
   */
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const sqlComponent = getComponent(context.projectSetting, "azure-sql");
    const provisionType = sqlComponent ? "database" : "server";
    const actions: Action[] = [
      // LoadProjectSettingsAction,
      {
        name: "sql.configSql",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const sqlComponent = getComponent(context.projectSetting, "azure-sql");
          if (sqlComponent) {
            return ok([]);
          }
          const remarks: string[] = ["add component 'azure-sql' in projectSettings"];
          const webAppComponent = getComponent(context.projectSetting, "azure-web-app");
          if (webAppComponent) {
            remarks.push("connect 'azure-sql' to component 'azure-web-app' in projectSettings");
          }
          const functionComponent = getComponent(context.projectSetting, "azure-function");
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
          const sqlComponent = getComponent(context.projectSetting, "azure-sql");
          if (sqlComponent) return ok([]);
          const projectSettings = context.projectSetting;
          const remarks: string[] = ["add component 'azure-sql' in projectSettings"];
          projectSettings.components.push({
            name: "azure-sql",
            provision: true,
          });
          const webAppComponent = getComponent(context.projectSetting, "azure-web-app");
          if (webAppComponent) {
            if (!webAppComponent.connections) webAppComponent.connections = [];
            webAppComponent.connections.push("azure-sql");
            remarks.push("connect 'azure-sql' to component 'azure-web-app' in projectSettings");
          }
          const functionComponent = getComponent(context.projectSetting, "azure-function");
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
    const webAppComponent = getComponent(context.projectSetting, "azure-web-app");
    if (webAppComponent) {
      actions.push({
        name: "call:azure-web-app-config.generateBicep",
        type: "call",
        required: true,
        targetAction: "azure-web-app-config.generateBicep",
      });
    }
    const functionComponent = getComponent(context.projectSetting, "azure-function");
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
