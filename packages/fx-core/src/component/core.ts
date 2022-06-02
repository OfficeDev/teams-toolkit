// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ConfigFolderName,
  ContextV3,
  FxError,
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
import { getProjectSettingsPath } from "../core/middleware/projectSettingsLoader";
import { ProjectNamePattern } from "../core/question";
import { newProjectSettings } from "./../common/projectSettingsHelper";
import "./bicep";
import "./debug";
import "./envManager";
import "./resource/appManifest/appManifest";
import { WriteProjectSettingsAction } from "./projectSettingsManager";
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
        projectSettings.appName = inputs["app-name"];
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
          targetAction: "app-manifest.init",
          required: true,
        },
        {
          type: "call",
          targetAction: "env-manager.create",
          required: true,
        },
        WriteProjectSettingsAction,
      ],
    };
    return ok(action);
  }
  // preProvision(
  //   context: ContextV3,
  //   inputs: InputsWithProjectPath
  // ): MaybePromise<Result<Action | undefined, FxError>> {
  //   const action: Action = {
  //     type: "function",
  //     name: "fx.preProvision",
  //     plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       return ok(["pre step before provision (tenant, subscription, resource group)"]);
  //     },
  //     execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       const ctx = context as ProvisionContextV3;
  //       const envInfo = ctx.envInfo;
  //       const solutionSetting = ctx.projectSetting.solutionSettings as
  //         | AzureSolutionSettings
  //         | undefined;
  //       // 1. check M365 tenant
  //       if (!envInfo.state["app-manifest"]) envInfo.state["app-manifest"] = {};
  //       const teamsAppResource = envInfo.state["app-manifest"] as v3.TeamsAppResource;
  //       if (!envInfo.state.solution) envInfo.state.solution = {};
  //       const solutionConfig = envInfo.state.solution as v3.AzureSolutionConfig;
  //       solutionConfig.provisionSucceeded = false;
  //       const tenantIdInConfig = teamsAppResource.tenantId;
  //       const tenantIdInTokenRes = await getM365TenantId(ctx.tokenProvider.appStudioToken);
  //       if (tenantIdInTokenRes.isErr()) {
  //         return err(tenantIdInTokenRes.error);
  //       }
  //       const tenantIdInToken = tenantIdInTokenRes.value;
  //       if (tenantIdInConfig && tenantIdInToken && tenantIdInToken !== tenantIdInConfig) {
  //         return err(
  //           new UserError(
  //             "Solution",
  //             SolutionError.TeamsAppTenantIdNotRight,
  //             `The signed in M365 account does not match the M365 tenant in config file for '${envInfo.envName}' environment. Please sign out and sign in with the correct M365 account.`
  //           )
  //         );
  //       }
  //       if (!tenantIdInConfig) {
  //         teamsAppResource.tenantId = tenantIdInToken;
  //         solutionConfig.teamsAppTenantId = tenantIdInToken;
  //       }
  //       // 3. check Azure configs
  //       if (hasAzureResourceV3(ctx.projectSetting) && envInfo.envName !== "local") {
  //         // ask common question and fill in solution config
  //         const solutionConfigRes = await fillInAzureConfigs(
  //           ctx,
  //           inputs,
  //           envInfo as v3.EnvInfoV3,
  //           ctx.tokenProvider
  //         );
  //         if (solutionConfigRes.isErr()) {
  //           return err(solutionConfigRes.error);
  //         }
  //         // ask for provision consent
  //         const consentResult = await askForProvisionConsent(
  //           ctx,
  //           ctx.tokenProvider.azureAccountProvider,
  //           envInfo as v3.EnvInfoV3
  //         );
  //         if (consentResult.isErr()) {
  //           return err(consentResult.error);
  //         }
  //         // create resource group if needed
  //         if (solutionConfig.needCreateResourceGroup) {
  //           const createRgRes = await resourceGroupHelper.createNewResourceGroup(
  //             solutionConfig.resourceGroupName,
  //             ctx.tokenProvider.azureAccountProvider,
  //             solutionConfig.subscriptionId,
  //             solutionConfig.location
  //           );
  //           if (createRgRes.isErr()) {
  //             return err(createRgRes.error);
  //           }
  //         }
  //       }
  //       // ctx.envInfo.state.solution = {
  //       //   tenantId: "MockTenantId",
  //       //   subscriptionId: "MockSubscriptionId",
  //       //   resourceGroup: "MockResourceGroup",
  //       // };
  //       // ctx.envInfo.state["app-manifest"] = {
  //       //   tenantId: "MockTenantId",
  //       // };
  //       return ok(["pre step before provision (tenant, subscription, resource group)"]);
  //     },
  //   };
  //   return ok(action);
  // }
  // provision(
  //   context: ContextV3,
  //   inputs: InputsWithProjectPath
  // ): MaybePromise<Result<Action | undefined, FxError>> {
  //   const ctx = context as ProvisionContextV3;
  //   const projectSettings = context.projectSetting as ProjectSettingsV3;
  //   const resourcesToProvision = projectSettings.components.filter((r) => r.provision);
  //   const provisionActions: Action[] = resourcesToProvision.map((r) => {
  //     return {
  //       type: "call",
  //       name: `call:${r.name}.provision`,
  //       required: false,
  //       targetAction: `${r.name}.provision`,
  //     };
  //   });
  //   const loadEnvStep: Action = {
  //     type: "call",
  //     targetAction: "env-manager.read",
  //     required: true,
  //   };
  //   const writeEnvStep: Action = {
  //     type: "call",
  //     targetAction: "env-manager.write",
  //     required: true,
  //   };
  //   const configureActions: Action[] = resourcesToProvision.map((r) => {
  //     return {
  //       type: "call",
  //       name: `call:${r.name}.configure`,
  //       required: false,
  //       targetAction: `${r.name}.configure`,
  //     };
  //   });
  //   const setupLocalEnvironmentStep: Action = {
  //     type: "call",
  //     name: "call debug-manager.setupLocalEnvironment",
  //     targetAction: "debug-manager.setupLocalEnvironment",
  //     required: false,
  //   };
  //   const configLocalEnvironmentStep: Action = {
  //     type: "call",
  //     name: "call debug-manager.configLocalEnvironmentStep",
  //     targetAction: "debug-manager.configLocalEnvironmentStep",
  //     required: false,
  //   };
  //   const preProvisionStep: Action = {
  //     type: "call",
  //     name: "call fx.preProvision",
  //     targetAction: "fx.preProvision",
  //     required: true,
  //   };
  //   const createTeamsAppStep: Action = {
  //     type: "call",
  //     name: "call app-manifest.provision",
  //     targetAction: "app-manifest.provision",
  //     required: true,
  //   };
  //   const updateTeamsAppStep: Action = {
  //     type: "call",
  //     name: "call app-manifest.configure",
  //     targetAction: "app-manifest.configure",
  //     required: true,
  //   };
  //   const provisionResourcesStep: Action = {
  //     type: "group",
  //     name: "resources.provision",
  //     mode: "parallel",
  //     actions: provisionActions,
  //   };
  //   const configureResourcesStep: Action = {
  //     type: "group",
  //     name: "resources.configure",
  //     mode: "parallel",
  //     actions: configureActions,
  //   };
  //   const deployBicepStep: Action = {
  //     type: "call",
  //     name: "call:bicep.deploy",
  //     required: true,
  //     targetAction: "bicep.deploy",
  //   };
  //   const postProvisionStep: Action = {
  //     type: "function",
  //     name: "fx.postProvision",
  //     plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       return ok([]);
  //     },
  //     execute: (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       const ctx = context as ProvisionContextV3;
  //       const url = getResourceGroupInPortal(
  //         ctx.envInfo.state.solution.subscriptionId,
  //         ctx.envInfo.state.solution.tenantId,
  //         ctx.envInfo.state.solution.resourceGroupName
  //       );
  //       const msg = getLocalizedString("core.provision.successAzure");
  //       if (url) {
  //         const title = "View Provisioned Resources";
  //         ctx.userInteraction.showMessage("info", msg, false, title).then((result: any) => {
  //           const userSelected = result.isOk() ? result.value : undefined;
  //           if (userSelected === title) {
  //             ctx.userInteraction.openUrl(url);
  //           }
  //         });
  //       } else {
  //         ctx.userInteraction.showMessage("info", msg, false);
  //       }
  //       return ok([]);
  //     },
  //   };
  //   const preConfigureStep: Action = {
  //     type: "function",
  //     name: "fx.preConfigure",
  //     plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       return ok([]);
  //     },
  //     execute: (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       const projectSettings = context.projectSetting as ProjectSettingsV3;
  //       const teamsTab = getComponent(projectSettings, "teams-tab") as Component;
  //       const aad = getComponent(projectSettings, "aad");
  //       if (aad) {
  //         if (teamsTab) {
  //           const tabEndpoint = context.envInfo?.state[teamsTab.hosting!].endpoint;
  //           inputs.m365ApplicationIdUri = `api://${tabEndpoint}`;
  //         }
  //       }
  //       return ok([]);
  //     },
  //   };
  //   const provisionSequences: Action[] = [
  //     LoadProjectSettingsAction,
  //     loadEnvStep,
  //     preProvisionStep,
  //     createTeamsAppStep,
  //     provisionResourcesStep,
  //     ctx.envInfo.envName !== "local" ? deployBicepStep : setupLocalEnvironmentStep,
  //     preConfigureStep,
  //     configureResourcesStep,
  //     ctx.envInfo.envName === "local" ? configLocalEnvironmentStep : postProvisionStep,
  //     updateTeamsAppStep,
  //     writeEnvStep,
  //     WriteProjectSettingsAction,
  //   ];
  //   const result: Action = {
  //     name: "fx.provision",
  //     type: "group",
  //     actions: provisionSequences,
  //   };
  //   return ok(result);
  // }

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
