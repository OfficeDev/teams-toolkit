// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ConfigFolderName,
  ContextV3,
  err,
  FxError,
  GroupAction,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Platform,
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
import { isVSProject, newProjectSettings } from "./../common/projectSettingsHelper";
import "./bicep";
import "./debug";
import "./envManager";
import "./resource/appManifest/appManifest";
import "./resource/azureSql";
import "./resource/aadApp/aadApp";
import "./resource/azureAppService/azureFunction";
import "./resource/azureStorage";
import "./resource/azureAppService/azureWebApp";
import "./resource/botService";
import "./feature/apim";
import "./resource/apim";
import "./feature/spfx";
import "./resource/spfx";
import "./feature/api";
import "./feature/bot";
import "./feature/sql";
import "./feature/tab";
import "./feature/cicd";
import "./feature/keyVault";
import "./feature/sso";
import "./feature/apiConnector";
import "./code/botCode";
import "./code/tabCode";
import "./code/apiCode";
import "./code/spfxTabCode";
import "./connection/azureWebAppConfig";
import "./connection/azureFunctionConfig";
import "./connection/apimConfig";

import { AzureResources, ComponentNames, componentToScenario } from "./constants";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { getResourceGroupInPortal } from "../common/tools";
import { getComponent } from "./workflow";
import { FxPreDeployForAzureAction } from "./fx/preDeployAction";
import { FxPreProvisionAction } from "./fx/preProvisionAction";
import { pluginName2ComponentName } from "./migrate";
import { PluginDisplayName } from "../common/constants";
import { hasBot } from "../common/projectSettingsHelperV3";
import { getBotTroubleShootMessage } from "../plugins/solution/fx-solution/v2/utils";
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
      ],
    };
    return ok(action);
  }
  async provision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Action | undefined, FxError>> {
    const ctx = context as ProvisionContextV3;
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
      name: "call debug.setupLocalEnvInfo",
      targetAction: "debug.setupLocalEnvInfo",
      required: false,
    };
    const configLocalEnvironmentStep: Action = {
      type: "call",
      name: "call debug.configLocalEnvInfo",
      targetAction: "debug.configLocalEnvInfo",
      required: false,
    };
    const preProvisionStep: Action = new FxPreProvisionAction();
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
    const aadComponent = getComponent(context.projectSetting, ComponentNames.AadApp);
    const preConfigureStep: Action = {
      type: "call",
      name: "call:aad-app.setApplicationInContext",
      required: true,
      targetAction: "aad-app.setApplicationInContext",
    };
    const provisionSequences: Action[] = [
      preProvisionStep,
      createTeamsAppStep,
      provisionResourcesStep,
      ctx.envInfo.envName !== "local" ? deployBicepStep : setupLocalEnvironmentStep,
      ...(aadComponent ? [preConfigureStep] : []),
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

  deploy(context: ContextV3, inputs: InputsWithProjectPath): Result<Action | undefined, FxError> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const buildAction: Action = {
      name: "call:fx.build",
      type: "call",
      targetAction: "fx.build",
      required: true,
    };
    const actions: Action[] = [];
    const components: string[] = isVSProject(projectSettings)
      ? projectSettings.components.filter((component) => component.deploy).map((c) => c.name)
      : (inputs["deploy-plugin"] as string[]).map((plugin) => pluginName2ComponentName(plugin));

    let hasAzureResource = false;
    const callDeployActions: Action[] = [];
    components.forEach((componentName) => {
      const componentConfig = getComponent(projectSettings, componentName);
      if (componentConfig) {
        if (componentConfig.hosting && AzureResources.includes(componentConfig.hosting)) {
          hasAzureResource = true;
        }
        callDeployActions.push({
          type: "call",
          targetAction:
            componentName === ComponentNames.AppManifest
              ? `${ComponentNames.AppManifest}.configure`
              : `${componentConfig.hosting}.deploy`,
          required: false,
          inputs: {
            scenario: componentToScenario.get(componentName),
          },
        });
      }
    });
    if (callDeployActions.length === 0) {
      return err(
        new UserError(
          "fx",
          "NoResourcePluginSelected",
          getDefaultString("core.NoPluginSelected"),
          getLocalizedString("core.NoPluginSelected")
        )
      );
    }
    if (hasAzureResource) {
      actions.push(new FxPreDeployForAzureAction());
    }
    actions.push(buildAction);
    context.logProvider.info(
      getLocalizedString(
        "core.deploy.selectedPluginsToDeployNotice",
        PluginDisplayName.Solution,
        JSON.stringify(components)
      )
    );
    const callDeployGroup: GroupAction = {
      type: "group",
      name: "fx.callComponentDeploy",
      mode: "parallel",
      pre: (context: ContextV3, inputs: InputsWithProjectPath) => {
        context.logProvider.info(
          getLocalizedString("core.deploy.startNotice", PluginDisplayName.Solution)
        );
        return ok(undefined);
      },
      post: (context: ContextV3, inputs: InputsWithProjectPath) => {
        if (hasAzureResource) {
          const botTroubleShootMsg = getBotTroubleShootMessage(hasBot(context.projectSetting));
          const msg =
            getLocalizedString("core.deploy.successNotice", context.projectSetting.appName) +
            botTroubleShootMsg.textForLogging;
          context.logProvider.info(msg);
          if (botTroubleShootMsg.textForLogging) {
            // Show a `Learn more` action button for bot trouble shooting.
            context.userInteraction
              .showMessage(
                "info",
                `${getLocalizedString(
                  "core.deploy.successNotice",
                  context.projectSetting.appName
                )} ${botTroubleShootMsg.textForMsgBox}`,
                false,
                botTroubleShootMsg.textForActionButton
              )
              .then((result) => {
                const userSelected = result.isOk() ? result.value : undefined;
                if (userSelected === botTroubleShootMsg.textForActionButton) {
                  context.userInteraction.openUrl(botTroubleShootMsg.troubleShootLink);
                }
              });
          } else {
            context.userInteraction.showMessage("info", msg, false);
          }
        }
        return ok(undefined);
      },
      actions: callDeployActions,
    };
    actions.push(callDeployGroup);
    const finalAction: Action = {
      type: "group",
      name: "fx.deploy",
      actions: actions,
    };
    return ok(finalAction);
  }
}
