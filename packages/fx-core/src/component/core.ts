// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ActionContext,
  CloudResource,
  ConfigFolderName,
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  Platform,
  ProjectSettingsV3,
  ResourceContextV3,
  Result,
  UserError,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import path from "path";
import "reflect-metadata";
import { Container, Service } from "typedi";
import {
  CoreQuestionNames,
  ProjectNamePattern,
  QuestionRootFolder,
  ScratchOptionNo,
} from "../core/question";
import { isVSProject, newProjectSettings } from "./../common/projectSettingsHelper";
import "./bicep";
import "./code/apiCode";
import "./code/botCode";
import "./code/spfxTabCode";
import "./code/tabCode";
import "./connection/apimConfig";
import "./connection/azureFunctionConfig";
import "./connection/azureWebAppConfig";
import { configLocalEnvironment, setupLocalEnvironment } from "./debug";
import { createEnvWithName } from "./envManager";
import "./feature/api";
import "./feature/apiConnector";
import "./feature/apim";
import "./feature/bot";
import "./feature/cicd";
import "./feature/keyVault";
import "./feature/spfx";
import "./feature/sql";
import "./feature/sso";
import "./feature/tab";
import "./resource/apim";
import { AppManifest } from "./resource/appManifest/appManifest";
import "./resource/azureAppService/azureFunction";
import "./resource/azureAppService/azureWebApp";
import "./resource/azureSql";
import "./resource/azureStorage";
import "./resource/botService";
import "./resource/keyVault";
import "./resource/spfx";
import "./resource/aadApp/aadApp";
import "./resource/simpleAuth";
import { AADApp } from "@microsoft/teamsfx-api/build/v3";
import * as jsonschema from "jsonschema";
import { cloneDeep, merge } from "lodash";
import { PluginDisplayName } from "../common/constants";
import { globalStateUpdate } from "../common/globalState";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { hasAAD, hasAzureResourceV3, hasBot } from "../common/projectSettingsHelperV3";
import { getResourceGroupInPortal } from "../common/tools";
import { downloadSample } from "../core/downloadSample";
import { InvalidInputError } from "../core/error";
import { globalVars } from "../core/globalVars";
import arm from "../plugins/solution/fx-solution/arm";
import {
  ApiConnectionOptionItem,
  AzureResourceApim,
  AzureResourceFunctionNewUI,
  AzureResourceKeyVaultNewUI,
  AzureResourceSQLNewUI,
  AzureSolutionQuestionNames,
  BotFeatureIds,
  CicdOptionItem,
  M365SearchAppOptionItem,
  M365SsoLaunchPageOptionItem,
  SingleSignOnOptionItem,
  TabFeatureIds,
  TabSPFxItem,
  TabSPFxNewUIItem,
} from "../plugins/solution/fx-solution/question";
import { executeConcurrently } from "../plugins/solution/fx-solution/v2/executor";
import { getBotTroubleShootMessage } from "../plugins/solution/fx-solution/v2/utils";
import { AzureResources, ComponentNames } from "./constants";
import { pluginName2ComponentName } from "./migrate";
import {
  getQuestionsForAddFeatureV3,
  getQuestionsForDeployV3,
  getQuestionsForProvisionV3,
} from "./questionV3";
import { hooks } from "@feathersjs/hooks/lib";
import { ActionExecutionMW } from "./middleware/actionExecutionMW";
import { getQuestionsForCreateProjectV2 } from "../core/middleware";
import { TelemetryEvent, TelemetryProperty } from "../common/telemetry";
import { getComponent } from "./workflow";
import { ensureBasicFolderStructure } from "../core";
import { environmentManager } from "../core/environment";
import { Constants } from "../plugins/resource/aad/constants";
import { deployUtils } from "./deployUtils";
import { provisionUtils } from "./provisionUtils";
@Service("fx")
export class TeamsfxCore {
  name = "fx";

  /**
   * create project
   */
  @hooks([
    ActionExecutionMW({
      question: (context, inputs) => {
        return getQuestionsForCreateProjectV2(inputs);
      },
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.CreateProject,
      telemetryComponentName: "core",
    }),
  ])
  async create(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<string, FxError>> {
    const folder = inputs[QuestionRootFolder.name] as string;
    if (!folder) {
      return err(InvalidInputError("folder is undefined"));
    }
    inputs.folder = folder;
    const scratch = inputs[CoreQuestionNames.CreateFromScratch] as string;
    let projectPath: string;
    const automaticNpmInstall = "automaticNpmInstall";
    if (scratch === ScratchOptionNo.id) {
      // create from sample
      const downloadRes = await downloadSample(inputs);
      if (downloadRes.isErr()) {
        return err(downloadRes.error);
      }
      projectPath = downloadRes.value;
    } else {
      // create from new
      const appName = inputs[CoreQuestionNames.AppName] as string;
      if (undefined === appName) return err(InvalidInputError(`App Name is empty`, inputs));
      const validateResult = jsonschema.validate(appName, {
        pattern: ProjectNamePattern,
      });
      if (validateResult.errors && validateResult.errors.length > 0) {
        return err(InvalidInputError(`${validateResult.errors[0].message}`, inputs));
      }
      projectPath = path.join(folder, appName);
      inputs.projectPath = projectPath;
      // set isVS global var when creating project
      globalVars.isVS = inputs[CoreQuestionNames.ProgrammingLanguage] === "csharp";
      const initRes = await this.init(context, inputs);
      if (initRes.isErr()) return err(initRes.error);
      const features = inputs.capabilities as string;
      delete inputs.folder;

      if (features === M365SsoLaunchPageOptionItem.id || features === M365SearchAppOptionItem.id) {
        context.projectSetting.isM365 = true;
        inputs.isM365 = true;
      }
      if (BotFeatureIds.includes(features)) {
        inputs[AzureSolutionQuestionNames.Features] = features;
        const component = Container.get(ComponentNames.TeamsBot) as any;
        const res = await component.add(context, inputs);
        if (res.isErr()) return err(res.error);
      }
      if (TabFeatureIds.includes(features)) {
        inputs[AzureSolutionQuestionNames.Features] = features;
        const component = Container.get(ComponentNames.TeamsTab) as any;
        const res = await component.add(context, inputs);
        if (res.isErr()) return err(res.error);
      }
      if (features === TabSPFxItem.id) {
        inputs[AzureSolutionQuestionNames.Features] = features;
        const component = Container.get("spfx-tab") as any;
        const res = await component.add(context, inputs);
        if (res.isErr()) return err(res.error);
      }

      merge(actionContext?.telemetryProps, {
        [TelemetryProperty.Feature]: features,
      });
    }
    if (inputs.platform === Platform.VSCode) {
      await globalStateUpdate(automaticNpmInstall, true);
    }
    context.projectPath = projectPath;

    return ok(projectPath);
  }
  /**
   * add feature
   */
  @hooks([
    ActionExecutionMW({
      question: (context, inputs) => {
        return getQuestionsForAddFeatureV3(context, inputs);
      },
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.AddFeature,
      telemetryComponentName: "core",
    }),
  ])
  async addFeature(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<any, FxError>> {
    const features = inputs[AzureSolutionQuestionNames.Features];
    let component;
    if (BotFeatureIds.includes(features)) {
      component = Container.get(ComponentNames.TeamsBot);
    } else if (TabFeatureIds.includes(features)) {
      component = Container.get(ComponentNames.TeamsTab);
    } else if (features === AzureResourceSQLNewUI.id) {
      component = Container.get("sql");
    } else if (features === AzureResourceFunctionNewUI.id) {
      component = Container.get(ComponentNames.TeamsApi);
    } else if (features === AzureResourceApim.id) {
      component = Container.get(ComponentNames.APIMFeature);
    } else if (features === AzureResourceKeyVaultNewUI.id) {
      component = Container.get("key-vault-feature");
    } else if (features === CicdOptionItem.id) {
      component = Container.get("cicd");
    } else if (features === ApiConnectionOptionItem.id) {
      component = Container.get("api-connector");
    } else if (features === SingleSignOnOptionItem.id) {
      component = Container.get("sso");
    } else if (features === TabSPFxNewUIItem.id) {
      component = Container.get(ComponentNames.SPFxTab);
    }
    if (component) {
      const res = await (component as any).add(context, inputs);
      merge(actionContext?.telemetryProps, {
        [TelemetryProperty.Feature]: features,
      });
      if (res.isErr()) return err(res.error);
      if (features !== ApiConnectionOptionItem.id && features !== CicdOptionItem.id) {
        if (
          context.envInfo?.state?.solution?.provisionSucceeded === true ||
          context.envInfo?.state?.solution?.provisionSucceeded === "true"
        ) {
          context.envInfo.state.solution.provisionSucceeded = false;
        }
        await environmentManager.resetProvisionState(inputs, context);
      }
      return ok(res.value);
    }
    return ok(undefined);
  }
  async init(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const projectSettings = newProjectSettings() as ProjectSettingsV3;
    projectSettings.appName = inputs["app-name"];
    projectSettings.components = [];
    context.projectSetting = projectSettings;
    await fs.ensureDir(inputs.projectPath);
    await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`));
    await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`, "configs"));
    const basicFolderRes = await ensureBasicFolderStructure(inputs);
    if (basicFolderRes.isErr()) {
      return err(basicFolderRes.error);
    }
    {
      const appManifest = Container.get<AppManifest>(ComponentNames.AppManifest);
      const res = await appManifest.init(context, inputs);
      if (res.isErr()) return res;
    }
    {
      const createEnvResult = await createEnvWithName(
        environmentManager.getDefaultEnvName(),
        projectSettings.appName,
        inputs as InputsWithProjectPath
      );
      if (createEnvResult.isErr()) {
        return err(createEnvResult.error);
      }

      const createLocalEnvResult = await createEnvWithName(
        environmentManager.getLocalEnvName(),
        projectSettings.appName,
        inputs as InputsWithProjectPath
      );
      if (createLocalEnvResult.isErr()) {
        return err(createLocalEnvResult.error);
      }
    }
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      question: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        return await getQuestionsForProvisionV3(context, inputs);
      },
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.Provision,
      telemetryComponentName: "core",
    }),
  ])
  async provision(
    ctx: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    ctx.envInfo.state.solution = ctx.envInfo.state.solution || {};
    ctx.envInfo.state.solution.provisionSucceeded = false;

    // 1. pre provision
    {
      const res = await provisionUtils.preProvision(ctx, inputs);
      if (res.isErr()) return err(res.error);
    }
    // 2. create a teams app
    const appManifest = Container.get<AppManifest>(ComponentNames.AppManifest);
    {
      const res = await appManifest.provision(ctx, inputs);
      if (res.isErr()) return err(res.error);
    }

    // 3. call resources provision api
    const componentsToProvision = ctx.projectSetting.components.filter((r) => r.provision);
    {
      const thunks = [];
      for (const componentConfig of componentsToProvision) {
        const componentInstance = Container.get<CloudResource>(componentConfig.name);
        if (componentInstance.provision) {
          thunks.push({
            pluginName: `${componentConfig.name}`,
            taskName: "provision",
            thunk: () => {
              ctx.envInfo.state[componentConfig.name] =
                ctx.envInfo.state[componentConfig.name] || {};
              return componentInstance.provision!(ctx, inputs);
            },
          });
        }
      }
      const provisionResult = await executeConcurrently(thunks, ctx.logProvider);
      if (provisionResult.kind !== "success") {
        return err(provisionResult.error);
      }
      ctx.logProvider.info(
        getLocalizedString("core.provision.ProvisionFinishNotice", PluginDisplayName.Solution)
      );
    }

    // 4
    if (ctx.envInfo.envName === "local") {
      //4.1 setup local env
      const localEnvSetupResult = await setupLocalEnvironment(ctx, inputs);
      if (localEnvSetupResult.isErr()) {
        return err(localEnvSetupResult.error);
      }
    } else if (hasAzureResourceV3(ctx.projectSetting)) {
      //4.2 deploy arm templates for remote
      ctx.logProvider.info(
        getLocalizedString("core.deployArmTemplates.StartNotice", PluginDisplayName.Solution)
      );
      const armRes = await arm.deployArmTemplates(
        ctx,
        inputs,
        ctx.envInfo,
        ctx.tokenProvider.azureAccountProvider
      );
      if (armRes.isErr()) {
        return err(armRes.error);
      }
    }

    // 5.0 "aad-app.setApplicationInContext"
    const aadApp = Container.get<AADApp>(ComponentNames.AadApp);
    if (hasAAD(ctx.projectSetting)) {
      const res = await aadApp.setApplicationInContext(ctx, inputs);
      if (res.isErr()) return err(res.error);
    }
    // 5. call resources configure api
    {
      const thunks = [];
      for (const componentConfig of componentsToProvision) {
        const componentInstance = Container.get<CloudResource>(componentConfig.name);
        if (componentInstance.configure) {
          thunks.push({
            pluginName: `${componentConfig.name}`,
            taskName: "configure",
            thunk: () => {
              ctx.envInfo.state[componentConfig.name] =
                ctx.envInfo.state[componentConfig.name] || {};
              return componentInstance.configure!(ctx, inputs);
            },
          });
        }
      }
      const configResult = await executeConcurrently(thunks, ctx.logProvider);
      if (configResult.kind !== "success") {
        return err(configResult.error);
      }
      ctx.logProvider.info(
        getLocalizedString("core.provision.configurationFinishNotice", PluginDisplayName.Solution)
      );
    }

    // 6.
    if (ctx.envInfo.envName === "local") {
      // 6.1 config local env
      const localConfigResult = await configLocalEnvironment(ctx, inputs);
      if (localConfigResult.isErr()) {
        return err(localConfigResult.error);
      }
    } else {
      // 6.2 show message for remote azure provision
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
    }

    // 7. update teams app
    {
      const res = await appManifest.configure(ctx, inputs);
      if (res.isErr()) return err(res.error);
    }

    // 8. show and set state
    if (ctx.envInfo.envName !== "local") {
      const msg = getLocalizedString("core.provision.successNotice", ctx.projectSetting.appName);
      ctx.userInteraction.showMessage("info", msg, false);
      ctx.logProvider.info(msg);
    }
    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.Components]: JSON.stringify(
        componentsToProvision.map((component) => component.name)
      ),
    });
    ctx.envInfo.state.solution.provisionSucceeded = true;
    return ok(undefined);
  }

  @hooks([
    ActionExecutionMW({
      question: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        return await getQuestionsForDeployV3(context, inputs, context.envInfo!);
      },
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.Deploy,
      telemetryComponentName: "core",
    }),
  ])
  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const isDeployAADManifestFromVSCode =
      inputs[Constants.INCLUDE_AAD_MANIFEST] === "yes" && inputs.platform === Platform.VSCode;
    if (isDeployAADManifestFromVSCode) {
      return deployUtils.deployAadFromVscode(context, inputs);
    }
    context.logProvider.info(
      `inputs(${AzureSolutionQuestionNames.PluginSelectionDeploy}) = ${
        inputs[AzureSolutionQuestionNames.PluginSelectionDeploy]
      }`
    );
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const inputPlugins = inputs[AzureSolutionQuestionNames.PluginSelectionDeploy] || [];
    const inputComponentNames = inputPlugins.map(pluginName2ComponentName) as string[];
    if (
      hasAAD(context.projectSetting) &&
      inputs[Constants.INCLUDE_AAD_MANIFEST] === "yes" &&
      inputs.platform === Platform.CLI
    ) {
      inputComponentNames.push(ComponentNames.AadApp);
    }
    const thunks = [];
    let hasAzureResource = false;
    // 1. collect resources to deploy
    const isVS = isVSProject(projectSettings);
    for (const component of projectSettings.components) {
      if (component.deploy && (isVS || inputComponentNames.includes(component.name))) {
        const deployComponentName = component.hosting || component.name;
        const featureComponent = Container.get(component.name) as any;
        const deployComponent = Container.get(deployComponentName) as any;
        thunks.push({
          pluginName: `${component.name}`,
          taskName: `${featureComponent.build ? "build & " : ""}deploy`,
          thunk: async () => {
            const clonedInputs = cloneDeep(inputs);
            clonedInputs.folder = component.folder;
            clonedInputs.artifactFolder = component.artifactFolder;
            clonedInputs.componentId = component.name;
            if (featureComponent.build) {
              const buildRes = await featureComponent.build(context, clonedInputs);
              if (buildRes.isErr()) return err(buildRes.error);
            }
            // build process may change the artifact folder, so we need reassign the value
            clonedInputs.artifactFolder = component.artifactFolder;
            return await deployComponent.deploy!(context, clonedInputs);
          },
        });
        if (AzureResources.includes(deployComponentName)) {
          hasAzureResource = true;
        }
      }
    }
    if (inputComponentNames.includes(ComponentNames.AppManifest)) {
      const appManifest = Container.get<AppManifest>(ComponentNames.AppManifest);
      thunks.push({
        pluginName: ComponentNames.AppManifest,
        taskName: "deploy",
        thunk: async () => {
          return await appManifest.configure(context, inputs);
        },
      });
    }
    if (thunks.length === 0) {
      return err(
        new UserError(
          "fx",
          "NoResourcePluginSelected",
          getDefaultString("core.NoPluginSelected"),
          getLocalizedString("core.NoPluginSelected")
        )
      );
    }

    context.logProvider.info(
      getLocalizedString(
        "core.deploy.selectedPluginsToDeployNotice",
        PluginDisplayName.Solution,
        JSON.stringify(thunks.map((p) => p.pluginName))
      )
    );

    // 2. check azure account
    if (hasAzureResource) {
      const subscriptionResult = await deployUtils.checkDeployAzureSubscription(
        context,
        context.envInfo,
        context.tokenProvider.azureAccountProvider
      );
      if (subscriptionResult.isErr()) {
        return err(subscriptionResult.error);
      }
      const consent = await deployUtils.askForDeployConsent(
        context,
        context.tokenProvider.azureAccountProvider,
        context.envInfo
      );
      if (consent.isErr()) {
        return err(consent.error);
      }
    }

    // // 3. build
    // {
    //   const res = await this.build(context, inputs);
    //   if (res.isErr()) return err(res.error);
    // }

    // 4. start deploy
    context.logProvider.info(
      getLocalizedString("core.deploy.startNotice", PluginDisplayName.Solution)
    );
    const result = await executeConcurrently(thunks, context.logProvider);

    if (result.kind === "success") {
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
              `${getLocalizedString("core.deploy.successNotice", context.projectSetting.appName)} ${
                botTroubleShootMsg.textForMsgBox
              }`,
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
      merge(actionContext?.telemetryProps, {
        [TelemetryProperty.Components]: JSON.stringify(thunks.map((p) => p.pluginName)),
        [TelemetryProperty.Hosting]: JSON.stringify(
          thunks.map((p) => getComponent(projectSettings, p.pluginName)?.hosting)
        ),
      });
      return ok(undefined);
    } else {
      const msg = getLocalizedString("core.deploy.failNotice", context.projectSetting.appName);
      context.logProvider.info(msg);
      return err(result.error);
    }
  }
}
