// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  Component,
  ConfigFolderName,
  ContextV3,
  FxError,
  GroupAction,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProjectSettingsV3,
  QTreeNode,
  Result,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { newProjectSettings } from "./../common/projectSettingsHelper";
import { getProjectSettingsPath } from "../core/middleware/projectSettingsLoader";
import { ProjectNamePattern } from "../core/question";
import { getComponent, getEmbeddedValueByPath } from "./workflow";

@Service("fx")
export class TeamsfxCore {
  name = "fx";
  init(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const initProjectSettings: Action = {
      type: "function",
      name: "fx.initConfig",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          `ensure folder: ${inputs.projectPath}`,
          `ensure folder: ${path.join(inputs.projectPath, `.${ConfigFolderName}`)}`,
          `ensure folder: ${path.join(inputs.projectPath, `.${ConfigFolderName}`, "configs")}`,
          `create file: ${getProjectSettingsPath(inputs.projectPath)}`,
        ]);
      },
      question: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const question: TextInputQuestion = {
          type: "text",
          name: "fx.app-name",
          title: "Application name",
          validation: {
            pattern: ProjectNamePattern,
            maxLength: 30,
          },
          placeholder: "Application name",
        };
        return ok(new QTreeNode(question));
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const projectSettings = newProjectSettings() as ProjectSettingsV3;
        projectSettings.appName = getEmbeddedValueByPath(inputs, "fx.app-name");
        projectSettings.components = [];
        context.projectSetting = projectSettings;
        await fs.ensureDir(inputs.projectPath);
        await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`));
        await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`, "configs"));
        return ok(undefined);
      },
    };
    const action: Action = {
      type: "group",
      name: "fx.init",
      actions: [
        initProjectSettings,
        {
          type: "call",
          targetAction: "teams-manifest.init",
          required: true,
        },
      ],
    };
    return ok(action);
  }
  create(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const actions: Action[] = [
      {
        type: "call",
        required: true,
        targetAction: "fx.init",
      },
      {
        type: "call",
        required: true,
        targetAction: "fx.add",
      },
    ];
    const action: GroupAction = {
      name: "fx.create",
      type: "group",
      actions: actions,
    };
    return ok(action);
  }

  /**
   * 1. config bot in project settings
   * 2. generate bot source code
   * 3. generate bot-service and hosting bicep
   * 3. overwrite hosting config bicep
   * 4. persist bicep
   * 5. add capability in teams manifest
   */
  addBot(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const actions: Action[] = [
      {
        name: "fx.configBot",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const plans = [
            `add components 'teams-bot', '${inputs.hosting}', 'bot-service' in projectSettings`,
          ];
          // connect to azure-sql
          if (getComponent(context.projectSetting, "azure-sql")) {
            plans.push(
              `connect 'azure-sql' to hosting component '${inputs.hosting}' in projectSettings`
            );
          }
          return ok(plans);
        },
        execute: async (
          context: ContextV3,
          inputs: InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const projectSettings = context.projectSetting;
          // add teams-bot
          projectSettings.components.push({
            name: "teams-bot",
            ...inputs,
          });
          // add hosting component
          const hostingComponent = {
            name: inputs.hosting,
            connections: ["teams-bot"],
          };
          projectSettings.components.push(hostingComponent);
          //add bot-service
          projectSettings.components.push({
            name: "bot-service",
            provision: true,
          });
          // connect azure-sql to hosting component
          if (getComponent(context.projectSetting, "azure-sql")) {
            hostingComponent.connections.push("azure-sql");
          }
          return ok(undefined);
        },
      },
      {
        name: "call:bot-code.generate",
        type: "call",
        required: false,
        targetAction: "bot-code.generate",
      },
      {
        type: "call",
        targetAction: "bicep.init",
        required: true,
      },
      {
        name: `call:${inputs.hosting}.generateBicep`,
        type: "call",
        required: false,
        targetAction: `${inputs.hosting}.generateBicep`,
      },
      {
        name: "call:bot-service.generateBicep",
        type: "call",
        required: false,
        targetAction: "bot-service.generateBicep",
      },
      {
        name: `call:${inputs.hosting}-config.generateBicep`,
        type: "call",
        required: false,
        targetAction: `${inputs.hosting}-config.generateBicep`,
      },
      {
        name: "call:teams-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "teams-manifest.addCapability",
        inputs: {
          "teams-manifest": {
            capabilities: [{ name: "Bot" }],
          },
        },
      },
    ];
    const group: GroupAction = {
      type: "group",
      name: "fx.addBot",
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }

  /**
   * 1. config sql
   * 2. add sql provision bicep
   * 3. re-generate resources that connect to sql
   * 4. persist bicep
   */
  addSql(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const sqlComponent = getComponent(context.projectSetting, "azure-sql");
    const provisionType = sqlComponent ? "database" : "server";
    const actions: Action[] = [
      {
        name: "fx.configSql",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const sqlComponent = getComponent(context.projectSetting, "azure-sql");
          if (sqlComponent) {
            return ok([]);
          }
          const plans: string[] = ["add component 'azure-sql' in projectSettings"];
          const webAppComponent = getComponent(context.projectSetting, "azure-web-app");
          if (webAppComponent) {
            plans.push("connect 'azure-sql' to component 'azure-web-app' in projectSettings");
          }
          const functionComponent = getComponent(context.projectSetting, "azure-function");
          if (functionComponent) {
            plans.push("connect 'azure-sql' to component 'azure-function' in projectSettings");
          }
          return ok(plans);
        },
        execute: async (
          context: ContextV3,
          inputs: InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const sqlComponent = getComponent(context.projectSetting, "azure-sql");
          if (sqlComponent) return ok(undefined);
          const projectSettings = context.projectSetting;
          projectSettings.components.push({
            name: "azure-sql",
            provision: true,
          });
          const webAppComponent = getComponent(context.projectSetting, "azure-web-app");
          if (webAppComponent) {
            if (!webAppComponent.connections) webAppComponent.connections = [];
            webAppComponent.connections.push("azure-sql");
          }
          const functionComponent = getComponent(context.projectSetting, "azure-function");
          if (functionComponent) {
            if (!functionComponent.connections) functionComponent.connections = [];
            functionComponent.connections.push("azure-sql");
          }
          return ok(undefined);
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
        required: false,
        targetAction: "azure-sql.generateBicep",
        inputs: {
          "azure-sql": {
            provisionType: provisionType,
          },
        },
      },
    ];
    const webAppComponent = getComponent(context.projectSetting, "azure-web-app");
    if (webAppComponent) {
      actions.push({
        name: "call:azure-web-app-config.generateBicep",
        type: "call",
        required: false,
        targetAction: "azure-web-app-config.generateBicep",
      });
    }
    const functionComponent = getComponent(context.projectSetting, "azure-function");
    if (functionComponent) {
      actions.push({
        name: "call:azure-function-config.generateBicep",
        type: "call",
        required: false,
        targetAction: "azure-function-config.generateBicep",
      });
    }
    const group: GroupAction = {
      type: "group",
      name: "fx.addSql",
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }
  addTab(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const actions: Action[] = [
      {
        name: "fx.configTab",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          return ok([`add component 'teams-tab' in projectSettings: ${JSON.stringify(inputs)}`]);
        },
        execute: async (
          context: ContextV3,
          inputs: InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const projectSettings = context.projectSetting as ProjectSettingsV3;
          const teamsTabResource: Component = {
            name: "teams-tab",
            ...inputs,
          };
          projectSettings.components.push(teamsTabResource);
          console.log(
            `add component 'teams-tab' in projectSettings: ${JSON.stringify(teamsTabResource)}`
          );
          return ok(undefined);
        },
      },
      {
        name: "call:tab-code.generate",
        type: "call",
        required: true,
        targetAction: "tab-code.generate",
      },
      {
        name: "call:azure-bicep.generate",
        type: "call",
        required: false,
        targetAction: "azure-bicep.generate",
        inputs: {
          "azure-bicep": {
            resources: [inputs.hosting],
          },
        },
      },
      {
        name: "call:teams-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "teams-manifest.addCapability",
        inputs: {
          "teams-manifest": {
            capabilities: [{ name: "staticTab" }],
          },
        },
      },
    ];
    const group: GroupAction = {
      type: "group",
      name: "fx.addTab",
      mode: "parallel",
      actions: actions,
    };
    return ok(group);
  }
  provision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const resourcesToProvision = projectSettings.components.filter((r) => r.provision);
    const provisionActions: Action[] = resourcesToProvision.map((r) => {
      return {
        type: "call",
        name: `call:${r.name}.provision`,
        required: false,
        targetAction: `${r.name}.provision`,
      };
    });
    const configureActions: Action[] = resourcesToProvision.map((r) => {
      return {
        type: "call",
        name: `call:${r.name}.configure`,
        required: false,
        targetAction: `${r.name}.configure`,
      };
    });
    const preProvisionStep: Action = {
      type: "function",
      name: "fx.preProvision",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok(["pre step before provision (tenant, subscription, resource group)"]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        inputs.solution = {
          tenantId: "MockTenantId",
          subscriptionId: "MockSubscriptionId",
          resourceGroup: "MockResourceGroup",
        };
        return ok(undefined);
      },
    };
    const provisionStep: Action = {
      type: "group",
      name: "resources.provision",
      mode: "parallel",
      actions: provisionActions,
    };
    const configureStep: Action = {
      type: "group",
      name: "resources.provision",
      mode: "parallel",
      actions: configureActions,
    };
    const deployBicepStep: Action = {
      type: "call",
      name: "call:bicep.deploy",
      required: true,
      targetAction: "bicep.deploy",
    };
    const prepareInputsForConfigure: Action = {
      type: "function",
      name: "prepare inputs for configuration stage",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok(["set inputs for configuration"]);
      },
      execute: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const teamsTab = getComponent(projectSettings, "teams-tab") as Component;
        const teamsBot = getComponent(projectSettings, "teams-bot") as Component;
        const aad = getComponent(projectSettings, "aad");
        if (aad) {
          if (teamsTab && teamsBot) {
            inputs["aad"].m365ApplicationIdUri = `api://${
              inputs[teamsTab.hostingResource!].endpoint
            }/botid-${inputs["azure-bot"].botId}`;
          } else if (teamsTab) {
            inputs["aad"].m365ApplicationIdUri = `api://${
              inputs[teamsTab.hostingResource!].endpoint
            }`;
          } else {
            inputs["aad"].m365ApplicationIdUri = `api://botid-${inputs["azure-bot"].botId}`;
          }
        }
        console.log("set inputs for configuration");
        return ok(undefined);
      },
    };
    const teamsBot = getComponent(projectSettings, "teams-bot") as Component;
    const teamsTab = getComponent(projectSettings, "teams-tab") as Component;
    const manifestInputs: any = {};
    if (teamsTab) manifestInputs.tabEndpoint = `{{${teamsTab.hostingResource}.endpoint}}`;
    if (teamsBot) manifestInputs.botId = "{{bot-service.botId}}";
    const provisionManifestStep: Action = {
      type: "call",
      name: "call:teams-manifest.provision",
      required: true,
      targetAction: "teams-manifest.provision",
      inputs: {
        "teams-manifest": manifestInputs,
      },
    };
    const provisionSequences: Action[] = [
      preProvisionStep,
      provisionStep,
      deployBicepStep,
      prepareInputsForConfigure,
      configureStep,
      provisionManifestStep,
    ];
    const result: Action = {
      name: "fx.provision",
      type: "group",
      actions: provisionSequences,
    };
    return ok(result);
  }

  build(context: ContextV3, inputs: InputsWithProjectPath): Result<Action | undefined, FxError> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const actions: Action[] = projectSettings.components
      .filter((resource) => resource.build)
      .map((resource) => {
        return {
          name: `call:${resource.name}.build`,
          type: "call",
          targetAction: `${resource.name}.build`,
          required: false,
        };
      });
    const group: Action = {
      type: "group",
      mode: "parallel",
      actions: actions,
    };
    return ok(group);
  }

  deploy(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const actions: Action[] = [
      {
        name: "call:fx.build",
        type: "call",
        targetAction: "fx.build",
        required: false,
      },
    ];
    projectSettings.components
      .filter((resource) => resource.build && resource.hostingResource)
      .forEach((resource) => {
        actions.push({
          type: "call",
          targetAction: `${resource.hostingResource}.deploy`,
          required: false,
          inputs: {
            [resource.hostingResource!]: {
              folder: resource.folder,
            },
          },
        });
      });
    const action: GroupAction = {
      type: "group",
      name: "fx.deploy",
      actions: actions,
    };
    return ok(action);
  }
}
