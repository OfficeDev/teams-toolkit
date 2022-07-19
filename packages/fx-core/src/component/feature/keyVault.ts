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
import { getComponent, getComponents } from "../workflow";
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
    const webAppComponents = getComponents(context.projectSetting, ComponentNames.AzureWebApp);
    const functionComponents = getComponents(context.projectSetting, ComponentNames.Function);
    const actions: Action[] = [
      {
        name: "keyVault.configKeyVault",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          if (keyVaultComponent) {
            return ok([]);
          }
          const remarks: string[] = ["add component 'key-vault' in projectSettings"];
          if (webAppComponents?.length) {
            remarks.push("connect 'key-vault' to component 'azure-web-app' in projectSettings");
          }
          if (functionComponents?.length) {
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
          if (webAppComponents) {
            webAppComponents.forEach((component) => {
              component.connections ??= [];
              component.connections.push(ComponentNames.KeyVault);
            });
            remarks.push("connect 'key-vault' to component 'azure-web-app' in projectSettings");
          }
          if (functionComponents) {
            functionComponents.forEach((component) => {
              component.connections ??= [];
              component.connections.push(ComponentNames.KeyVault);
            });
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
        inputs: {
          scenario: "",
        },
      },
    ];
    webAppComponents?.forEach((component) =>
      actions.push({
        name: "call:azure-web-app-config.generateBicep",
        type: "call",
        required: true,
        targetAction: "azure-web-app-config.generateBicep",
        inputs: {
          update: true,
          scenario: component.scenario,
        },
      })
    );
    functionComponents?.forEach((component) =>
      actions.push({
        name: "call:azure-function-config.generateBicep",
        type: "call",
        required: true,
        targetAction: "azure-function-config.generateBicep",
        inputs: {
          update: true,
          scenario: component.scenario,
        },
      })
    );
    const group: GroupAction = {
      type: "group",
      name: "key-vault.add",
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }
}
