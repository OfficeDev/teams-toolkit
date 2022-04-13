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
import "./AzureBicepProvider";
import "./botService";
import "./azureFunction";
import "./azureSql";
import "./azureStorage";
import "./azureWebApp";
import "./BotCodeProvider";
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
          return ok([
            `add components 'teams-bot', '${teamsBotInputs.hostingResource}' in projectSettings`,
          ]);
        },
        execute: async (
          context: ContextV3,
          inputs: v2.InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
          const projectSettings = context.projectSetting;
          const component: Component = {
            name: "teams-bot",
            ...teamsBotInputs,
          };
          projectSettings.components.push(component);
          projectSettings.components.push({
            name: teamsBotInputs.hostingResource,
            provision: true,
          });
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
        name: "call:azure-bicep.generate",
        type: "call",
        required: false,
        targetAction: "azure-bicep.generate",
        inputs: {
          "azure-bicep": {
            resources: [teamsBotInputs.hostingResource],
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
            capabilities: [{ name: "Bot" }],
          },
        },
      },
    ];
    const group: GroupAction = {
      type: "group",
      name: "fx.addBot",
      mode: "parallel",
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
      },
    ];

    const teamsBot = getComponent(projectSettings, "teams-bot") as Component;
    const teamsTab = getComponent(projectSettings, "teams-tab") as Component;
    if (teamsBot) {
      provisionSequences.push({
        type: "call",
        name: "call:bot-service.provision",
        required: false,
        targetAction: "bot-service.provision",
      });
    }
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
    if (teamsBot) manifestInputs.botId = "{{azure-bot.botId}}";
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
              type: resource.deployType,
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
