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
  ProvisionContextV3,
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
import "./resource";
import "./bicep";
import "./botCode";
import "./connection";
import "./envManager";
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
          {
            type: "file",
            operate: "create",
            filePath: getProjectSettingsPath(inputs.projectPath),
          },
        ]);
      },
      question: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const question: TextInputQuestion = {
          type: "text",
          name: "app-name",
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
        projectSettings.appName = getEmbeddedValueByPath(inputs, "app-name");
        projectSettings.components = [];
        context.projectSetting = projectSettings;
        await fs.ensureDir(inputs.projectPath);
        await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`));
        await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`, "configs"));
        return ok([
          {
            type: "file",
            operate: "create",
            filePath: getProjectSettingsPath(inputs.projectPath),
          },
        ]);
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
        {
          type: "call",
          targetAction: "env-manager.create",
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
          const remarks = [
            `add components 'teams-bot', '${inputs.hosting}', 'bot-service' in projectSettings`,
          ];
          // connect to azure-sql
          if (getComponent(context.projectSetting, "azure-sql")) {
            remarks.push(
              `connect 'azure-sql' to hosting component '${inputs.hosting}' in projectSettings`
            );
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
          const projectSettings = context.projectSetting;
          // add teams-bot
          projectSettings.components.push({
            name: "teams-bot",
            hosting: inputs.hosting,
            folder: inputs.folder,
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
          const remarks = [
            `add components 'teams-bot', '${inputs.hosting}', 'bot-service' in projectSettings`,
          ];
          // connect azure-sql to hosting component
          if (getComponent(context.projectSetting, "azure-sql")) {
            hostingComponent.connections.push("azure-sql");
            remarks.push(
              `connect 'azure-sql' to hosting component '${inputs.hosting}' in projectSettings`
            );
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
        name: "call:bot-code.generate",
        type: "call",
        required: true,
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
        required: true,
        targetAction: `${inputs.hosting}.generateBicep`,
      },
      {
        name: "call:bot-service.generateBicep",
        type: "call",
        required: true,
        targetAction: "bot-service.generateBicep",
      },
      {
        name: `call:${inputs.hosting}-config.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${inputs.hosting}-config.generateBicep`,
      },
      {
        name: "call:teams-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "teams-manifest.addCapability",
        inputs: {
          capabilities: [{ name: "Bot" }],
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
      name: "fx.addSql",
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }
  // addTab(
  //   context: ContextV3,
  //   inputs: InputsWithProjectPath
  // ): MaybePromise<Result<Action | undefined, FxError>> {
  //   const actions: Action[] = [
  //     {
  //       name: "fx.configTab",
  //       type: "function",
  //       plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
  //         return ok([`add component 'teams-tab' in projectSettings: ${JSON.stringify(inputs)}`]);
  //       },
  //       execute: async (
  //         context: ContextV3,
  //         inputs: InputsWithProjectPath
  //       ): Promise<Result<undefined, FxError>> => {
  //         const projectSettings = context.projectSetting as ProjectSettingsV3;
  //         const teamsTabResource: Component = {
  //           name: "teams-tab",
  //           ...inputs,
  //         };
  //         projectSettings.components.push(teamsTabResource);
  //         console.log(
  //           `add component 'teams-tab' in projectSettings: ${JSON.stringify(teamsTabResource)}`
  //         );
  //         return ok(undefined);
  //       },
  //     },
  //     {
  //       name: "call:tab-code.generate",
  //       type: "call",
  //       required: true,
  //       targetAction: "tab-code.generate",
  //     },
  //     {
  //       name: "call:azure-bicep.generate",
  //       type: "call",
  //       required: false,
  //       targetAction: "azure-bicep.generate",
  //       inputs: {
  //         "azure-bicep": {
  //           resources: [inputs.hosting],
  //         },
  //       },
  //     },
  //     {
  //       name: "call:teams-manifest.addCapability",
  //       type: "call",
  //       required: true,
  //       targetAction: "teams-manifest.addCapability",
  //       inputs: {
  //         "teams-manifest": {
  //           capabilities: [{ name: "staticTab" }],
  //         },
  //       },
  //     },
  //   ];
  //   const group: GroupAction = {
  //     type: "group",
  //     name: "fx.addTab",
  //     mode: "parallel",
  //     actions: actions,
  //   };
  //   return ok(group);
  // }
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
        const ctx = context as ProvisionContextV3;
        ctx.envInfo.state.solution = {
          tenantId: "MockTenantId",
          subscriptionId: "MockSubscriptionId",
          resourceGroup: "MockResourceGroup",
        };
        ctx.envInfo.state["teams-manifest"] = {
          tenantId: "MockTenantId",
        };
        return ok(["pre step before provision (tenant, subscription, resource group)"]);
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
      name: "resources.configure",
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
      name: "fx.preConfigure",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([]);
      },
      execute: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const teamsTab = getComponent(projectSettings, "teams-tab") as Component;
        const aad = getComponent(projectSettings, "aad");
        if (aad) {
          if (teamsTab) {
            const tabEndpoint = context.envInfo?.state[teamsTab.hosting!].endpoint;
            inputs.m365ApplicationIdUri = `api://${tabEndpoint}`;
          }
        }
        return ok([]);
      },
    };
    const provisionManifestStep: Action = {
      type: "call",
      name: "call:teams-manifest.provision",
      required: true,
      targetAction: "teams-manifest.provision",
    };
    const provisionSequences: Action[] = [
      {
        type: "call",
        targetAction: "env-manager.read",
        required: true,
      },
      preProvisionStep,
      provisionStep,
      deployBicepStep,
      prepareInputsForConfigure,
      configureStep,
      provisionManifestStep,
      {
        type: "call",
        targetAction: "env-manager.write",
        required: true,
      },
    ];
    const result: Action = {
      name: "fx.provision",
      type: "group",
      actions: provisionSequences,
    };
    return ok(result);
  }

  // build(context: ContextV3, inputs: InputsWithProjectPath): Result<Action | undefined, FxError> {
  //   const projectSettings = context.projectSetting as ProjectSettingsV3;
  //   const actions: Action[] = projectSettings.components
  //     .filter((resource) => resource.build)
  //     .map((resource) => {
  //       return {
  //         name: `call:${resource.name}.build`,
  //         type: "call",
  //         targetAction: `${resource.name}.build`,
  //         required: false,
  //       };
  //     });
  //   const group: Action = {
  //     type: "group",
  //     mode: "parallel",
  //     actions: actions,
  //   };
  //   return ok(group);
  // }

  // deploy(
  //   context: ContextV3,
  //   inputs: InputsWithProjectPath
  // ): MaybePromise<Result<Action | undefined, FxError>> {
  //   const projectSettings = context.projectSetting as ProjectSettingsV3;
  //   const actions: Action[] = [
  //     {
  //       name: "call:fx.build",
  //       type: "call",
  //       targetAction: "fx.build",
  //       required: false,
  //     },
  //   ];
  //   projectSettings.components
  //     .filter((resource) => resource.build && resource.hosting)
  //     .forEach((resource) => {
  //       actions.push({
  //         type: "call",
  //         targetAction: `${resource.hosting}.deploy`,
  //         required: false,
  //         inputs: {
  //           [resource.hosting!]: {
  //             folder: resource.folder,
  //           },
  //         },
  //       });
  //     });
  //   const action: GroupAction = {
  //     type: "group",
  //     name: "fx.deploy",
  //     actions: actions,
  //   };
  //   return ok(action);
  // }
}
