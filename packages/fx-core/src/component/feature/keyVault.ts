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

@Service("key-vault-feature")
export class KeyVaultFeature {
  name = "key-vault-feature";

  /**
   * 1. config keyVault
   * 2. add keyVault provision bicep
   * 3. re-generate resources that connect to key-vault
   * 4. persist bicep
   */
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const keyVaultComponent = getComponent(context.projectSetting, ComponentNames.KeyVault);
    const webAppComponent = getComponent(context.projectSetting, ComponentNames.AzureWebApp);
    const functionComponent = getComponent(context.projectSetting, ComponentNames.Function);
    const actions: Action[] = [
      {
        name: "keyVault.configKeyVault",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          if (keyVaultComponent) {
            return ok([]);
          }
          const remarks: string[] = ["add component 'key-vault' in projectSettings"];
          if (webAppComponent) {
            remarks.push("connect 'key-vault' to component 'azure-web-app' in projectSettings");
          }
          if (functionComponent) {
            remarks.push("connect 'key-vault' to component 'azure-function' in projectSettings");
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
          if (keyVaultComponent) return ok([]);
          const projectSettings = context.projectSetting;
          const remarks: string[] = ["add component 'key-vault' in projectSettings"];
          projectSettings.components.push({
            name: ComponentNames.KeyVault,
            connections: [ComponentNames.Identity],
            provision: true,
          });
          if (webAppComponent) {
            webAppComponent.connections ??= [];
            webAppComponent.connections.push(ComponentNames.KeyVault);
            remarks.push("connect 'key-vault' to component 'azure-web-app' in projectSettings");
          }
          if (functionComponent) {
            functionComponent.connections ??= [];
            functionComponent.connections.push(ComponentNames.KeyVault);
            remarks.push("connect 'key-vault' to component 'azure-function' in projectSettings");
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
        name: "call:key-vault.generateBicep",
        type: "call",
        required: true,
        targetAction: "key-vault.generateBicep",
      },
    ];
    if (webAppComponent) {
      actions.push({
        name: "call:azure-web-app-config.generateBicep",
        type: "call",
        required: true,
        targetAction: "azure-web-app-config.generateBicep",
        inputs: {
          update: true,
        },
      });
    }
    if (functionComponent) {
      actions.push({
        name: "call:azure-function-config.generateBicep",
        type: "call",
        required: true,
        targetAction: "azure-function-config.generateBicep",
        inputs: {
          update: true,
        },
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
