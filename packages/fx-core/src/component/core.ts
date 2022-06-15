// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ConfigFolderName,
  ContextV3,
  DynamicPlatforms,
  err,
  FunctionAction,
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
  UserError,
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
import "./resource/azureSql";
import "./resource/aad";
import "./resource/azureFunction";
import "./resource/azureStorage";
import "./resource/azureWebApp";
import "./resource/botService";
import "./resource/spfx";
import "./feature/bot";
import "./feature/sql";
import "./feature/tab";
import "./code/botCode";
import "./code/tabCode";
import "./code/apiCode";
import "./connection/aadConfig";
import "./connection/azureWebAppConfig";
import "./connection/azureFunctionConfig";

import { WriteProjectSettingsAction } from "./projectSettingsManager";
import { ComponentNames } from "./constants";
import {
  askForProvisionConsent,
  fillInAzureConfigs,
  getM365TenantId,
} from "../plugins/solution/fx-solution/v3/provision";
import { getLocalizedString } from "../common/localizeUtils";
import { hasAzureResourceV3 } from "../common/projectSettingsHelperV3";
import { resourceGroupHelper } from "../plugins/solution/fx-solution/utils/ResourceGroupHelper";
import { getResourceGroupInPortal } from "../common/tools";
import { getComponent } from "./workflow";
import { FxPreDeployAction } from "./fx/preDeployAction";
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
  preProvision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      type: "function",
      name: "fx.preProvision",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok(["pre step before provision (tenant, subscription, resource group)"]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const envInfo = ctx.envInfo;
        // 1. check M365 tenant
        envInfo.state[ComponentNames.AppManifest] = envInfo.state[ComponentNames.AppManifest] || {};
        envInfo.state.solution = envInfo.state.solution || {};
        const appManifest = envInfo.state[ComponentNames.AppManifest];
        const solutionConfig = envInfo.state.solution;
        solutionConfig.provisionSucceeded = false;
        const tenantIdInConfig = appManifest.tenantId;
        const tenantIdInTokenRes = await getM365TenantId(ctx.tokenProvider.m365TokenProvider);
        if (tenantIdInTokenRes.isErr()) {
          return err(tenantIdInTokenRes.error);
        }
        const tenantIdInToken = tenantIdInTokenRes.value;
        if (tenantIdInConfig && tenantIdInToken && tenantIdInToken !== tenantIdInConfig) {
          return err(
            new UserError(
              "Solution",
              "TeamsAppTenantIdNotRight",
              getLocalizedString("error.M365AccountNotMatch", envInfo.envName)
            )
          );
        }
        if (!tenantIdInConfig) {
          appManifest.tenantId = tenantIdInToken;
          solutionConfig.teamsAppTenantId = tenantIdInToken;
        }
        // 3. check Azure configs
        if (hasAzureResourceV3(ctx.projectSetting) && envInfo.envName !== "local") {
          // ask common question and fill in solution config
          const solutionConfigRes = await fillInAzureConfigs(
            ctx,
            inputs,
            envInfo,
            ctx.tokenProvider
          );
          if (solutionConfigRes.isErr()) {
            return err(solutionConfigRes.error);
          }
          // ask for provision consent
          const consentResult = await askForProvisionConsent(
            ctx,
            ctx.tokenProvider.azureAccountProvider,
            envInfo
          );
          if (consentResult.isErr()) {
            return err(consentResult.error);
          }
          // create resource group if needed
          if (solutionConfig.needCreateResourceGroup) {
            const createRgRes = await resourceGroupHelper.createNewResourceGroup(
              solutionConfig.resourceGroupName,
              ctx.tokenProvider.azureAccountProvider,
              solutionConfig.subscriptionId,
              solutionConfig.location
            );
            if (createRgRes.isErr()) {
              return err(createRgRes.error);
            }
          }
        }
        return ok(["pre step before provision (tenant, subscription, resource group)"]);
      },
    };
    return ok(action);
  }
  async provision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Action | undefined, FxError>> {
    const ctx = context as ProvisionContextV3;
    const filePath = getProjectSettingsPath(inputs.projectPath);
    ctx.projectSetting = (await fs.readJson(filePath)) as ProjectSettingsV3;
    const resourcesToProvision = ctx.projectSetting.components.filter((r) => r.provision);
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
    const setupLocalEnvironmentStep: Action = {
      type: "call",
      name: "call debug-manager.setupLocalEnvironment",
      targetAction: "debug-manager.setupLocalEnvironment",
      required: false,
    };
    const configLocalEnvironmentStep: Action = {
      type: "call",
      name: "call debug-manager.configLocalEnvironmentStep",
      targetAction: "debug-manager.configLocalEnvironmentStep",
      required: false,
    };
    const preProvisionStep: Action = {
      type: "call",
      name: "call fx.preProvision",
      targetAction: "fx.preProvision",
      required: true,
    };
    const createTeamsAppStep: Action = {
      type: "call",
      name: "call app-manifest.provision",
      targetAction: "app-manifest.provision",
      required: true,
    };
    const updateTeamsAppStep: Action = {
      type: "call",
      name: "call app-manifest.configure",
      targetAction: "app-manifest.configure",
      required: true,
    };
    const provisionResourcesStep: Action = {
      type: "group",
      name: "resources.provision",
      mode: "parallel",
      actions: provisionActions,
    };
    const configureResourcesStep: Action = {
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
    const postProvisionStep: Action = {
      type: "function",
      name: "fx.postProvision",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([]);
      },
      execute: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        ctx.envInfo.state.solution.provisionSucceeded = true;
        const url = getResourceGroupInPortal(
          ctx.envInfo.state.solution.subscriptionId,
          ctx.envInfo.state.solution.tenantId,
          ctx.envInfo.state.solution.resourceGroupName
        );
        const msg = getLocalizedString("core.provision.successAzure");
        if (url) {
          const title = "View Provisioned Resources";
          ctx.userInteraction.showMessage("info", msg, false, title).then((result: any) => {
            const userSelected = result.isOk() ? result.value : undefined;
            if (userSelected === title) {
              ctx.userInteraction.openUrl(url);
            }
          });
        } else {
          ctx.userInteraction.showMessage("info", msg, false);
        }
        return ok([]);
      },
    };
    const preConfigureStep: Action = {
      type: "function",
      name: "fx.preConfigure",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([]);
      },
      execute: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const teamsBot = getComponent(ctx.projectSetting, ComponentNames.TeamsBot);
        if (teamsBot) {
          const teamsBotConfig: any = {
            endpoint: ctx.envInfo.state[teamsBot.hosting!].endpoint!,
            domain: ctx.envInfo.state[teamsBot.hosting!].domain,
          };
          ctx.envInfo.state[ComponentNames.TeamsBot] = teamsBotConfig;
        }
        const teamsTab = getComponent(ctx.projectSetting, ComponentNames.TeamsTab);
        if (teamsTab) {
          const teamsTabConfig: any = {
            endpoint: ctx.envInfo.state[teamsTab.hosting!].endpoint!,
            domain: ctx.envInfo.state[teamsTab.hosting!].domain,
          };
          ctx.envInfo.state[ComponentNames.TeamsBot] = teamsTabConfig;
          const aad = getComponent(ctx.projectSetting, ComponentNames.AadApp);
          if (aad) {
            const tabEndpoint = ctx.envInfo.state[teamsTab.hosting!].endpoint;
            inputs.m365ApplicationIdUri = `api://${tabEndpoint}`;
          }
        }
        return ok([]);
      },
    };
    const provisionSequences: Action[] = [
      preProvisionStep,
      createTeamsAppStep,
      provisionResourcesStep,
      ctx.envInfo.envName !== "local" ? deployBicepStep : setupLocalEnvironmentStep,
      preConfigureStep,
      configureResourcesStep,
      ctx.envInfo.envName === "local" ? configLocalEnvironmentStep : postProvisionStep,
      updateTeamsAppStep,
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
        const component = resource.code || resource.name;
        return {
          name: `call:${component}.build`,
          type: "call",
          targetAction: `${component}.build`,
          required: true,
        };
      });
    const group: Action = {
      type: "group",
      name: "fx.build",
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
      new FxPreDeployAction(),
      {
        name: "call:fx.build",
        type: "call",
        targetAction: "fx.build",
        required: true,
      },
    ];
    const components = inputs["deploy-plugin"] as string[];
    components.forEach((componentName) => {
      const componentConfig = getComponent(projectSettings, componentName);
      if (componentConfig) {
        actions.push({
          type: "call",
          targetAction: `${componentConfig.hosting}.deploy`,
          required: false,
          inputs: {
            folder: componentConfig.folder,
          },
        });
      }
    });
    const action: GroupAction = {
      type: "group",
      name: "fx.deploy",
      actions: actions,
    };
    return ok(action);
  }
}
