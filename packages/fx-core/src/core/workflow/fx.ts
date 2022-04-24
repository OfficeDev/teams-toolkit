// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigFolderName,
  FxError,
  ok,
  QTreeNode,
  Result,
  TextInputQuestion,
  v2,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { newProjectSettings } from "../../common/projectSettingsHelper";
import { getProjectSettingsPath } from "../middleware/projectSettingsLoader";
import { ProjectNamePattern } from "../question";
import "./aad";
import "./ApiCodeProvider";
import "./bicepProvider";
import "./botService";
import "./azureFunction";
import "./azureSql";
import "./azureStorage";
import "./azureWebApp";
import "./azureWebAppConfig";
import "./botCodeProvider";
import {
  Action,
  Component,
  ContextV3,
  GroupAction,
  MaybePromise,
  ProjectSettingsV3,
  TeamsBotInputs,
  TeamsTabInputs,
} from "./interface";
import "./spfx";
import "./teamsManifest";
import { getComponent, getEmbeddedValueByPath } from "./workflow";
import { camelCase } from "lodash";

@Service("fx")
export class TeamsfxCore {
  name = "fx";
  init(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const initProjectSettings: Action = {
      type: "function",
      name: "fx.initConfig",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok([
          `ensure folder: ${inputs.projectPath}`,
          `ensure folder: ${path.join(inputs.projectPath, `.${ConfigFolderName}`)}`,
          `ensure folder: ${path.join(inputs.projectPath, `.${ConfigFolderName}`, "configs")}`,
          `create file: ${getProjectSettingsPath(inputs.projectPath)}`,
        ]);
      },
      question: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
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
      execute: async (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
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
    inputs: v2.InputsWithProjectPath
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
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
    const actions: Action[] = [
      {
        name: "fx.configBot",
        type: "function",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
          const plans = [
            `add components 'teams-bot', '${teamsBotInputs.hostingResource}', 'bot-service' in projectSettings`,
          ];
          // connect to azure-sql
          if (getComponent(context.projectSetting, "azure-sql")) {
            plans.push(
              `connect 'azure-sql' to hosting component '${teamsBotInputs.hostingResource}' in projectSettings`
            );
          }
          return ok(plans);
        },
        execute: async (
          context: ContextV3,
          inputs: v2.InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
          const projectSettings = context.projectSetting;
          // add teams-bot
          projectSettings.components.push({
            name: "teams-bot",
            ...teamsBotInputs,
          });
          // add hosting component
          const hostingComponent = {
            name: teamsBotInputs.hostingResource,
            provision: true,
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
        name: `call:${teamsBotInputs.hostingResource}.generateBicep`,
        type: "call",
        required: false,
        targetAction: `${teamsBotInputs.hostingResource}.generateBicep`,
      },
      {
        name: "call:bot-service.generateBicep",
        type: "call",
        required: false,
        targetAction: "bot-service.generateBicep",
        inputs: {
          "bot-service": {
            hostingResource: teamsBotInputs.hostingResource,
          },
        },
      },
      {
        name: `call:${teamsBotInputs.hostingResource}-config.generateBicep`,
        type: "call",
        required: false,
        targetAction: `${teamsBotInputs.hostingResource}-config.generateBicep`,
      },
      {
        name: "call:bicep.persist",
        type: "call",
        required: false,
        targetAction: "bicep.persist",
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
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const sqlComponent = getComponent(context.projectSetting, "azure-sql");
    const provisionType = sqlComponent ? "database" : "server";
    const actions: Action[] = [
      {
        name: "fx.configProjectSettings",
        type: "function",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
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
          inputs: v2.InputsWithProjectPath
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
    actions.push({
      name: "call:bicep.persist",
      type: "call",
      required: false,
      targetAction: "bicep.persist",
    });
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
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
    const actions: Action[] = [
      {
        name: "fx.configTab",
        type: "function",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
          return ok([
            `add component 'teams-tab' in projectSettings: ${JSON.stringify(teamsTabInputs)}`,
          ]);
        },
        execute: async (
          context: ContextV3,
          inputs: v2.InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
          const projectSettings = context.projectSetting as ProjectSettingsV3;
          const teamsTabResource: Component = {
            name: "teams-tab",
            ...teamsTabInputs,
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
            resources: [teamsTabInputs.hostingResource],
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
    inputs: v2.InputsWithProjectPath
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
    const provisionSequences: Action[] = [
      {
        type: "function",
        name: "fx.preProvision",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          return ok(["pre step before provision (tenant, subscription, resource group)"]);
        },
        execute: async (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          inputs.solution = {
            tenantId: "MockTenantId",
            subscriptionId: "MockSubscriptionId",
            resourceGroup: "MockResourceGroup",
          };
          return ok(undefined);
        },
      },
      {
        type: "group",
        name: "resources.provision",
        mode: "parallel",
        actions: provisionActions,
      },
      {
        type: "call",
        name: "call:azure-bicep.deploy",
        required: true,
        targetAction: "azure-bicep.deploy",
        inputs: {
          "azure-bicep": {
            "azure-bot": {
              botId: "{{bot-service.botId}}",
              botEndpoint: "{{azure-web-app.endpoint}}", //TODO
            },
          },
        },
      },
    ];
    const teamsBot = getComponent(projectSettings, "teams-bot") as Component;
    const teamsTab = getComponent(projectSettings, "teams-tab") as Component;
    if (configureActions.length > 0) {
      const setInputsForConfig: Action = {
        type: "function",
        name: "prepare inputs for configuration stage",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          return ok(["set inputs for configuration"]);
        },
        execute: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          const projectSettings = context.projectSetting as ProjectSettingsV3;
          const teamsTab = getComponent(projectSettings, "teams-tab") as Component;
          const teamsBot = getComponent(projectSettings, "teams-bot") as Component;
          const aad = getComponent(projectSettings, "aad");
          let aadInputs: any;
          if (aad) {
            aadInputs = inputs["aad"];
            if (teamsTab && teamsBot) {
              aadInputs.m365ApplicationIdUri = `api://${
                inputs[teamsTab.hostingResource!].endpoint
              }/botid-${inputs["azure-bot"].botId}`;
            } else if (teamsTab) {
              aadInputs.m365ApplicationIdUri = `api://${
                inputs[teamsTab.hostingResource!].endpoint
              }`;
            } else {
              aadInputs.m365ApplicationIdUri = `api://botid-${inputs["azure-bot"].botId}`;
            }
            inputs["aad"] = aadInputs;
            if (teamsTab) {
              inputs[teamsTab.hostingResource!].appSettings = {
                M365_AUTHORITY_HOST: aadInputs.authAuthorityHost, // AAD authority host
                M365_CLIENT_ID: aadInputs.clientId, // Client id of AAD application
                M365_CLIENT_SECRET: aadInputs.clientSecret, // Client secret of AAD application
                M365_TENANT_ID: aadInputs.tenantId, // Tenant id of AAD application
                M365_APPLICATION_ID_URI: aadInputs.m365ApplicationIdUri, // Application ID URI of AAD application
              };
            }
            if (teamsBot) {
              inputs[teamsBot.hostingResource!].appSettings = {
                BOT_ID: inputs["bot-service"].botId,
                BOT_PASSWORD: inputs["bot-service"].botPassword,
                M365_AUTHORITY_HOST: aadInputs.authAuthorityHost, // AAD authority host
                M365_CLIENT_ID: aadInputs.clientId, // Client id of AAD application
                M365_CLIENT_SECRET: aadInputs.clientSecret, // Client secret of AAD application
                M365_TENANT_ID: aadInputs.tenantId, // Tenant id of AAD application
                M365_APPLICATION_ID_URI: aadInputs.m365ApplicationIdUri, // Application ID URI of AAD application
              };
            }
          } else {
            if (teamsBot) {
              inputs[teamsBot.hostingResource!].appSettings = {
                BOT_ID: inputs["bot-service"].botId,
                BOT_PASSWORD: inputs["bot-service"].botPassword,
              };
            }
          }
          console.log("set inputs for configuration");
          return ok(undefined);
        },
      };
      provisionSequences.push(setInputsForConfig);
      provisionSequences.push({
        type: "group",
        name: "resources.configure",
        mode: "parallel",
        actions: configureActions,
      });
    }
    const manifestInputs: any = {};
    if (teamsTab) manifestInputs.tabEndpoint = `{{${teamsTab.hostingResource}.endpoint}}`;
    if (teamsBot) manifestInputs.botId = "{{bot-service.botId}}";
    provisionSequences.push({
      type: "call",
      name: "call:teams-manifest.provision",
      required: true,
      targetAction: "teams-manifest.provision",
      inputs: {
        "teams-manifest": manifestInputs,
      },
    });
    const result: Action = {
      name: "fx.provision",
      type: "group",
      actions: provisionSequences,
    };
    return ok(result);
  }

  build(context: ContextV3, inputs: v2.InputsWithProjectPath): Result<Action | undefined, FxError> {
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
    inputs: v2.InputsWithProjectPath
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
